import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const componentsDir = path.join(__dirname, '..', 'components')

const adminFolders = [
  'dashboard', 'students', 'courses', 'exams', 'calendar', 
  'categories', 'payments', 'messages', 'notifications', 
  'coupons', 'reports', 'settings'
]

function processDir(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      processDir(fullPath)
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8')
      let changed = false
      
      for (const folder of adminFolders) {
        // match `@/app/folder/actions` or `@/app/folder/anything`
        const regex = new RegExp(`['"]@\\/app\\/${folder}\\/`, 'g')
        if (regex.test(content)) {
          content = content.replace(regex, `'@/app/(admin)/${folder}/`)
          changed = true
        }
      }
      
      if (changed) {
        // also fix double quotes if matched (rare but possible)
        content = content.replace(/'@\/app\/\(admin\)\//g, `'@/app/(admin)/`)
        fs.writeFileSync(fullPath, content)
        console.log(`Updated imports in ${fullPath}`)
      }
    }
  }
}

processDir(componentsDir)
console.log("Done fixing imports")
