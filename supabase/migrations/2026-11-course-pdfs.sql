-- Course PDFs stored in Bunny Storage.
-- Run this once in Supabase Dashboard > SQL Editor. Safe to run more than once.
--
-- Works exactly like lessons: a PDF is attached to a course, and every student
-- enrolled in that course can open it. The file itself is never sent unless
-- the server has checked the enrollment (see /api/course-pdf-url).

create table if not exists public.course_pdfs (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  storage_path text not null,   -- path of the file inside the Bunny storage zone, e.g. "biology/chapter-1.pdf"
  title text not null,
  position int not null default 0,
  created_at timestamptz default now(),
  unique (course_id, storage_path)
);

alter table public.course_pdfs enable row level security;

-- Everyone logged in can see PDF titles/order (NOT the file -- that's only
-- ever issued by the server after checking enrollment, same as videos).
drop policy if exists "read course pdfs" on public.course_pdfs;
create policy "read course pdfs" on public.course_pdfs
  for select using (auth.role() = 'authenticated');
