begin;
create table public.cross_country_escape_progress (
  student_id uuid primary key references public.students(id) on delete cascade,
  grade smallint not null check (grade between 3 and 8),
  progress jsonb not null default '[]'::jsonb check (jsonb_typeof(progress) = 'array' and jsonb_array_length(progress) <= 80 and octet_length(progress::text) <= 200000),
  updated_at timestamptz not null default now()
);
alter table public.cross_country_escape_progress enable row level security;
revoke all on public.cross_country_escape_progress from anon, authenticated;
grant select, insert, update on public.cross_country_escape_progress to authenticated;
create policy cce_owner_read on public.cross_country_escape_progress for select to authenticated
using (exists(select 1 from public.students s where s.id=student_id and s.parent_id=(select auth.uid())));
create policy cce_owner_insert on public.cross_country_escape_progress for insert to authenticated
with check (exists(select 1 from public.students s where s.id=student_id and s.parent_id=(select auth.uid())));
create policy cce_owner_update on public.cross_country_escape_progress for update to authenticated
using (exists(select 1 from public.students s where s.id=student_id and s.parent_id=(select auth.uid())))
with check (exists(select 1 from public.students s where s.id=student_id and s.parent_id=(select auth.uid())));
commit;
