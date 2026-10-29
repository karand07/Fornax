import { faceapi, loadClassPhotoModels } from './faceApi';

/**
 * Downscale source image/canvas to max 1600px width (preserving aspect ratio)
 * and extract 128-d face descriptors using SsdMobilenetv1.
 */
export async function photoToDescriptors(
  source: HTMLImageElement | HTMLCanvasElement
): Promise<number[][]> {
  await loadClassPhotoModels('/models');

  const srcWidth = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
  const srcHeight = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;

  if (srcWidth === 0 || srcHeight === 0) {
    return [];
  }

  let targetWidth = srcWidth;
  let targetHeight = srcHeight;

  // Downscale to max 1600px wide on a canvas (keep aspect ratio) BEFORE detection.
  // Do not upscale small images.
  if (srcWidth > 1600) {
    const scale = 1600 / srcWidth;
    targetWidth = 1600;
    targetHeight = Math.round(srcHeight * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context');
  }

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

  // SsdMobilenetv1 detection with face landmarks and descriptors
  const detections = await faceapi
    .detectAllFaces(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  // Clear canvas
  canvas.width = 0;
  canvas.height = 0;

  return detections.map((d) => Array.from(d.descriptor));
}

/**
 * Helper to safely load a File into an HTMLImageElement with cleanup.
 * Revoke object URLs after use. Never upload or persist the image.
 */
export async function loadImageFromFile(
  file: File
): Promise<{ img: HTMLImageElement; cleanup: () => void }> {
  const url = URL.createObjectURL(file);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image file'));
    img.src = url;
  });

  return {
    img,
    cleanup: () => {
      URL.revokeObjectURL(url);
    },
  };
}

/**
 * Process a list of image files sequentially to avoid memory spikes on phones.
 */
export async function processPhotosSequentially(
  files: File[],
  onProgress?: (index: number, total: number, facesFound: number) => void
): Promise<{ descriptors: number[][]; facesCount: number }[]> {
  const results: { descriptors: number[][]; facesCount: number }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const { img, cleanup } = await loadImageFromFile(file);
    try {
      const descriptors = await photoToDescriptors(img);
      results.push({ descriptors, facesCount: descriptors.length });
      onProgress?.(i + 1, files.length, descriptors.length);
    } finally {
      cleanup();
    }
  }

  return results;
}
