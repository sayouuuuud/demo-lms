import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.join(__dirname, '..', 'app')
const adminDir = path.join(appDir, '(admin)')

const adminFolders = [
  'students', 'courses', 'exams', 'calendar', 
  'categories', 'payments', 'messages', 'notifications', 
  'coupons', 'reports', 'settings'
]

// Create (admin) folder if not exists
if (!fs.existsSync(adminDir)) {
  fs.mkdirSync(adminDir)
}

// Move folders and clean up page.tsx
adminFolders.forEach(folder => {
  const source = path.join(appDir, folder)
  const dest = path.join(adminDir, folder)
  
  if (fs.existsSync(source)) {
    try {
      fs.cpSync(source, dest, { recursive: true })
      
      // clean page.tsx
      const pageFile = path.join(dest, 'page.tsx')
      if (fs.existsSync(pageFile)) {
        let content = fs.readFileSync(pageFile, 'utf8')
        content = content.replace(/import\s*{\s*DashboardLayout\s*}\s*from\s*['"]@\/components\/dashboard\/dashboard-layout['"]\s*\n?/, '')
        content = content.replace(/<DashboardLayout>/g, '<>')
        content = content.replace(/<\/DashboardLayout>/g, '</>')
        fs.writeFileSync(pageFile, content)
      }
      
      // try to remove original
      fs.rmSync(source, { recursive: true, force: true })
      console.log(`Moved ${folder} to (admin)`)
    } catch (e) {
      console.log(`Error on ${folder}:`, e.message)
    }
  }
})

// Also fix app/template.tsx
const templateFile = path.join(appDir, 'template.tsx')
if (fs.existsSync(templateFile)) {
  let content = fs.readFileSync(templateFile, 'utf8')
  content = content.replace(/key=\{pathname\}/g, '')
  content = content.replace(/import \{ usePathname \} from 'next\/navigation'/g, '')
  content = content.replace(/const pathname = usePathname\(\)/g, '')
  fs.writeFileSync(templateFile, content)
  console.log(`Fixed app/template.tsx`)
}
