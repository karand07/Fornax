import { prisma } from '../../lib/prisma.js';

export class FaceService {
  async enrollFace(userId: string, descriptor: number[]) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        faceDescriptor: JSON.stringify(descriptor),
      },
    });

    return {
      success: true,
      message: 'Facial biometric descriptor enrolled successfully',
    };
  }

  async getFaceStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { faceDescriptor: true },
    });

    return {
      enrolled: Boolean(user?.faceDescriptor),
    };
  }
}

export const faceService = new FaceService();
