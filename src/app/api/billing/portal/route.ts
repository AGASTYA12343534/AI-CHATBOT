import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (token) {
      (insforge.auth as any).setAccessToken(token);
    }

    const { data: userData, error: authError } = await insforge.auth.getCurrentUser();
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized user context.' }, { status: 401 });
    }

    const userId = userData.user.id;
    const origin = req.nextUrl.origin;

    try {
      // Attempt portal creation
      const portalRes = await insforge.payments.createCustomerPortalSession('test', {
        subject: { type: 'user', id: userId },
        returnUrl: `${origin}/dashboard/billing`,
      });

      if (portalRes.error) {
        throw portalRes.error;
      }

      if (portalRes.data?.customerPortalSession?.url) {
        return NextResponse.json({ url: portalRes.data.customerPortalSession.url });
      }
    } catch (portalError: any) {
      console.warn('InsForge Payments Billing Portal unconfigured/failed, performing direct sandbox downgrade:', portalError);

      // Sandbox cancel subscription directly in DB
      const { error: dbError } = await insforge.database
        .from('user_subscriptions')
        .update({
          plan: 'free',
          status: 'canceled',
          max_messages: 50,
          message_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (dbError) throw dbError;

      // Log audit
      await insforge.database.from('audit_logs').insert([
        {
          user_id: userId,
          action: 'cancel_subscription',
          details: { sandbox: true, timestamp: new Date().toISOString() },
        },
      ]);

      return NextResponse.json({
        url: `/dashboard/billing?status=canceled&sandbox=true`,
      });
    }

    return NextResponse.json({ error: 'Failed to generate portal session.' }, { status: 500 });
  } catch (err: any) {
    console.error('Portal API error:', err);
    return NextResponse.json({ error: err.message || 'Billing portal error.' }, { status: 500 });
  }
}
