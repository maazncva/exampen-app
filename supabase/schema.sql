-- Run this in Supabase Dashboard > SQL Editor (one-time setup)

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student', -- 'student' or 'admin'
  created_at timestamptz default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  thumbnail_url text,
  created_at timestamptz default now()
);

-- A course can hold multiple video lessons.
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  bunny_video_id text not null,   -- the video GUID from Bunny Stream
  title text not null,
  position int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, course_id)
);

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;

-- Everyone logged in can see their own profile
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Everyone logged in can see the course catalog (title/thumbnail only matters --
-- the actual playable video URL is NEVER fetched via this table from the client,
-- it's only issued by the /api/playback-token server route after checking enrollment)
create policy "read courses" on public.courses
  for select using (auth.role() = 'authenticated');

-- Everyone logged in can see lesson titles/order (NOT the video itself -- that's
-- only ever issued by the /api/playback-token-equivalent server logic after
-- checking enrollment, same as before)
create policy "read lessons" on public.lessons
  for select using (auth.role() = 'authenticated');

-- Users can see their own enrollments (to know which are unlocked)
create policy "read own enrollments" on public.enrollments
  for select using (auth.uid() = user_id);

-- Auto-create a profile row whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- IMPORTANT: after creating your own admin account by signing up once,
-- run this manually (replace the email) to make yourself an admin:
-- update public.profiles set role = 'admin' where email = 'you@example.com';

-- ---------------------------------------------------------------------------
-- MIGRATION: only needed if you already ran an earlier version of this file
-- that had "bunny_video_id" directly on the courses table. Safe to ignore
-- if this is your first time running this schema.
-- ---------------------------------------------------------------------------
-- alter table public.courses drop column if exists bunny_video_id;

-- ---------------------------------------------------------------------------
-- STORAGE: bucket for course thumbnail uploads (used by the "New course" form)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

-- Anyone can view thumbnails (they're public course covers, shown to logged-out-looking pages too)
create policy "public read thumbnails" on storage.objects
  for select using (bucket_id = 'thumbnails');

-- Only admins can upload/replace/delete thumbnails
create policy "admin upload thumbnails" on storage.objects
  for insert with check (
    bucket_id = 'thumbnails'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin update thumbnails" on storage.objects
  for update using (
    bucket_id = 'thumbnails'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin delete thumbnails" on storage.objects
  for delete using (
    bucket_id = 'thumbnails'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
