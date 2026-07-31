import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const S = {
  blocked: '26c112f2-4ca1-477b-8873-9bc3f6a2e2c5',   // احمد STD-1043
  atRisk:  '5008e84a-ebf5-4c67-878a-34ccaf75a08e',   // محمد عبدالله احمد STD-1047
  safe:    '7b882794-53b8-4bf5-b31d-5fa1cb09bfe2',   // احمد محمد نصير STD-1046
}
// states
await p.student_security_state.upsert({ where: { student_id: S.blocked },
  update: { score: 12, blocked: true, blocked_at: new Date(), blocked_reason: 'M8TEST تنقّل مستحيل', last_city: 'القاهرة', last_country: 'مصر', last_ip: '41.0.0.9' },
  create: { student_id: S.blocked, score: 12, blocked: true, blocked_at: new Date(), blocked_reason: 'M8TEST تنقّل مستحيل', last_city: 'القاهرة', last_country: 'مصر', last_ip: '41.0.0.9' } })
await p.student_security_state.upsert({ where: { student_id: S.atRisk },
  update: { score: 42, blocked: false, last_city: 'الإسكندرية', last_country: 'مصر', last_ip: '41.0.0.7' },
  create: { student_id: S.atRisk, score: 42, blocked: false, last_city: 'الإسكندرية', last_country: 'مصر', last_ip: '41.0.0.7' } })
await p.student_security_state.upsert({ where: { student_id: S.safe },
  update: { score: 95, blocked: false, last_city: 'الجيزة', last_country: 'مصر' },
  create: { student_id: S.safe, score: 95, blocked: false, last_city: 'الجيزة', last_country: 'مصر' } })
// devices
const mkDev = (sid, key, label) => p.student_trusted_devices.upsert({
  where: { student_id_device_key: { student_id: sid, device_key: key } },
  update: { status: 'active', label },
  create: { student_id: sid, device_key: key, label, browser: 'Chrome', os: 'Windows', device_type: 'كمبيوتر', last_city: 'القاهرة', last_country: 'مصر', last_ip: '41.0.0.9', login_count: 7 } })
const d1 = await mkDev(S.blocked, 'M8TEST-DEV-A', 'M8TEST كمبيوتر ويندوز')
const d2 = await mkDev(S.atRisk, 'M8TEST-DEV-B', 'M8TEST موبايل أندرويد')
// session
await p.student_device_sessions.create({ data: { student_id: S.blocked, device_id: d1.id, session_token_hash: 'M8TEST-HASH-1', ip: '41.0.0.9', city: 'القاهرة', country: 'مصر' } }).catch(e=>console.log('sess skip', e.message.slice(0,80)))
// events
await p.student_security_events.createMany({ data: [
  { student_id: S.blocked, device_id: d1.id, event_type: 'impossibleTravel', severity: 'critical', score_delta: -40, score_after: 12, city: 'القاهرة', country: 'مصر', details: { from: 'القاهرة', to: 'الإسكندرية', hours: 1.2, tag: 'M8TEST' } },
  { student_id: S.atRisk, device_id: d2.id, event_type: 'newDevice', severity: 'warn', score_delta: -8, score_after: 42, city: 'الإسكندرية', country: 'مصر', details: { tag: 'M8TEST' } },
  { student_id: S.safe, event_type: 'login', severity: 'info', score_delta: 0, score_after: 95, city: 'الجيزة', country: 'مصر', details: { tag: 'M8TEST' } },
] })
// pending removal request
await p.device_removal_requests.create({ data: { student_id: S.atRisk, device_id: d2.id, reason: 'M8TEST الجهاز ده مش بتاعي', status: 'pending' } })
// geo cache entries
await p.ip_geo_cache.createMany({ data: [
  { ip: '41.0.0.9', city: 'القاهرة', country: 'مصر', lat: 30.04, lon: 31.23 },
  { ip: '41.0.0.7', city: 'الإسكندرية', country: 'مصر', lat: 31.2, lon: 29.91 },
] }).catch(e=>console.log('geo skip', e.message.slice(0,80)))
console.log('SEEDED. devices:', d1.id, d2.id)
await p.$disconnect()
