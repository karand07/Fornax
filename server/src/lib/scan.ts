import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env.js';

export function checkImageMagicBytes(buffer: Buffer): 'jpeg' | 'png' | null {
  if (!buffer || buffer.length < 4) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  return null;
}

export async function processScanBuffer(buffer: Buffer): Promise<{
  processedBuffer: Buffer;
  base64: string;
  mediaType: 'image/jpeg';
}> {
  const format = checkImageMagicBytes(buffer);
  if (!format) {
    const err = new Error('Invalid image format. Only JPEG and PNG are allowed');
    (err as any).statusCode = 400;
    throw err;
  }

  const processedBuffer = await sharp(buffer)
    .rotate() // applies EXIF orientation and strips metadata
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 85 })
    .toBuffer();

  return {
    processedBuffer,
    base64: processedBuffer.toString('base64'),
    mediaType: 'image/jpeg',
  };
}

export async function processAndStoreScan(buffer: Buffer): Promise<{
  relPath: string;
  base64: string;
  mediaType: 'image/jpeg';
}> {
  const { processedBuffer, base64, mediaType } = await processScanBuffer(buffer);

  const scanDir = path.resolve(process.cwd(), env.SCAN_DIR);
  await fs.promises.mkdir(scanDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.jpg`;
  const fullPath = path.join(scanDir, filename);
  await fs.promises.writeFile(fullPath, processedBuffer);

  return {
    relPath: filename,
    base64,
    mediaType,
  };
}

export async function deleteStoredScan(relPath: string): Promise<void> {
  try {
    const scanDir = path.resolve(process.cwd(), env.SCAN_DIR);
    const resolvedPath = path.resolve(scanDir, relPath);
    if (resolvedPath.startsWith(scanDir)) {
      if (fs.existsSync(resolvedPath)) {
        await fs.promises.unlink(resolvedPath);
      }
    }
  } catch (err) {
    console.error('Failed to delete stored scan file:', err);
  }
}
