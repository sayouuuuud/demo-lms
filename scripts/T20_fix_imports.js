const fs = require('fs');
const path = require('path');

const filesToModify = [
  { path: 'lib/video-actions.ts', import: `import { logError } from '@/lib/logger'` },
  { path: 'lib/site-content.ts', import: `import { logError } from '@/lib/logger'` },
  { path: 'lib/notify.ts', import: `import { logError } from '@/lib/logger'` },
  { path: 'lib/free-lecture-data.ts', import: `import { logError } from '@/lib/logger'` },
  { path: 'lib/curriculum.ts', import: `import { logError, logDebug } from '@/lib/logger'` },
  { path: 'app/student/presence-actions.ts', import: `import { logError } from '@/lib/logger'` },
  { path: 'app/student/exams/actions.ts', import: `import { logError } from '@/lib/logger'` },
  { path: 'app/admin/students/actions.ts', import: `import { logError } from '@/lib/logger'` },
  { path: 'app/admin/settings/danger-actions.ts', import: `import { logError } from '@/lib/logger'` },
  { path: 'app/admin/courses/actions.ts', import: `import { logError } from '@/lib/logger'` },
  { path: 'app/admin/categories/actions.ts', import: `import { logError } from '@/lib/logger'` }
];

filesToModify.forEach((fileInfo) => {
  const fullPath = path.join(__dirname, '..', fileInfo.path);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Remove the bad suffix
    content = content.replace('\\n' + fileInfo.import + '\\n', '');
    content = content.replace('\\n' + fileInfo.import, '');
    
    // Add import at the top (after 'use server' if exists)
    if (!content.includes(fileInfo.import)) {
        if (content.startsWith("'use server'") || content.startsWith('"use server"')) {
            content = content.replace(/^(["']use server["']\r?\n)/, "$1" + fileInfo.import + "\\n");
        } else if (content.startsWith("'use client'") || content.startsWith('"use client"')) {
            content = content.replace(/^(["']use client["']\r?\n)/, "$1" + fileInfo.import + "\\n");
        } else if (content.startsWith("import 'server-only'")) {
            content = content.replace(/^(import 'server-only'\r?\n)/, "$1" + fileInfo.import + "\\n");
        } else {
            content = fileInfo.import + "\\n" + content;
        }
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed ${fileInfo.path}`);
  }
});
