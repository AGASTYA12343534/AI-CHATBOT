import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import { AIFactory } from '@/lib/ai/ai-factory';

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

    const { prompt } = await req.json();
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is empty.' }, { status: 400 });
    }

    const models = [
      { id: 'google/gemini-2.0-flash-exp:free', key: 'gemini' },
      { id: 'anthropic/claude-3-haiku', key: 'claude' },
      { id: 'openai/gpt-4o-mini', key: 'gpt' },
    ];

    const messages = [{ role: 'user' as const, content: prompt }];
    const systemPrompt = 'Answer clearly, concisely, and formatting with standard markdown.';

    // Run simultaneously
    const completionPromises = models.map(async (m) => {
      try {
        const provider = AIFactory.getProvider(m.id);
        const res = await provider.generateCompletion(messages, m.id, systemPrompt, { maxTokens: 400 });
        return {
          key: m.key,
          modelId: m.id,
          success: true,
          content: res.content,
          responseTimeMs: res.responseTimeMs,
          promptTokens: res.promptTokens,
          completionTokens: res.completionTokens,
        };
      } catch (err: any) {
        return {
          key: m.key,
          modelId: m.id,
          success: false,
          error: err.message || 'Failed to complete call.',
        };
      }
    });

    const resultsArray = await Promise.all(completionPromises);
    const results: Record<string, any> = {};
    resultsArray.forEach((r) => {
      results[r.key] = r;
    });

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('Compare endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Server error during comparison.' }, { status: 500 });
  }
}
