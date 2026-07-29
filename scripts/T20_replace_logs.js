const fs = require('fs');
const path = require('path');

const filesToModify = [
  {
    path: 'lib/video-actions.ts',
    replacements: [
      { old: `console.log('[v0] saveStreamingSettings error:', err.message)`, new: `logError('saveStreamingSettings', err)` }
    ],
    import: `import { logError } from '@/lib/logger'`
  },
  {
    path: 'lib/site-content.ts',
    replacements: [
      { old: `console.log('[v0] getSiteContent unexpected error:', err)`, new: `logError('getSiteContent', err)` }
    ],
    import: `import { logError } from '@/lib/logger'`
  },
  {
    path: 'lib/notify.ts',
    replacements: [
      { old: `console.log('[v0] createNotification threw:', e?.message)`, new: `logError('notify.createNotification', e)` }
    ],
    import: `import { logError } from '@/lib/logger'`
  },
  {
    path: 'lib/free-lecture-data.ts',
    replacements: [
      { old: `console.log('[v0] getFreeLectureWatch lessons error:', error.message)`, new: `logError('getFreeLectureWatch', error)` }
    ],
    import: `import { logError } from '@/lib/logger'`
  },
  {
    path: 'lib/curriculum.ts',
    replacements: [
      { old: `console.log('[v0] getCurriculum unexpected error:', err)`, new: `logError('curriculum.getCurriculum', err)` },
      { old: `console.log('[v0] getStageBySlug: looking for slug="%s" in stages=[%s]', slug, all.map((s) => s.id).join(', '))`, new: `logDebug('curriculum.getStageBySlug', { slug, count: all.length })` },
      { old: `console.log('[v0] getFreeLectureBySlug:', { stageSlug, branchSlug, courseSlug, lectureSlug })`, new: `logDebug('curriculum.getFreeLectureBySlug', { stageSlug, branchSlug, courseSlug, lectureSlug })` },
      { old: `console.log('[v0] getCourseBySlug result:', result)`, new: `logDebug('curriculum.getCourseBySlug', result)` },
      { old: `console.log('[v0] lecture find result:', lecture)`, new: `logDebug('curriculum.lecture find result', lecture)` }
    ],
    import: `import { logError, logDebug } from '@/lib/logger'`
  },
  {
    path: 'app/student/presence-actions.ts',
    replacements: [
      { old: `console.log('[v0] pingPresence exception:', (e as Error).message)`, new: `logError('pingPresence', e)` }
    ],
    import: `import { logError } from '@/lib/logger'`
  },
  {
    path: 'app/student/exams/actions.ts',
    replacements: [
      { old: `console.log('[v0] submitExam error:', error.message)`, new: `logError('submitExam', error)` }
    ],
    import: `import { logError } from '@/lib/logger'`
  },
  {
    path: 'app/admin/students/actions.ts',
    replacements: [
      { old: `console.log('[v0] createStudent auth error:', authError.message)`, new: `logError('createStudent auth', authError)` },
      { old: `console.log('[v0] createStudent error:', error.message)`, new: `logError('createStudent', error)` },
      { old: `console.log('[v0] deleteStudent auth delete threw:', e.message)`, new: `logError('deleteStudent auth delete', e)` },
      { old: `console.log('[v0] deleteStudent error:', error.message)`, new: `logError('deleteStudent', error)` }
    ],
    import: `import { logError } from '@/lib/logger'`
  },
  {
    path: 'app/admin/settings/danger-actions.ts',
    replacements: [
      { old: `console.log('[v0] wipeAllData error:', error.message)`, new: `logError('wipeAllData', error)` }
    ],
    import: `import { logError } from '@/lib/logger'`
  },
  {
    path: 'app/admin/courses/actions.ts',
    replacements: [
      { old: `// await cleanupLectureMedia(id).catch((e) => console.log('[v0] cleanupLectureMedia error:', e))`, new: `// await cleanupLectureMedia(id).catch((e) => logError('cleanupLectureMedia', e))` },
      { old: `// await cleanupLessonMedia(id).catch((e) => console.log('[v0] cleanupLessonMedia error:', e))`, new: `// await cleanupLessonMedia(id).catch((e) => logError('cleanupLessonMedia', e))` }
    ],
    import: `import { logError } from '@/lib/logger'`
  },
  {
    path: 'app/admin/categories/actions.ts',
    replacements: [
      { old: `// await cleanupStageMedia(id).catch((e) => console.log('[v0] cleanupStageMedia error:', e))`, new: `// await cleanupStageMedia(id).catch((e) => logError('cleanupStageMedia', e))` },
      { old: `// await cleanupBranchMedia(id).catch((e) => console.log('[v0] cleanupBranchMedia error:', e))`, new: `// await cleanupBranchMedia(id).catch((e) => logError('cleanupBranchMedia', e))` },
      { old: `// await cleanupCourseMedia(id).catch((e) => console.log('[v0] cleanupCourseMedia error:', e))`, new: `// await cleanupCourseMedia(id).catch((e) => logError('cleanupCourseMedia', e))` }
    ],
    import: `import { logError } from '@/lib/logger'`
  }
];

filesToModify.forEach((fileInfo) => {
  const fullPath = path.join(__dirname, '..', fileInfo.path);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // add import at top
    if (!content.includes(fileInfo.import)) {
        const importLines = [];
        const lines = content.split('\\n');
        let i = 0;
        while (i < lines.length && (lines[i].startsWith('import') || lines[i].startsWith('"use ') || lines[i].startsWith("'use "))) {
            importLines.push(lines[i]);
            i++;
        }
        importLines.push(fileInfo.import);
        content = importLines.join('\\n') + '\\n' + lines.slice(i).join('\\n');
    }

    fileInfo.replacements.forEach(repl => {
      content = content.replace(repl.old, repl.new);
    });

    // Handle the curriculum ones where there's no closing parenthesis in my old matching string
    content = content.replace(`console.log('[v0] getCourseBySlug result:', result`, `logDebug('curriculum.getCourseBySlug', result`);
    content = content.replace(`console.log('[v0] lecture find result:', lecture`, `logDebug('curriculum.lecture find result', lecture`);

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Modified ${fileInfo.path}`);
  } else {
    console.log(`File not found: ${fileInfo.path}`);
  }
});
