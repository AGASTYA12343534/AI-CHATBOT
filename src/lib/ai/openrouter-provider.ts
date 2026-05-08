import OpenAI from 'openai';
import { AIProvider, AIProviderCompletionResponse } from './ai-provider';

export class OpenRouterAIProvider implements AIProvider {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      defaultHeaders: {
        'HTTP-Referer': 'https://insforge.dev',
        'X-Title': 'OmniAI SaaS Platform',
      }
    });
  }

  // Execute with retry logic (up to 3 times) for robust production calls
  private async executeWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isTransient = error?.status === 429 || error?.status >= 500;
      if (retries > 1 && isTransient) {
        console.warn(`Transient error encountered (${error?.message}). Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async generateCompletion(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    model: string,
    systemPrompt?: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<AIProviderCompletionResponse> {
    const startTime = Date.now();
    const formattedMessages = [...messages];
    if (systemPrompt) {
      formattedMessages.unshift({ role: 'system', content: systemPrompt });
    }

    try {
      const response = await this.executeWithRetry(() =>
        this.openai.chat.completions.create({
          model,
          messages: formattedMessages,
          max_completion_tokens: options?.maxTokens ?? 1000,
          temperature: options?.temperature ?? 0.7,
        })
      );

      const responseTimeMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || '';
      const promptTokens = response.usage?.prompt_tokens || 0;
      const completionTokens = response.usage?.completion_tokens || 0;

      return {
        content,
        promptTokens,
        completionTokens,
        responseTimeMs,
      };
    } catch (err: any) {
      console.error('OpenRouter completion error:', err);
      throw new Error(err.message || 'Failed to generate completion from OpenRouter.');
    }
  }

  async generateStream(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    model: string,
    systemPrompt?: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<ReadableStream> {
    const formattedMessages = [...messages];
    if (systemPrompt) {
      formattedMessages.unshift({ role: 'system', content: systemPrompt });
    }

    try {
      const stream = await this.executeWithRetry(() =>
        this.openai.chat.completions.create({
          model,
          messages: formattedMessages,
          max_completion_tokens: options?.maxTokens ?? 1000,
          temperature: options?.temperature ?? 0.7,
          stream: true,
        })
      );

      return new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            }
          } catch (err) {
            controller.error(err);
          } finally {
            controller.close();
          }
        },
      });
    } catch (err: any) {
      console.error('OpenRouter stream error:', err);
      throw new Error(err.message || 'Failed to initialize stream from OpenRouter.');
    }
  }
}
