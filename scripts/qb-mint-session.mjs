// يولّد كوكي جلسة أدمن صالحة للاختبار المحلي (بدون تعديل أي داتا)
import { encode } from 'next-auth/jwt'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const admin = await prisma.user.findFirst({
  where: { role: 'admin' },
  select: { id: true, email: true, role: true },
})
if (!admin) { console.error('NO ADMIN'); process.exit(1) }

const salt = 'authjs.session-token'
const token = await encode({
  token: {
    sub: admin.id,
    id: admin.id,
    email: admin.email,
    role: 'admin',
    permissions: [],
    status: 'active',
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  salt,
  maxAge: 60 * 60,
})
console.log(token)
await prisma.$disconnect()
