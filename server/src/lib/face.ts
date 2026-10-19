/**
 * Calculates Euclidean distance between two face embedding vectors (typically 128-dimensional).
 * Standard threshold for face-api.js match is around 0.6.
 */
export function euclideanDistance(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length) {
    throw new Error('Embedding vectors must have the same length');
  }

  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function isFaceMatch(
  storedDescriptor: number[],
  incomingDescriptor: number[],
  threshold = 0.6
): boolean {
  const distance = euclideanDistance(storedDescriptor, incomingDescriptor);
  return distance < threshold;
}
