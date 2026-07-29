const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath);
        } else if (f === 'page.tsx') {
            let content = fs.readFileSync(dirPath, 'utf8');
            let newContent = content.replace(/import \{ StudentLayout \} from '.*student-layout'\r?\n/g, '');
            newContent = newContent.replace(/<StudentLayout>\s*([\s\S]*?)\s*<\/StudentLayout>/g, '$1');
            if (content !== newContent) {
                fs.writeFileSync(dirPath, newContent);
                console.log('Updated', dirPath);
            }
        }
    });
}
walkDir('d:\\LMS\\app\\student');
