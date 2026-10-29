import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let modelLoadingPromise: Promise<void> | null = null;

export async function loadFaceApiModels(modelsPath = '/models'): Promise<void> {
  if (modelsLoaded) return;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
      ]);
      modelsLoaded = true;
    } catch (err) {
      modelLoadingPromise = null;
      console.error('Failed to load face-api.js models from', modelsPath, err);
      throw err;
    }
  })();

  return modelLoadingPromise;
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

let classPhotoModelsLoaded = false;
let classPhotoModelsPromise: Promise<void> | null = null;

export async function loadClassPhotoModels(modelsPath = '/models'): Promise<void> {
  if (classPhotoModelsLoaded) return;
  if (classPhotoModelsPromise) return classPhotoModelsPromise;

  classPhotoModelsPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
      ]);
      classPhotoModelsLoaded = true;
    } catch (err) {
      classPhotoModelsPromise = null;
      console.error('Failed to load class photo models from', modelsPath, err);
      throw err;
    }
  })();

  return classPhotoModelsPromise;
}

export function areClassPhotoModelsLoaded(): boolean {
  return classPhotoModelsLoaded;
}

export { faceapi };
