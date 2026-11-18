begin;
create schema if not exists writegrow_private;
revoke all on schema writegrow_private from public, anon, authenticated;
create table public.pilot_campaign (
 id text primary key check (id='homeschool-pilot-test'), capacity integer not null default 5 check(capacity=5),
 enabled boolean not null default true, created_at timestamptz not null default now()
);
insert into public.pilot_campaign(id) values('homeschool-pilot-test');
create table public.pilot_legacy_students (student_id uuid primary key references public.students(id) on delete cascade, parent_id uuid not null references public.users(id) on delete cascade);
insert into public.pilot_legacy_students select id,parent_id from public.students;
create table public.pilot_legacy_plans (parent_id uuid primary key references public.users(id) on delete cascade, plan text not null);
insert into public.pilot_legacy_plans select parent_id,plan::text from public.subscriptions;
create table public.pilot_orders (
 id uuid primary key default gen_random_uuid(), parent_id uuid not null references public.users(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 campaign_id text not null default 'homeschool-pilot-test' references public.pilot_campaign(id),
 state text not null default 'reserved' check(state in ('reserved','paid','released')),
 amount integer not null default 1499 check(amount=1499), currency text not null default 'usd' check(currency='usd'),
 checkout_session_id text unique, checkout_url text, return_url text not null,
 reserved_until timestamptz not null default now()+interval '35 minutes',
 starts_at timestamptz, ends_at timestamptz, welcome_completed boolean not null default false,
 created_at timestamptz not null default now(),
 check ((state='paid' and starts_at is not null and ends_at=starts_at+interval '28 days') or state<>'paid')
);
create unique index pilot_student_one_purchase on public.pilot_orders(student_id,campaign_id) where state in ('reserved','paid');
create index pilot_orders_campaign_state on public.pilot_orders(campaign_id,state);
create index pilot_orders_parent on public.pilot_orders(parent_id);
create table public.pilot_payment_events (event_id text primary key, order_id uuid not null references public.pilot_orders(id), created_at timestamptz not null default now());
create table public.student_workspaces (
 student_id uuid not null references public.students(id) on delete cascade,
 kind text not null check(kind in ('planner','grammar')), workspace_key text not null,
 data jsonb not null default '{}', updated_at timestamptz not null default now(),
 primary key(student_id,kind,workspace_key), check(octet_length(data::text)<=200000)
);
alter table public.pilot_campaign enable row level security;
alter table public.pilot_legacy_students enable row level security;
alter table public.pilot_legacy_plans enable row level security;
alter table public.pilot_orders enable row level security;
alter table public.pilot_payment_events enable row level security;
alter table public.student_workspaces enable row level security;
revoke all on public.pilot_campaign,public.pilot_legacy_students,public.pilot_legacy_plans,public.pilot_orders,public.pilot_payment_events,public.student_workspaces from anon,authenticated;
grant all on public.pilot_campaign,public.pilot_legacy_students,public.pilot_legacy_plans,public.pilot_orders,public.pilot_payment_events,public.student_workspaces to service_role;
grant select on public.pilot_orders,public.pilot_legacy_students,public.pilot_legacy_plans to authenticated;
grant select,insert,update on public.student_workspaces to authenticated;
create policy pilot_orders_owner on public.pilot_orders for select to authenticated using(parent_id=(select auth.uid()));
create policy legacy_students_owner on public.pilot_legacy_students for select to authenticated using(parent_id=(select auth.uid()));
create policy legacy_plans_owner on public.pilot_legacy_plans for select to authenticated using(parent_id=(select auth.uid()));
create policy workspaces_owner_read on public.student_workspaces for select to authenticated using(exists(select 1 from public.students s where s.id=student_id and s.parent_id=(select auth.uid())));
create policy workspaces_owner_insert on public.student_workspaces for insert to authenticated with check(exists(select 1 from public.students s where s.id=student_id and s.parent_id=(select auth.uid())));
create policy workspaces_owner_update on public.student_workspaces for update to authenticated using(exists(select 1 from public.students s where s.id=student_id and s.parent_id=(select auth.uid()))) with check(exists(select 1 from public.students s where s.id=student_id and s.parent_id=(select auth.uid())));

-- Billing is server-owned. Existing plan values remain unchanged.
drop policy if exists subs_owner_update_preferences on public.subscriptions;
revoke update on public.subscriptions from anon,authenticated;
revoke execute on function public.handle_new_user() from public,anon,authenticated;

create function writegrow_private.full_access(p_student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pilot_legacy_students where student_id=p_student)
 or exists(select 1 from public.students s join public.pilot_legacy_plans l on l.parent_id=s.parent_id where s.id=p_student and l.plan<>'free')
 or exists(select 1 from public.pilot_orders where student_id=p_student and state='paid' and ends_at>now());
$$;
revoke all on function writegrow_private.full_access(uuid) from public,anon,authenticated;

create function public.get_student_access(p_student uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare o public.pilot_orders; base text; weekly integer;
begin
 if not exists(select 1 from public.students where id=p_student and parent_id=auth.uid()) then raise exception 'Student not found'; end if;
 select plan::text into base from public.subscriptions where parent_id=auth.uid();
 select * into o from public.pilot_orders where student_id=p_student and state='paid' order by created_at desc limit 1;
 weekly:=case when base in ('pro','premium','family') or o.ends_at>now() then null when base='basic' then 3 else 1 end;
 return jsonb_build_object('full_access',writegrow_private.full_access(p_student),'pilot_status',case when o.ends_at>now() then 'active' when o.id is not null then 'expired' else 'none' end,'expires_at',o.ends_at,'order_id',o.id,'welcome_completed',coalesce(o.welcome_completed,false),'weekly_prompt_limit',weekly,'server_now',now());
end; $$;
revoke all on function public.get_student_access(uuid) from public,anon;
grant execute on function public.get_student_access(uuid) to authenticated;

create function public.pilot_reserve(p_parent uuid,p_student uuid,p_return text) returns public.pilot_orders language plpgsql security definer set search_path='' as $$
declare o public.pilot_orders;
begin
 perform 1 from public.pilot_campaign where id='homeschool-pilot-test' and enabled for update;
 if not found then raise exception 'Pilot is unavailable'; end if;
 if not exists(select 1 from public.students where id=p_student and parent_id=p_parent) then raise exception 'Student not found'; end if;
 select * into o from public.pilot_orders where student_id=p_student and state in ('reserved','paid') for update;
 if found then if o.state='paid' then raise exception 'This student already purchased the pilot'; else return o; end if; end if;
 if (select count(*) from public.pilot_orders where state in ('reserved','paid'))>=5 then raise exception 'All five pilot spots are taken or reserved'; end if;
 insert into public.pilot_orders(parent_id,student_id,return_url) values(p_parent,p_student,p_return) returning * into o;
 return o;
end; $$;
create function public.pilot_confirm(p_order uuid,p_session text,p_event text) returns public.pilot_orders language plpgsql security definer set search_path='' as $$
declare o public.pilot_orders; started timestamptz:=now();
begin
 perform 1 from public.pilot_campaign where id='homeschool-pilot-test' for update;
 select * into o from public.pilot_orders where id=p_order for update;
 if not found or (o.checkout_session_id is not null and o.checkout_session_id<>p_session) then raise exception 'Payment does not match reservation'; end if;
 if o.state='released' then raise exception 'Released reservation requires payment review'; end if;
 if o.state<>'paid' then
   update public.pilot_orders set state='paid',checkout_session_id=p_session,starts_at=started,ends_at=started+interval '28 days' where id=p_order returning * into o;
 end if;
 insert into public.pilot_payment_events(event_id,order_id) values(p_event,p_order) on conflict do nothing;
 return o;
end; $$;
create function public.pilot_release(p_order uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.pilot_campaign where id='homeschool-pilot-test' for update;
 -- Only the Stripe-verifying server may release a slot; never release just by clock time.
 update public.pilot_orders set state='released' where id=p_order and state='reserved';
end; $$;
revoke all on function public.pilot_reserve(uuid,uuid,text),public.pilot_confirm(uuid,text,text),public.pilot_release(uuid) from public,anon,authenticated;
grant execute on function public.pilot_reserve(uuid,uuid,text),public.pilot_confirm(uuid,text,text),public.pilot_release(uuid) to service_role;

create function public.complete_pilot_welcome(p_order uuid) returns void language sql security definer set search_path='' as $$
 update public.pilot_orders set welcome_completed=true where id=p_order and parent_id=auth.uid() and state='paid';
$$;
revoke all on function public.complete_pilot_welcome(uuid) from public,anon;
grant execute on function public.complete_pilot_welcome(uuid) to authenticated;

create function public.create_student_profile(p_name text,p_grade integer,p_level public.writing_level) returns uuid language plpgsql security definer set search_path='' as $$
declare n integer; lim integer; student uuid;
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 if length(trim(p_name)) not between 1 and 80 or p_grade not between 3 and 8 then raise exception 'Choose a name and grade 3 through 8'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 select count(*) into n from public.students where parent_id=auth.uid();
 lim:=greatest(1,coalesce((select case when plan='family' then 5 else 1 end from public.pilot_legacy_plans where parent_id=auth.uid()),1),1+(select count(*)::integer from public.pilot_orders where parent_id=auth.uid() and state='paid'));
 if n>=least(lim,6) then raise exception 'Choose a pilot spot for an existing student before adding another student'; end if;
 insert into public.students(parent_id,name,grade,level) values(auth.uid(),trim(p_name),p_grade,p_level) returning id into student;
 return student;
end; $$;
revoke all on function public.create_student_profile(text,integer,public.writing_level) from public,anon;
grant execute on function public.create_student_profile(text,integer,public.writing_level) to authenticated;

create function writegrow_private.limit_new_prompts() returns trigger language plpgsql security definer set search_path='' as $$
declare base text; lim integer;
begin
 if new.prompt_snapshot is null then return new; end if;
 perform pg_advisory_xact_lock(hashtext(new.student_id::text));
 select su.plan::text into base from public.students s join public.subscriptions su on su.parent_id=s.parent_id where s.id=new.student_id;
 if exists(select 1 from public.pilot_orders where student_id=new.student_id and state='paid' and ends_at>now()) or base in ('pro','premium','family') then return new; end if;
 lim:=case when base='basic' then 3 else 1 end;
 if (select count(*) from public.writing_submissions where student_id=new.student_id and prompt_snapshot is not null and created_at>=now()-interval '7 days')>=lim then raise exception 'Your free prompt allowance resets after seven days. Saved drafts remain available.'; end if;
 return new;
end; $$;
revoke all on function writegrow_private.limit_new_prompts() from public,anon,authenticated;
create trigger writegrow_prompt_allowance before insert on public.writing_submissions for each row execute function writegrow_private.limit_new_prompts();

-- Repair the missing scorecard table so in-app coaching and parent progress save reliably.
create table if not exists public.writing_scorecards (
 id uuid primary key default gen_random_uuid(),student_id uuid not null references public.students(id) on delete cascade,
 submission_id uuid references public.writing_submissions(id) on delete cascade,feedback_id uuid references public.ai_feedback(id) on delete cascade,
 category text not null,score integer not null check(score between 1 and 5),explanation text not null default '',created_at timestamptz not null default now()
);
alter table public.writing_scorecards enable row level security;
create policy scorecards_parent on public.writing_scorecards for all to authenticated using(exists(select 1 from public.students s where s.id=student_id and s.parent_id=(select auth.uid()))) with check(exists(select 1 from public.students s where s.id=student_id and s.parent_id=(select auth.uid())));
grant select,insert on public.writing_scorecards to authenticated;
grant all on public.writing_scorecards to service_role;
create index if not exists writing_scorecards_student_idx on public.writing_scorecards(student_id,category,created_at desc);
commit;
