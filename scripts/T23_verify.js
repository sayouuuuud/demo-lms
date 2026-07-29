const fs = require('fs');
const path = require('path');

function countInFile(file, pattern) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    return lines.filter(l => l.includes(pattern)).length;
  } catch { return 'FILE_NOT_FOUND'; }
}

function countInDir(dir, exts, pattern) {
  let count = 0;
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) { walk(fp); continue; }
      if (exts.some(e => f.endsWith(e))) {
        const content = fs.readFileSync(fp, 'utf8');
        count += content.split('\n').filter(l => l.includes(pattern)).length;
      }
    }
  }
  walk(dir);
  return count;
}

// Check 3: granted.has in middleware.ts (should be comment only)
const grantedLines = fs.readFileSync('middleware.ts','utf8').split('\n')
  .filter(l => l.includes('granted.has'))
  .map(l => l.trim());
const grantedInCode = grantedLines.filter(l => !l.startsWith('//'));
console.log('Check 3 - granted.has total lines:', grantedLines.length);
console.log('Check 3 - granted.has in code (non-comment):', grantedInCode.length);

// Check 4: wrong revalidatePath
const dirs4 = ['app', 'lib'];
const wrongPaths = ["revalidatePath('/categories')", "revalidatePath('/courses')", "revalidatePath('/calendar')",
  "revalidatePath('/notifications')", "revalidatePath('/coupons')", "revalidatePath('/students')",
  "revalidatePath('/messages')", "revalidatePath('/reports')", "revalidatePath('/payments')"];
let revalCount = 0;
dirs4.forEach(d => wrongPaths.forEach(p => { revalCount += countInDir(d, ['.ts'], p); }));
console.log('Check 4 - wrong revalidatePath:', revalCount);

// Check 5: [v0] logs
const v0Count = ['app','lib','components'].reduce((acc, d) => acc + countInDir(d, ['.ts','.tsx'], "console.log('[v0]"), 0);
console.log('Check 5 - [v0] logs:', v0Count);

// Check 6: time_label: 'الآن'
const tlCount = ['app','lib'].reduce((acc, d) => acc + countInDir(d, ['.ts'], "time_label: '\u0627\u0644\u0622\u0646'"), 0);
console.log('Check 6 - time_label now:', tlCount);

// Check 7: mockMessages
const mockCount = countInFile('components/dashboard/header.tsx', 'mockMessages');
console.log('Check 7 - mockMessages:', mockCount);

// Check 8: reports-data
const rdCount = ['app','lib','components'].reduce((acc, d) => acc + countInDir(d, ['.ts','.tsx'], 'reports-data'), 0);
console.log('Check 8 - reports-data:', rdCount);
