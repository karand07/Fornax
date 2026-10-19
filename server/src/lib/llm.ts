import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY || 'placeholder_key',
});

export async function generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) {
    return 'Anthropic API key is not configured. Returning mock response.';
  }

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type === 'text') {
    return block.text;
  }
  return '';
}
