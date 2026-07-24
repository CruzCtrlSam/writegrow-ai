-- ============================================================
-- WriteGrow AI — database schema
-- Run this in the Supabase SQL editor (Database → SQL → New query).
-- ============================================================

-- Helpful enums --------------------------------------------------
do $$ begin
  create type writing_level as enum ('below_grade', 'on_grade', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prompt_category as enum (
    'narrative', 'opinion', 'informative', 'creative', 'summary'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum ('draft', 'submitted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_tier as enum ('free', 'premium', 'family');
exception when duplicate_object then null; end $$;

-- 1) users  (parent profile, 1:1 with auth.users) ---------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  character_prompts_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) students ---------------------------------------------------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  grade int not null check (grade between 3 and 8),
  level writing_level not null default 'on_grade',
  created_at timestamptz not null default now()
);
create index if not exists students_parent_idx on public.students(parent_id);

-- 3) writing_prompts (library + AI-generated) -------------------
create table if not exists public.writing_prompts (
  id uuid primary key default gen_random_uuid(),
  category prompt_category not null,
  grade_min int not null default 3,
  grade_max int not null default 8,
  title text not null,
  body text not null,
  character_trait text,            -- e.g. 'kindness' (null = secular)
  is_seed boolean not null default false,
  created_at timestamptz not null default now()
);

-- 4) writing_submissions ---------------------------------------
create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  prompt_id uuid references public.writing_prompts(id) on delete set null,
  prompt_snapshot text,            -- store the prompt text shown, in case it changes
  category prompt_category,
  content text not null default '',
  word_count int not null default 0,
  status submission_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists submissions_student_idx
  on public.writing_submissions(student_id, created_at desc);

-- 5) ai_feedback -----------------------------------------------
create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.writing_submissions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  did_well text,
  improve text,
  guiding_questions jsonb,         -- string[]
  grammar_notes text,
  vocabulary_suggestions jsonb,    -- string[]
  encouragement text,
  raw jsonb,                       -- full model payload for debugging
  created_at timestamptz not null default now()
);
create index if not exists feedback_student_idx
  on public.ai_feedback(student_id, created_at desc);

-- 6) skill_scores  (one row per skill per submission) ----------
create table if not exists public.skill_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  submission_id uuid references public.writing_submissions(id) on delete cascade,
  skill text not null,             -- e.g. 'punctuation', 'organization'
  score int not null check (score between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists skill_scores_student_idx
  on public.skill_scores(student_id, skill, created_at desc);

-- 7) writing_scorecards  (one row per rubric category) ----------
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

-- 8) subscriptions  (Stripe placeholder) -----------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id) on delete cascade,
  plan plan_tier not null default 'free',
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (parent_id)
);

-- Auto-create a profile + free subscription on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  insert into public.subscriptions (parent_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (parent_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security
-- Parents can only read/write their own data and their students'.
-- ============================================================
alter table public.users               enable row level security;
alter table public.students            enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.ai_feedback         enable row level security;
alter table public.skill_scores        enable row level security;
alter table public.writing_scorecards  enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.writing_prompts     enable row level security;

-- users: self only
drop policy if exists users_self on public.users;
create policy users_self on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- students: owned by parent
drop policy if exists students_owner on public.students;
create policy students_owner on public.students
  for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);

-- helper predicate reused below: student belongs to current user
-- submissions
drop policy if exists submissions_owner on public.writing_submissions;
create policy submissions_owner on public.writing_submissions
  for all using (
    exists (select 1 from public.students s
            where s.id = student_id and s.parent_id = auth.uid())
  ) with check (
    exists (select 1 from public.students s
            where s.id = student_id and s.parent_id = auth.uid())
  );

-- feedback
drop policy if exists feedback_owner on public.ai_feedback;
create policy feedback_owner on public.ai_feedback
  for all using (
    exists (select 1 from public.students s
            where s.id = student_id and s.parent_id = auth.uid())
  ) with check (
    exists (select 1 from public.students s
            where s.id = student_id and s.parent_id = auth.uid())
  );

-- skill scores
drop policy if exists skills_owner on public.skill_scores;
create policy skills_owner on public.skill_scores
  for all using (
    exists (select 1 from public.students s
            where s.id = student_id and s.parent_id = auth.uid())
  ) with check (
    exists (select 1 from public.students s
            where s.id = student_id and s.parent_id = auth.uid())
  );

-- scorecards
drop policy if exists scorecards_owner on public.writing_scorecards;
create policy scorecards_owner on public.writing_scorecards
  for all using (
    exists (select 1 from public.students s
            where s.id = student_id and s.parent_id = auth.uid())
  ) with check (
    exists (select 1 from public.students s
            where s.id = student_id and s.parent_id = auth.uid())
  );

-- subscriptions: parent only (writes normally happen via service role/webhook)
drop policy if exists subs_owner on public.subscriptions;
create policy subs_owner on public.subscriptions
  for select using (auth.uid() = parent_id);

-- prompts: readable by any signed-in user
drop policy if exists prompts_read on public.writing_prompts;
create policy prompts_read on public.writing_prompts
  for select using (auth.role() = 'authenticated');
