const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

function generateSlug(text, id) {
  if (!text) return `slug-${id}`;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '') || `slug-${id}`;
}

async function main() {
  console.log('Starting Tree Rebuild...');

  // 0. حماية إضافية: فحص جميع الجداول المرتبطة للتأكد من أنها فارغة (0)
  // تم فحص الـ Schema بالكامل لضمان عدم وجود Cascade يؤدي لفقدان البيانات.
  // ملاحظة: الجداول التي تحتوي الحقل بشكل Required نستخدم count() مباشرة بدون فلتر لتجنب أخطاء Prisma.
  // الجداول التي تحتوي الحقل بشكل Nullable نستخدم { where: { field: { not: null } } }
  
  const countChecks = await Promise.all([
    // جداول تشير إلى lecture_id
    prisma.assignments.count({ where: { lecture_id: { not: null } } }),
    prisma.calendar_events.count({ where: { lecture_id: { not: null } } }),
    prisma.cart_items.count({ where: { lecture_id: { not: null } } }),
    prisma.coupon_lectures.count(), // Required field
    prisma.notifications.count({ where: { lecture_id: { not: null } } }),
    prisma.order_items.count({ where: { lecture_id: { not: null } } }),
    
    // جداول تشير إلى lesson_id (lecture_playback_sessions مستثنى - تم التحقق أنها 19 جلسة اختبارية فقط)
    prisma.videos.count({ where: { lesson_id: { not: null } } }),
  ]);
  
  const sum = countChecks.reduce((a, b) => a + b, 0);
  console.log('Counts:', countChecks);
  if (sum > 0) {
    throw new Error('STOP: Found existing data in related tables. Deleting lectures/lessons would cascade and lose data!');
  }

  const mapping = { monthly_courses: {}, lectures: {}, lessons: {} };

  // 1. استخدام Transaction لضمان التراجع الكامل في حال الفشل
  await prisma.$transaction(async (tx) => {
    
    // مسح جلسات المشاهدة الاختبارية أولاً (19 جلسة - تم التحقق أنها بيانات اختبار)
    const deletedSessions = await tx.lecture_playback_sessions.deleteMany({});
    console.log(`Deleted ${deletedSessions.count} playback sessions (test data)`);
    
    // مسح الدروس والمحاضرات المشوهة بالكامل
    console.log('Deleting mangled lessons and lectures inside transaction...');
    await tx.lessons.deleteMany({});
    await tx.lectures.deleteMany({});
    
    console.log('Fetching old data...');
    const oldCourses = await tx.courses.findMany({
      include: {
        course_sections: {
          include: {
            course_lessons: true
          }
        }
      }
    });

    let defaultBranch = await tx.branches.findFirst();

    for (const course of oldCourses) {
      const slug = generateSlug(course.title, course.id);
      let mCourse = await tx.monthly_courses.findFirst({ where: { slug } });
      
      if (!mCourse) {
        console.log(`Warning: Monthly course not found for slug ${slug}. Skipping.`);
        continue;
      }

      mapping.monthly_courses[course.id] = mCourse.id;

      for (const section of course.course_sections) {
        // نضمن عدم تكرار الـ Slug بإضافة جزء من الـ ID القديم
        const lectureSlug = generateSlug(section.title, section.id) + '-' + section.id.substring(0, 8);
        
        const newLecture = await tx.lectures.create({
          data: {
            branch_id: course.branch_id || defaultBranch.id,
            monthly_course_id: mCourse.id,
            slug: lectureSlug,
            title: section.title,
            sort_order: section.position || 0,
            course_sort_order: section.position || 0,
          }
        });
        
        mapping.lectures[section.id] = newLecture.id;

        for (const lesson of section.course_lessons) {
          const lessonSlug = generateSlug(lesson.title, lesson.id) + '-' + lesson.id.substring(0, 8);
          
          const newLesson = await tx.lessons.create({
            data: {
              lecture_id: newLecture.id,
              slug: lessonSlug,
              title: lesson.title,
              sort_order: lesson.position || 0,
              duration: lesson.duration || "",
              video_url: lesson.video_url || null,
              description: lesson.description || null,
              content_type: lesson.type || "فيديو",
            }
          });
          
          mapping.lessons[lesson.id] = newLesson.id;
        }
      }
    }
  }); // End Transaction

  fs.writeFileSync('migration_map.json', JSON.stringify(mapping, null, 2));
  console.log('Tree rebuilt successfully! Mapping saved to migration_map.json');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
