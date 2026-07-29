import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const accounts = [
  {
    email: 'admin@test.com',
    password: '111111',
    metadata: { full_name: 'محمد أحمد', role: 'admin' },
  },
  {
    email: 'student@platform.com',
    password: 'Student12345!',
    metadata: { full_name: 'محمد إبراهيم', role: 'student', grade: 'sec-3' },
  },
]

for (const acc of accounts) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: acc.email,
    password: acc.password,
    email_confirm: true,
    user_metadata: acc.metadata,
  })

  if (error) {
    if (error.message?.toLowerCase().includes('already')) {
      console.log(`= ${acc.email} already exists, skipping`)
    } else {
      console.error(`x failed to create ${acc.email}:`, error.message)
    }
    continue
  }
  console.log(`+ created ${acc.email} (${acc.metadata.role}) -> ${data.user?.id}`)
}

console.log('Done seeding accounts.')
