import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fornax.edu' },
    update: {},
    create: {
      email: 'admin@fornax.edu',
      passwordHash,
      role: Role.ADMIN,
      firstName: 'System',
      lastName: 'Admin',
    },
  });

  // 2. Create Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@fornax.edu' },
    update: {},
    create: {
      email: 'teacher@fornax.edu',
      passwordHash,
      role: Role.TEACHER,
      firstName: 'Jane',
      lastName: 'Smith',
    },
  });

  // 3. Create Student
  const student = await prisma.user.upsert({
    where: { email: 'student@fornax.edu' },
    update: {},
    create: {
      email: 'student@fornax.edu',
      passwordHash,
      role: Role.STUDENT,
      firstName: 'Alex',
      lastName: 'Rivera',
    },
  });

  // 4. Create Sample Course
  const course = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      code: 'CS101',
      title: 'Introduction to Computer Science',
      description: 'Foundations of algorithms, data structures, and modern software design.',
      teacherId: teacher.id,
    },
  });

  // Enroll student
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: student.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId: student.id,
      courseId: course.id,
    },
  });

  console.log('Seed completed successfully:', {
    admin: admin.email,
    teacher: teacher.email,
    student: student.email,
    course: course.code,
  });
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
