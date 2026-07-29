alter table public.profiles
add column if not exists color_preset text default 'navy',
add column if not exists notif_prefs jsonb default '{"emailNotif": true, "pushNotif": true, "lessonReminders": true, "gradeAlerts": true, "smsNotif": false, "marketingNotif": false}'::jsonb;
