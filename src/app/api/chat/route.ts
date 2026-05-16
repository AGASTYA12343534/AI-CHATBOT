import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@insforge/sdk';
import { AIFactory } from '@/lib/ai/ai-factory';

// Initialize InsForge SDK client
const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '',
});

// Configure OpenAI client for OpenRouter
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
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

    // 1. Subscription Tier & Rate Limit Check
    const { data: subData } = await insforge.database
      .from('user_subscriptions')
      .select('plan, message_count, max_messages')
      .eq('user_id', userId)
      .maybeSingle();

    const plan = subData?.plan || 'free';
    const messageCount = subData?.message_count || 0;
    const maxMessages = subData?.max_messages || 50;

    if (plan === 'free' && messageCount >= maxMessages) {
      return NextResponse.json(
        { error: 'You have reached the Free tier message limit. Please upgrade to Pro.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { chatId, messages, model, webSearchEnabled, ragEnabled } = body;

    if (!chatId || !messages || !model) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    // 2. Fetch User Memories (Long-term Context)
    const { data: memories } = await insforge.database
      .from('user_memories')
      .select('content')
      .eq('user_id', userId);

    const memoryContext = memories && memories.length > 0
      ? `Information about the user: \n${memories.map((m) => `- ${m.content}`).join('\n')}`
      : '';

    // 3. Web Search Context compilation if enabled
    let searchContext = '';
    let searchResultsList: any[] = [];
    if (webSearchEnabled) {
      try {
        const lastUserMessage = messages[messages.length - 1]?.content || '';
        const tavilyApiKey = process.env.TAVILY_API_KEY;
        if (tavilyApiKey) {
          const tRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: tavilyApiKey, query: lastUserMessage, max_results: 3 }),
          });
          if (tRes.ok) {
            const data = await tRes.json();
            searchResultsList = data.results || [];
          }
        } else {
          // Fallback mocked search context
          searchResultsList = [
            { title: 'System Index Lookup', url: 'https://insforge.dev', content: `Real-time search simulation data on query: ${lastUserMessage}` },
          ];
        }
        searchContext = `Real-time Search Context: \n${searchResultsList.map((r, i) => `[Source ${i + 1}] (${r.url}): ${r.title} - ${r.content}`).join('\n')}`;
      } catch (searchErr) {
        console.error('Web search integration error:', searchErr);
      }
    }

    // 4. Document RAG Context query if enabled
    let documentContext = '';
    if (ragEnabled) {
      try {
        const lastUserMessage = messages[messages.length - 1]?.content || '';
        const embeddingRes = await openai.embeddings.create({
          model: 'openai/text-embedding-3-small',
          input: lastUserMessage,
        });

        if (embeddingRes.data?.[0]?.embedding) {
          const { data: matchedDocs, error: matchError } = await insforge.database.rpc('match_documents', {
            query_embedding: embeddingRes.data[0].embedding,
            match_threshold: 0.5,
            match_count: 3,
          });

          if (matchError) throw matchError;

          if (matchedDocs && matchedDocs.length > 0) {
            documentContext = `Uploaded Documents Context: \n${matchedDocs
              .map((d: any, i: number) => `[Document ${i + 1}] (${d.filename}): ${d.content}`)
              .join('\n')}`;
          }
        }
      } catch (ragErr) {
        console.error('Document RAG query error:', ragErr);
      }
    }

    // 5. Build Unified System Prompt
    const systemPrompt = `You are OmniAI, a helpful, advanced AI SaaS assistant.
Use markdown formatting and code blocks where necessary.
Cite sources clearly if search results or document fragments are referenced.

${memoryContext}

${searchContext}

${documentContext}`;

    // 6. Request Stream from Factory Provider
    const provider = AIFactory.getProvider(model);
    const stream = await provider.generateStream(messages, model, systemPrompt);

    // Return chunked text response while logging the final content
    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          let fullText = '';
          const startTime = Date.now();

          try {
            const reader = stream.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              fullText += chunk;
              controller.enqueue(encoder.encode(chunk));
            }

            const responseTimeMs = Date.now() - startTime;

            // 7. Save complete message to the database
            await insforge.database.from('messages').insert([
              {
                chat_id: chatId,
                user_id: userId,
                sender: 'assistant',
                content: fullText,
                model,
                response_time_ms: responseTimeMs,
                search_results: webSearchEnabled ? searchResultsList : null,
              },
            ]);

            // 8. Log Stripe/Database Quota limits
            await insforge.database
              .from('user_subscriptions')
              .update({ message_count: messageCount + 1 })
              .eq('user_id', userId);

          } catch (err) {
            controller.error(err);
          } finally {
            controller.close();
          }
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Failed to complete chat stream.' }, { status: 500 });
  }
}
