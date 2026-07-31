import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const counts = {
  students: await p.students.count(),
  state: await p.student_security_state.count(),
  devices: await p.student_trusted_devices.count(),
  sessions: await p.student_device_sessions.count(),
  events: await p.student_security_events.count(),
  requests: await p.device_removal_requests.count(),
  geoCache: await p.ip_geo_cache.count(),
}
console.log('COUNTS:', JSON.stringify(counts, null, 2))
const s = await p.students.findMany({ take: 4, select: { id: true, name: true, code: true } })
console.log('SAMPLE STUDENTS:', JSON.stringify(s, null, 2))
await p.$disconnect()
