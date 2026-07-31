const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateSlug(text, id) {
  if (!text) return `slug-${id}`;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '') || `slug-${id}`;
}
async function main() {
  console.log('Starting Migration (T08)...');
  
  // Find or create a default branch for courses that lack one
  let defaultBranch = await prisma.branches.findFirst();
  if (!defaultBranch) {
    const stage = await prisma.stages.create({
      data: {
        slug: 'default-stage',
        title: 'مرحلة افتراضية',
      }
    });
    defaultBranch = await prisma.branches.create({
      data: {
        stage_id: stage.id,
        slug: 'default-branch',
        title: 'شعبة افتراضية'
      }
    });
    console.log(`Created default stage and branch: ${defaultBranch.id}`);
  }
  
  // 1. Fetch old data
  const oldCourses = await prisma.courses.findMany({
    include: {
      course_sections: {
        include: {
          course_lessons: true
        }
      }
    }
  });
  
  // 2. Migrate Courses -> Monthly Courses
  let totalLectures = 0;
  let totalLessons = 0;

  for (const course of oldCourses) {
    const slug = generateSlug(course.title, course.id);
    let mCourse = await prisma.monthly_courses.findFirst({ where: { slug } });
    if (!mCourse) {
      const bId = course.branch_id || defaultBranch.id;
      mCourse = await prisma.monthly_courses.create({
        data: {
          branch_id: bId,
          slug: slug,
          title: course.title,
          description: "",
          price: parseFloat(course.price.replace(/[^0-9.]/g, '')) || 0,
          is_published: course.status !== 'مسودة',
        }
      });
    }

    for (const section of course.course_sections) {
      const lectureSlug = generateSlug(section.title, section.id);
      let lecture = await prisma.lectures.findFirst({ where: { slug: lectureSlug } });
      if (!lecture) {
        lecture = await prisma.lectures.create({
          data: {
            branch_id: course.branch_id || defaultBranch.id,
            monthly_course_id: mCourse.id,
            slug: lectureSlug,
            title: section.title,
            sort_order: section.position || 0,
            course_sort_order: section.position || 0,
          }
        });
        totalLectures++;
      }

      for (const lesson of section.course_lessons) {
        const lessonSlug = generateSlug(lesson.title, lesson.id);
        const lsn = await prisma.lessons.findFirst({ where: { slug: lessonSlug } });
        if (!lsn) {
          await prisma.lessons.create({
            data: {
              lecture_id: lecture.id,
              slug: lessonSlug,
              title: lesson.title,
              sort_order: lesson.position || 0,
              duration: lesson.duration || "",
              video_url: lesson.video_url || null,
              description: lesson.description || null,
              content_type: lesson.type || "فيديو",
            }
          });
          totalLessons++;
        }
      }
    }
  }

  // 3. T06: Resolve 7 Orphan order_items
  const orphans = await prisma.order_items.findMany({
    where: {
      lecture_id: null,
      monthly_course_id: null,
      term_id: null,
    }
  });
  
  for (const item of orphans) {
    if (item.lecture_title) {
      const match = await prisma.lectures.findFirst({
        where: { title: item.lecture_title }
      });
      if (match) {
        await prisma.order_items.update({
          where: { id: item.id },
          data: { lecture_id: match.id }
        });
      } else {
        await prisma.order_items.delete({ where: { id: item.id } });
      }
    } else {
      await prisma.order_items.delete({ where: { id: item.id } });
    }
  }

  // 4. T05: Apply constraint order_items_has_content_ref
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.order_items
        ADD CONSTRAINT order_items_has_content_ref
        CHECK (
          lecture_id IS NOT NULL
          OR monthly_course_id IS NOT NULL
          OR term_id IS NOT NULL
        )
        NOT VALID;
    `);
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('T05 constraint already exists. OK.');
    } else {
      throw e;
    }
  }
  
  // 5. T07: Validate and apply orders_student_id_fkey
  console.log('Validating T07 constraint...');
  const orphanOrders = await prisma.$queryRawUnsafe(`
    SELECT count(*) as count FROM public.orders o
    LEFT JOIN auth.users u ON u.id = o.student_id
    WHERE u.id IS NULL;
  `);
  
  const count = Number(orphanOrders[0].count);
  if (count > 0) {
    console.log(`Warning: Found ${count} orphan orders. Deleting them before adding constraint...`);
    await prisma.$executeRawUnsafe(`
      DELETE FROM public.orders
      WHERE student_id NOT IN (SELECT id FROM auth.users);
    `);
  }
  
  console.log('Applying T07 constraint...');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.orders
        ADD CONSTRAINT orders_student_id_fkey
        FOREIGN KEY (student_id) REFERENCES auth.users(id)
        ON DELETE RESTRICT
        NOT VALID;
    `);
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('T07 constraint already exists. OK.');
    } else {
      throw e;
    }
  }
  
  console.log('Migration T05-T08 complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
