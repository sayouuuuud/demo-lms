create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 
  sender_name text not null,
  sender_avatar text,
  subject text not null default '',
  content text not null default '',
  time_label text not null,
  is_read boolean not null default false,
  has_attachment boolean not null default false,
  sender_role text not null default 'طالب',
  
  -- UI Specific fields
  course text not null default '',
  unread_count integer not null default 0,
  is_online boolean not null default false,
  chat_history jsonb not null default '[]'::jsonb,
  
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "messages_admin_all" on public.messages
  for all using (public.is_admin()) with check (public.is_admin());
