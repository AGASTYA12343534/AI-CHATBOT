import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '',
});

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (token) {
    (insforge.auth as any).setAccessToken(token);
  }

  const { data: userData, error: authError } = await insforge.auth.getCurrentUser();
  if (authError || !userData?.user?.id) {
    return { isAdmin: false, error: 'Unauthorized user.' };
  }

  const { data: profile } = await insforge.database
    .from('profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { isAdmin: false, error: 'Admin role required.' };
  }

  return { isAdmin: true, userId: userData.user.id };
}

export async function GET(req: NextRequest) {
  const authCheck = await verifyAdmin(req);
  if (!authCheck.isAdmin) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    // Join profiles and subscriptions
    const { data: profiles, error: pErr } = await insforge.database
      .from('profiles')
      .select('*');

    const { data: subs, error: sErr } = await insforge.database
      .from('user_subscriptions')
      .select('*');

    if (pErr) throw pErr;
    if (sErr) throw sErr;

    const mergedUsers = profiles.map((p: any) => {
      const sub = subs.find((s: any) => s.user_id === p.user_id);
      return {
        ...p,
        plan: sub?.plan || 'free',
        status: sub?.status || 'active',
        message_count: sub?.message_count || 0,
        max_messages: sub?.max_messages || 50,
      };
    });

    const { data: logs } = await insforge.database
      .from('audit_logs')
      .select()
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ users: mergedUsers, logs: logs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authCheck = await verifyAdmin(req);
  if (!authCheck.isAdmin) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const { userId, action, value } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    if (action === 'suspend') {
      const { error } = await insforge.database
        .from('profiles')
        .update({ is_suspended: value })
        .eq('user_id', userId);

      if (error) throw error;

      await insforge.database.from('audit_logs').insert([
        {
          user_id: authCheck.userId,
          action: value ? 'suspend_user' : 'unsuspend_user',
          details: { target_user_id: userId, timestamp: new Date().toISOString() },
        },
      ]);
    } else if (action === 'ban') {
      const { error } = await insforge.database
        .from('profiles')
        .update({ is_banned: value })
        .eq('user_id', userId);

      if (error) throw error;

      await insforge.database.from('audit_logs').insert([
        {
          user_id: authCheck.userId,
          action: value ? 'ban_user' : 'unban_user',
          details: { target_user_id: userId, timestamp: new Date().toISOString() },
        },
      ]);
    } else {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
