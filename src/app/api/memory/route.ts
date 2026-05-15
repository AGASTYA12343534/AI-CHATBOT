import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '',
});

export async function GET(req: NextRequest) {
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

    const { data: memories, error } = await insforge.database
      .from('user_memories')
      .select()
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ memories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to retrieve memories.' }, { status: 500 });
  }
}

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

    const { content, category } = await req.json();
    if (!content || !content.trim() || !category) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    const { data: newMemory, error } = await insforge.database
      .from('user_memories')
      .insert([
        {
          user_id: userData.user.id,
          category,
          content: content.trim(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, memory: newMemory });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create memory.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing memory ID.' }, { status: 400 });
    }

    const { error } = await insforge.database
      .from('user_memories')
      .delete()
      .eq('id', id)
      .eq('user_id', userData.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete memory.' }, { status: 500 });
  }
}
