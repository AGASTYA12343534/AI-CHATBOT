export interface AIProviderCompletionResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  responseTimeMs: number;
}

export interface AIProvider {
  generateCompletion(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    model: string,
    systemPrompt?: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<AIProviderCompletionResponse>;

  generateStream(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    model: string,
    systemPrompt?: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<ReadableStream>;
}
