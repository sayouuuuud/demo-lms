const fs = require('fs');
const path = require('path');

const filesToModify = [
  { path: 'lib/video-actions.ts' },
  { path: 'lib/site-content.ts' },
  { path: 'lib/notify.ts' },
  { path: 'lib/free-lecture-data.ts' },
  { path: 'lib/curriculum.ts' },
  { path: 'app/student/presence-actions.ts' },
  { path: 'app/student/exams/actions.ts' },
  { path: 'app/admin/students/actions.ts' },
  { path: 'app/admin/settings/danger-actions.ts' },
  { path: 'app/admin/courses/actions.ts' },
  { path: 'app/admin/categories/actions.ts' }
];

filesToModify.forEach((fileInfo) => {
  const fullPath = path.join(__dirname, '..', fileInfo.path);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace the literal '\n' string with an actual newline
    content = content.replace(/\\n/g, '\n');
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed literal newline in ${fileInfo.path}`);
  }
});
