import { createClient } from '@insforge/sdk';

if (!process.env.NEXT_PUBLIC_INSFORGE_URL || !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY) {
  throw new Error('Missing InsForge environment variables (NEXT_PUBLIC_INSFORGE_URL or NEXT_PUBLIC_INSFORGE_ANON_KEY).');
}

export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
});
