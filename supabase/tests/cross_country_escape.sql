-- Disposable fixtures and all edits are rolled back, including auth users.
begin;
do $$
declare p uuid:=gen_random_uuid(); other_parent uuid:=gen_random_uuid(); student uuid; other_student uuid;
begin
 insert into auth.users(id,email,raw_user_meta_data) values(p,'cce-test-'||p||'@example.com','{}'),(other_parent,'cce-test-'||other_parent||'@example.com','{}');
 insert into public.students(parent_id,name,grade) values(p,'CCE test',3) returning id into student;
 insert into public.students(parent_id,name,grade) values(other_parent,'CCE other family',8) returning id into other_student;
 perform set_config('cce.parent',p::text,true);
 perform set_config('cce.student',student::text,true);
 perform set_config('cce.other_parent',other_parent::text,true);
 perform set_config('cce.other_student',other_student::text,true);
 if has_table_privilege('anon','public.cross_country_escape_progress','select') then raise exception 'Anonymous reads must be blocked'; end if;
end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('cce.parent'),true);
insert into public.cross_country_escape_progress(student_id,grade) values(current_setting('cce.student')::uuid,3);
update public.cross_country_escape_progress set grade=4 where student_id=current_setting('cce.student')::uuid;
do $$
declare blocked boolean:=false;
begin
 if (select grade from public.cross_country_escape_progress where student_id=current_setting('cce.student')::uuid)<>4 then raise exception 'Owner save/read failed'; end if;
 begin insert into public.cross_country_escape_progress(student_id,grade) values(current_setting('cce.other_student')::uuid,8); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Other family insert must fail'; end if;
 blocked:=false;
 begin update public.cross_country_escape_progress set student_id=current_setting('cce.other_student')::uuid where student_id=current_setting('cce.student')::uuid; exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Changing ownership must fail'; end if;
 blocked:=false;
 begin update public.cross_country_escape_progress set progress='{}'::jsonb where student_id=current_setting('cce.student')::uuid; exception when check_violation then blocked:=true; end;
 if not blocked then raise exception 'Invalid progress must fail'; end if;
end; $$;
select set_config('request.jwt.claim.sub',current_setting('cce.other_parent'),true);
do $$
declare n integer;
begin
 if exists(select 1 from public.cross_country_escape_progress) then raise exception 'Other family can see private progress'; end if;
 update public.cross_country_escape_progress set grade=8 where student_id=current_setting('cce.student')::uuid;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Other family can modify progress'; end if;
end; $$;
reset role;
select 'PASS: owner save/read, family isolation, reassignment protection, bounded data, anonymous denial' as result;
rollback;
