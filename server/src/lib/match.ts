import { dist } from './face.js';

export type Candidate = { studentId: string; descriptor: number[] };
export type Match = { studentId: string; distance: number; faceIndex: number };

/**
 * One photo: greedy one-to-one assignment.
 * 1. Compute distance for every (face, student) pair using dist() from lib/face.ts.
 *    Skip students with an empty or wrong-length descriptor.
 * 2. Sort pairs by distance ascending.
 * 3. Walk the sorted list. Take a pair only if neither the face nor the student is already used and distance < cutoff. Mark both used.
 * 4. Return accepted pairs.
 */
export function matchPhoto(faces: number[][], students: Candidate[], cutoff = 0.6): Match[] {
  type Pair = { faceIndex: number; studentId: string; distance: number };
  const pairs: Pair[] = [];

  for (let f = 0; f < faces.length; f++) {
    const face = faces[f];
    if (!face || !Array.isArray(face) || face.length === 0) {
      continue;
    }

    for (const student of students) {
      if (!student.descriptor || !Array.isArray(student.descriptor) || student.descriptor.length === 0 || student.descriptor.length !== face.length) {
        continue;
      }

      const distance = dist(face, student.descriptor);
      pairs.push({
        faceIndex: f,
        studentId: student.studentId,
        distance,
      });
    }
  }

  pairs.sort((a, b) => a.distance - b.distance);

  const usedFaces = new Set<number>();
  const usedStudents = new Set<string>();
  const matches: Match[] = [];

  for (const pair of pairs) {
    if (pair.distance >= cutoff) {
      continue;
    }
    if (!usedFaces.has(pair.faceIndex) && !usedStudents.has(pair.studentId)) {
      usedFaces.add(pair.faceIndex);
      usedStudents.add(pair.studentId);
      matches.push({
        studentId: pair.studentId,
        distance: pair.distance,
        faceIndex: pair.faceIndex,
      });
    }
  }

  return matches;
}

/**
 * Many photos: run matchPhoto per photo, then keep the BEST (smallest) distance per student.
 */
export function mergePhotoMatches(perPhoto: Match[][]): Map<string, number> {
  const bestMap = new Map<string, number>();

  for (const matches of perPhoto) {
    for (const m of matches) {
      const existing = bestMap.get(m.studentId);
      if (existing === undefined || m.distance < existing) {
        bestMap.set(m.studentId, m.distance);
      }
    }
  }

  return bestMap;
}

/**
 * d < 0.50 PRESENT, else FLAGGED
 */
export function classify(d: number): 'PRESENT' | 'FLAGGED' {
  return d < 0.50 ? 'PRESENT' : 'FLAGGED';
}
