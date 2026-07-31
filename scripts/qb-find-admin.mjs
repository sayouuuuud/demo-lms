import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

const admins = await prisma.user.findMany({
  where: { role: 'admin' },
  select: { id: true, email: true, role: true, encrypted_password: true },
})

const CANDIDATES = ['111111', '123456', 'admin123', 'Admin@123', '12345678']

for (const a of admins) {
  let matched = null
  if (a.encrypted_password) {
    for (const c of CANDIDATES) {
      try { if (await bcrypt.compare(c, a.encrypted_password)) { matched = c; break } } catch {}
    }
  }
  console.log(`${a.email} | hasPwd=${!!a.encrypted_password} | knownPwd=${matched ?? 'NO-MATCH'}`)
}
console.log('total admins: ' + admins.length)

await prisma.$disconnect()
