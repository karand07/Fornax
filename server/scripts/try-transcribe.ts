import fs from 'fs';
import path from 'path';
import { processAndStoreScan } from '../src/lib/scan.js';
import { defaultLlmClient } from '../src/lib/llm.js';
import {
  assessTranscript,
  TRANSCRIBE_SYSTEM_PROMPT,
  TRANSCRIBE_USER_PROMPT,
} from '../src/modules/grading/transcribe.js';

async function main() {
  const imageArg = process.argv[2];
  if (!imageArg) {
    console.error('Usage: npm run transcribe:try -- path/to/image.jpg');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), imageArg);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Starting transcription pipeline for: ${filePath}`);
  const startTime = Date.now();

  try {
    const rawBuffer = await fs.promises.readFile(filePath);

    const storeStart = Date.now();
    const stored = await processAndStoreScan(rawBuffer);
    const storeDuration = Date.now() - storeStart;
    console.log(`[1/3] Processed & stored in ${storeDuration}ms -> ${stored.relPath}`);

    const llmStart = Date.now();
    const rawTranscript = await defaultLlmClient.completeWithImage({
      system: TRANSCRIBE_SYSTEM_PROMPT,
      user: TRANSCRIBE_USER_PROMPT,
      image: {
        mediaType: stored.mediaType,
        base64: stored.base64,
      },
      maxTokens: 1500,
    });
    const llmDuration = Date.now() - llmStart;
    console.log(`[2/3] LLM completion finished in ${llmDuration}ms`);

    const assessStart = Date.now();
    const assessment = assessTranscript(rawTranscript);
    const assessDuration = Date.now() - assessStart;
    console.log(`[3/3] Assessed transcript in ${assessDuration}ms`);

    const totalDuration = Date.now() - startTime;
    console.log('\n--- Transcription Results ---');
    console.log(`OCR Status: ${assessment.ocrStatus}`);
    console.log(`Illegible Ratio: ${(assessment.illegibleRatio * 100).toFixed(1)}%`);
    console.log(`Total Timing: ${totalDuration}ms`);
    console.log('\n--- Transcript ---');
    console.log(assessment.text);
  } catch (err) {
    console.error('Transcription failed:', err);
    process.exit(1);
  }
}

main();
