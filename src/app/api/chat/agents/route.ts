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
      return NextResponse.json({ error: 'Task prompt is empty.' }, { status: 400 });
    }

    // Step 1: Research Agent (using Gemini)
    const researchProvider = AIFactory.getProvider('google/gemini-2.0-flash-exp:free');
    const researchSystemPrompt = `You are a Senior Security & Research Specialist Agent.
Analyze the user request, list required libraries, architecture recommendations, security considerations, and potential pitfalls.
Be thorough.`;
    const researchRes = await researchProvider.generateCompletion(
      [{ role: 'user', content: prompt }],
      'google/gemini-2.0-flash-exp:free',
      researchSystemPrompt,
      { maxTokens: 600 }
    );

    const researchOutput = researchRes.content;

    // Step 2: Coding Agent (using Claude)
    const codingProvider = AIFactory.getProvider('anthropic/claude-3-haiku');
    const codingSystemPrompt = `You are an Expert Software Development Agent.
You will receive a user request and some research recommendations.
Produce a clean, production-grade, highly-commented code implementation.
Integrate all security recommendations provided in the research guidelines.`;
    const codingPrompt = `User Request: ${prompt}\n\nResearch Analysis:\n${researchOutput}`;
    const codingRes = await codingProvider.generateCompletion(
      [{ role: 'user', content: codingPrompt }],
      'anthropic/claude-3-haiku',
      codingSystemPrompt,
      { maxTokens: 800 }
    );

    const codingOutput = codingRes.content;

    // Step 3: Reviewer Agent (using GPT)
    const reviewerProvider = AIFactory.getProvider('openai/gpt-4o-mini');
    const reviewerSystemPrompt = `You are a Principal Code Reviewer & QA Agent.
Evaluate the code implementation against the original request and research guidelines.
List security vulnerabilities, performance issues, readability enhancements, and write the final polished, verified code.`;
    const reviewerPrompt = `Original Request: ${prompt}\n\nResearch Analysis:\n${researchOutput}\n\nCode Implementation:\n${codingOutput}`;
    const reviewerRes = await reviewerProvider.generateCompletion(
      [{ role: 'user', content: reviewerPrompt }],
      'openai/gpt-4o-mini',
      reviewerSystemPrompt,
      { maxTokens: 800 }
    );

    const reviewerOutput = reviewerRes.content;

    return NextResponse.json({
      success: true,
      research: researchOutput,
      code: codingOutput,
      review: reviewerOutput,
    });
  } catch (err: any) {
    console.error('Multi-Agent endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Multi-agent sequence failed.' }, { status: 500 });
  }
}
