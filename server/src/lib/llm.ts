import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY || 'placeholder_key',
  timeout: 60000,
});

export interface CompleteWithImageArgs {
  system: string;
  user: string;
  image: {
    mediaType: 'image/jpeg' | 'image/png';
    base64: string;
  };
  maxTokens: number;
}

export interface LlmClient {
  generateCompletion?(prompt: string, systemPrompt?: string): Promise<string>;
  completeWithImage(args: CompleteWithImageArgs): Promise<string>;
}

export class AnthropicLlmClient implements LlmClient {
  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
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

  async completeWithImage(args: CompleteWithImageArgs): Promise<string> {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key is not configured.');
    }

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: args.maxTokens,
        system: args.system,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: args.image.mediaType,
                  data: args.image.base64,
                },
              },
              {
                type: 'text',
                text: args.user,
              },
            ],
          },
        ],
      });

      const block = response.content[0];
      if (block.type === 'text') {
        return block.text;
      }
      return '';
    } catch (err: unknown) {
      // Safe error logging: never log base64, prompt secrets, or transcripts
      const msg = err instanceof Error ? err.message : 'Unknown Anthropic error';
      console.error(`[LLM] completeWithImage failed: ${msg}`);
      throw err;
    }
  }
}

export const defaultLlmClient: LlmClient = new AnthropicLlmClient();

export async function generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
  return defaultLlmClient.generateCompletion!(prompt, systemPrompt);
}

export async function completeWithImage(args: CompleteWithImageArgs): Promise<string> {
  return defaultLlmClient.completeWithImage(args);
}
