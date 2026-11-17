import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.string().optional().default(''),
  SCAN_DIR: z.string().default('./storage/scans'),
  MAX_SCAN_MB: z.preprocess(
    (val) => (val === undefined || val === '' ? 5 : Number(val)),
    z.number().positive().default(5)
  ),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
