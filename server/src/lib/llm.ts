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

export class GeminiLlmClient implements LlmClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || env.GEMINI_API_KEY || '';
    this.model = model || env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      return 'Gemini API key is not configured. Returning mock response.';
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1024,
      },
    };

    if (systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[LLM] Gemini generateCompletion error: status ${response.status}`);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === 'string' ? text : '';
  }

  async completeWithImage(args: CompleteWithImageArgs): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: args.image.mediaType,
                data: args.image.base64,
              },
            },
            {
              text: args.user,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: args.maxTokens,
      },
    };

    if (args.system) {
      body.systemInstruction = {
        parts: [{ text: args.system }],
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error(`[LLM] Gemini completeWithImage error: status ${response.status}`);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return typeof text === 'string' ? text : '';
    } catch (err: unknown) {
      // Safe error logging: never log base64, prompt secrets, or transcripts
      const msg = err instanceof Error ? err.message : 'Unknown Gemini error';
      console.error(`[LLM] completeWithImage failed: ${msg}`);
      throw err;
    }
  }
}

export function createDefaultLlmClient(): LlmClient {
  if (env.GEMINI_API_KEY) {
    return new GeminiLlmClient(env.GEMINI_API_KEY, env.GEMINI_MODEL);
  }
  return new AnthropicLlmClient();
}

export const defaultLlmClient: LlmClient = createDefaultLlmClient();

export async function generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
  return defaultLlmClient.generateCompletion!(prompt, systemPrompt);
}

export async function completeWithImage(args: CompleteWithImageArgs): Promise<string> {
  return defaultLlmClient.completeWithImage(args);
}
