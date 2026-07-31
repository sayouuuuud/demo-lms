import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const r = await p.settings.findUnique({ where: { key: 'global' } })
const v = r?.value ?? {}
console.log('top keys:', Object.keys(v))
console.log('security:', JSON.stringify(v.security, null, 2))
await p.$disconnect()
