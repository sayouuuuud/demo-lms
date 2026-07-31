import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
await p.student_device_sessions.createMany({ data: [
  { student_id: '26c112f2-4ca1-477b-8873-9bc3f6a2e2c5', device_id: 'dae4f48b-dccc-47cb-b1cb-206ee4262302', session_key: 'M8TEST-SESS-1', ip: '41.0.0.9', city: 'القاهرة', country: 'مصر', user_agent: 'Chrome/Windows' },
  { student_id: '5008e84a-ebf5-4c67-878a-34ccaf75a08e', device_id: 'a5948c28-3a89-4dd4-9110-981aad1d8620', session_key: 'M8TEST-SESS-2', ip: '41.0.0.7', city: 'الإسكندرية', country: 'مصر', user_agent: 'Chrome/Android' },
] })
console.log('SESSIONS OK, active:', await p.student_device_sessions.count({ where: { revoked_at: null } }))
await p.$disconnect()
