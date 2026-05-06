import { OpenRouterAIProvider } from './openrouter-provider';
import { AIProvider } from './ai-provider';

export interface ModelMetadata {
  id: string;
  name: string;
  provider: string;
  description: string;
  tier: 'free' | 'pro' | 'enterprise';
}

export const SUPPORTED_MODELS: ModelMetadata[] = [
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    provider: 'Google',
    description: 'Fast, multimodal model designed for real-time applications.',
    tier: 'free',
  },
  {
    id: 'meta-llama/llama-3-8b-instruct:free',
    name: 'Llama 3 8B Instruct (Free)',
    provider: 'Meta Llama',
    description: 'Highly capable open weight model optimized for dialogue.',
    tier: 'free',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Lightweight model perfect for daily tasks and speed.',
    tier: 'free',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Advanced flagship model for reasoning and complex math.',
    tier: 'pro',
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Anthropic\'s fastest and most cost-effective model.',
    tier: 'free',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'State-of-the-art model with exceptional coding ability.',
    tier: 'pro',
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    description: 'Ultra-cost-efficient intelligence from DeepSeek.',
    tier: 'pro',
  },
  {
    id: 'x-ai/grok-2',
    name: 'Grok 2',
    provider: 'xAI',
    description: 'Real-time search-augmented chat agent from xAI.',
    tier: 'pro',
  },
  {
    id: 'mistralai/mistral-7b-instruct',
    name: 'Mistral 7B',
    provider: 'Mistral',
    description: 'Dense active parameter model for standard text.',
    tier: 'free',
  }
];

export class AIFactory {
  private static openRouterInstance: AIProvider | null = null;

  public static getProvider(modelId: string): AIProvider {
    // All of our models route through the OpenRouter gateway provider strategy
    if (!this.openRouterInstance) {
      this.openRouterInstance = new OpenRouterAIProvider();
    }
    return this.openRouterInstance;
  }
}
