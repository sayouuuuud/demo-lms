const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const mc = await prisma.monthly_courses.count();
  const lec = await prisma.lectures.count();
  const les = await prisma.lessons.count();
  console.log(`monthly_courses: ${mc}, lectures: ${lec}, lessons: ${les}`);
  await prisma.$disconnect();
}
check();
