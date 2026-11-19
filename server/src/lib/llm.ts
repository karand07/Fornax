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

function getDemoTranscript(): string {
  return `OCR (Optical Character Recognition) is a technology used to recognize and extract text from images, scanned documents, and PDFs into editable digital text.

Working of OCR:
1. Image Acquisition: Takes an image or scanned document as input.
2. Preprocessing: Cleans noise, adjusts contrast and orientation.
3. Text Detection: Identifies regions containing text.
4. Character Recognition: Distinguishes individual letters, numbers, and symbols.
5. Text Extraction: Converts identified characters into machine-readable text.

Applications of OCR:
- Digitizing paper documents and textbooks into searchable text
- Reading text from scanned invoices, receipts, and bank cheques
- Identity verification from driver licenses and national ID cards
- Mobile visual search tools such as Google Lens`;
}

function getDemoRubricGrading(prompt: string): string {
  // Extract student answer
  const studentAnswerMatch = prompt.match(/Student Answer:\s*"([\s\S]*?)"(?:\s*$)/);
  const studentAnswer = (studentAnswerMatch ? studentAnswerMatch[1] : '').trim();
  const lowerAnswer = studentAnswer.toLowerCase();

  // Extract rubric criteria: - ID: <id> | Max Marks: <marks> | Description: <desc>
  const matches = Array.from(
    prompt.matchAll(
      /- ID:\s*([^\s|]+)\s*\|\s*Max Marks:\s*([0-9.]+)\s*\|\s*Description:\s*([^\n]+)/g
    )
  );

  const missingPoints: string[] = [];
  let totalAwardedRatio = 0;

  const criteria = matches.map((m) => {
    const criterionId = m[1];
    const maxMarks = parseFloat(m[2]) || 1;
    const description = m[3].trim();
    const descWords = description
      .toLowerCase()
      .split(/[\s,.:()/-]+/)
      .filter((w) => w.length >= 4);

    if (studentAnswer.length === 0) {
      missingPoints.push(`Complete absence of response addressing: "${description}"`);
      return {
        criterionId,
        awarded: 0,
        justification: `Strict deduction: No student answer provided. 0/${maxMarks} marks awarded.`,
        evidenceSpan: null,
      };
    }

    // Measure keyword coverage against description
    const matchedWords = descWords.filter((w) => lowerAnswer.includes(w));
    const coverage = descWords.length > 0 ? matchedWords.length / descWords.length : 0.5;

    let awarded = 0;
    let justification = '';
    let evidenceSpan: string | null = null;

    if (coverage < 0.3 || studentAnswer.length < 25) {
      // Vague or superficial -> heavy penalty
      awarded = Math.round(maxMarks * 0.3 * 100) / 100;
      justification = `Strict deduction: Superficial or incomplete. Fails to demonstrate technical rigor and omits formal definitions for ${description.slice(0, 45)}.`;
      missingPoints.push(`Missing core theoretical definitions and technical detail for "${description}".`);
    } else if (coverage < 0.65) {
      // Partial understanding with noticeable omissions
      awarded = Math.round(maxMarks * 0.6 * 100) / 100;
      justification = `Strict deduction: Partial credit. Basic concept identified, but missing critical operational mechanisms and domain-specific terminology for ${description.slice(0, 45)}.`;
      missingPoints.push(`Omitted intermediate processing steps and rigorous nomenclature in "${description}".`);
    } else {
      // Good coverage, but strict examiner awards 75-80% for minor missing nuances
      awarded = Math.round(maxMarks * 0.75 * 100) / 100;
      justification = `Competent explanation for ${description.slice(0, 45)}, but points deducted for minor lack of academic precision and depth.`;
      missingPoints.push(`Could elaborate on exact error margins, edge cases, or industry implementations for "${description}".`);
    }

    // Find snippet from student answer
    const firstWord = matchedWords[0];
    if (firstWord && studentAnswer) {
      const idx = lowerAnswer.indexOf(firstWord);
      if (idx !== -1) {
        const start = Math.max(0, idx - 5);
        const end = Math.min(studentAnswer.length, idx + 35);
        evidenceSpan = studentAnswer.slice(start, end).trim();
      }
    }

    totalAwardedRatio += awarded / maxMarks;
    return {
      criterionId,
      awarded,
      justification,
      evidenceSpan,
    };
  });

  const avgRatio = criteria.length > 0 ? totalAwardedRatio / criteria.length : 0.5;

  let summary = '';
  if (avgRatio < 0.4) {
    summary = 'Strict Examiner Review: Unsatisfactory. The submission demonstrates severe gaps in core academic competencies and fails to substantiate claims with technical facts. Significant mark deductions applied across all criteria.';
  } else if (avgRatio < 0.7) {
    summary = 'Strict Examiner Review: Below collegiate standard. The response is superficial and reliant on generalized prose rather than formal definitions, explicit algorithms, and exhaustive technical steps.';
  } else {
    summary = 'Strict Examiner Review: Competent baseline, but marked strictly. Marks deducted for missing rigorous formal terminology, omitted secondary mechanisms, and insufficient technical precision.';
  }

  return JSON.stringify({
    criteria,
    summary,
    missingPoints: missingPoints.slice(0, 3),
    confidence: 0.75, // Ensures teacher review is triggered under strict standards
    notes: 'Evaluated under strict academic examination standards. Penalty applied for lack of formal rigor.',
  });
}

export class AnthropicLlmClient implements LlmClient {
  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    if (!env.ANTHROPIC_API_KEY) {
      if (systemPrompt && systemPrompt.includes('"criteria"')) {
        return getDemoRubricGrading(prompt);
      }
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
      console.log('[LLM Demo] No API key configured. Generating simulated OCR transcript for uploaded scan.');
      return getDemoTranscript();
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
    this.model = model || env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      if (systemPrompt && systemPrompt.includes('"criteria"')) {
        return getDemoRubricGrading(prompt);
      }
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
      console.log('[LLM Demo] No API key configured. Generating simulated OCR transcript for uploaded scan.');
      return getDemoTranscript();
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
