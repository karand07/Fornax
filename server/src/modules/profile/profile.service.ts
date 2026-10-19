import { prisma } from '../../lib/prisma.js';

export class ProfileService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        faceDescriptor: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      ...user,
      hasFaceEnrolled: Boolean(user.faceDescriptor),
      faceDescriptor: undefined, // do not leak descriptor vector in general profile
    };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  async enrollFace(userId: string, descriptor: number[]) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        faceDescriptor: JSON.stringify(descriptor),
      },
    });

    return { success: true, message: 'Facial biometric profile enrolled successfully' };
  }
}

export const profileService = new ProfileService();
