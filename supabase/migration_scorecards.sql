-- Add 1-5 writing scorecard history.
create table if not exists public.writing_scorecards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  submission_id uuid references public.writing_submissions(id) on delete cascade,
  feedback_id uuid references public.ai_feedback(id) on delete cascade,
  category text not null,
  score int not null check (score between 1 and 5),
  explanation text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists writing_scorecards_student_idx
  on public.writing_scorecards(student_id, category, created_at desc);

alter table public.writing_scorecards enable row level security;

drop policy if exists scorecards_owner on public.writing_scorecards;
create policy scorecards_owner on public.writing_scorecards
  for all using (
    exists (select 1 from public.students s
            where s.id = student_id and s.parent_id = auth.uid())
  ) with check (
    exists (select 1 from public.students s
            where s.id = student_id and s.parent_id = auth.uid())
  );
