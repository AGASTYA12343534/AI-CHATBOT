import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@insforge/sdk';

// Initialize InsForge SDK client (using server-side keys)
const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '',
});

// Configure OpenAI client for OpenRouter
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

// Helper for text chunking
function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + chunkSize).trim();
    if (chunk) chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks;
}

// Simple text extractor fallback for basic PDF text streams
function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const data = buffer.toString('utf-8');
    // Basic regex extraction of text elements between parentheses in PDF structure
    const matches = data.match(/\(([^)]+)\)\s*Tj/g);
    if (matches && matches.length > 0) {
      return matches
        .map((m) => m.slice(1, -3))
        .join(' ')
        .replace(/\\/g, '');
    }
    // Fallback if no matching Tj instructions (binary representation, extract ascii letters)
    return data.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').slice(0, 10000);
  } catch {
    return 'Failed to extract PDF contents.';
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    
    // Set accessToken to ensure backend RLS context matches user
    if (token) {
      (insforge.auth as any).setAccessToken(token);
    }
    
    const { data: userData, error: authError } = await insforge.auth.getCurrentUser();
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized user context.' }, { status: 401 });
    }

    const userId = userData.user.id;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const chatId = formData.get('chatId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name;
    const extension = filename.split('.').pop()?.toLowerCase();

    let textContent = '';

    if (extension === 'txt' || extension === 'md' || extension === 'markdown' || extension === 'json') {
      textContent = buffer.toString('utf-8');
    } else if (extension === 'pdf') {
      textContent = extractTextFromPdfBuffer(buffer);
    } else {
      // General fallback parsing
      textContent = buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, '');
    }

    if (!textContent.trim()) {
      return NextResponse.json({ error: 'Extracted text is empty.' }, { status: 400 });
    }

    // Chunk text
    const chunks = chunkText(textContent);
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Text chunk size resulted in zero segments.' }, { status: 400 });
    }

    // Process chunk embeddings via OpenRouter
    const embeddingsList: number[][] = [];
    for (const chunk of chunks) {
      const response = await openai.embeddings.create({
        model: 'openai/text-embedding-3-small',
        input: chunk,
      });
      if (response.data?.[0]?.embedding) {
        embeddingsList.push(response.data[0].embedding);
      }
    }

    if (embeddingsList.length === 0) {
      return NextResponse.json({ error: 'Failed to generate vector embeddings.' }, { status: 500 });
    }

    // Insert chunks into pgvector documents table
    const insertPayload = chunks.map((chunk, index) => ({
      user_id: userId,
      chat_id: chatId || null,
      filename,
      content: chunk,
      embedding: embeddingsList[index],
    }));

    const { error: dbError } = await insforge.database
      .from('documents')
      .insert(insertPayload);

    if (dbError) {
      console.error('Database vector insert error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      filename,
      chunksCount: chunks.length,
      message: 'Document successfully vectorized and indexed for semantic search.',
    });
  } catch (err: any) {
    console.error('RAG post handler error:', err);
    return NextResponse.json({ error: err.message || 'Server error occurred during indexing.' }, { status: 500 });
  }
}
