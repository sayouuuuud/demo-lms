const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // جلب تفاصيل الـ 19 جلسة
  const sessions = await prisma.lecture_playback_sessions.findMany({
    orderBy: { updated_at: 'asc' },
  });

  const uniqueUsers = [...new Set(sessions.map(s => s.user_id))];
  const uniqueLessons = [...new Set(sessions.map(s => s.lesson_id))];

  console.log(`\n=== Playback Sessions Details ===`);
  console.log(`Total sessions: ${sessions.length}`);
  console.log(`Unique users: ${uniqueUsers.length}`);
  console.log(`Unique lessons: ${uniqueLessons.length}`);
  console.log(`\nSessions:`);
  sessions.forEach((s, i) => {
    console.log(`  [${i+1}] user_id: ${s.user_id} | lesson_id: ${s.lesson_id} | updated_at: ${s.updated_at}`);
  });

  console.log(`\nUnique user IDs:`);
  uniqueUsers.forEach(uid => console.log(`  - ${uid}`));

  // نفحص هل هؤلاء المستخدمين موجودين في جدول الطلاب
  for (const uid of uniqueUsers) {
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, email: true, raw_user_meta_data: true }
    });
    if (user) {
      const orderCount = await prisma.orders.count({ where: { student_id: uid, status: 'completed' } });
      const meta = user.raw_user_meta_data || {};
      const displayName = meta.full_name || meta.name || 'N/A';
      console.log(`\n  User: ${user.email} (${displayName}) — completed orders: ${orderCount}`);
    } else {
      console.log(`\n  User ${uid}: NOT FOUND in users table`);
    }
  }

  await prisma.$disconnect();
}
check();
