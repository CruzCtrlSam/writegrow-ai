-- Transactional regression test. All accounts, reservations and grants roll back.
begin;
do $$
declare p uuid; s uuid; o public.pilot_orders; again public.pilot_orders; first_order uuid; first_parent uuid; first_student uuid; n integer; remaining integer; blocked boolean:=false; access jsonb;
begin
 remaining:=5-(select count(*)::integer from public.pilot_orders where campaign_id='homeschool-pilot-test' and state in ('reserved','paid'));
 if remaining<1 then raise exception 'This test needs one available test spot'; end if;
 for n in 1..remaining+1 loop
   p:=gen_random_uuid();
   insert into auth.users(id,email,raw_user_meta_data) values(p,'pilot-db-'||p||'@example.com','{}');
   insert into public.students(parent_id,name,grade) values(p,'Pilot database test',4) returning id into s;
   if n<=remaining then
     select * into o from public.pilot_reserve(p,s,'http://127.0.0.1:3010');
     if n=1 then first_order:=o.id; first_parent:=p; first_student:=s; end if;
     select * into again from public.pilot_reserve(p,s,'http://127.0.0.1:3010');
     if again.id<>o.id then raise exception 'Duplicate checkout must reuse its reservation'; end if;
   else
     begin perform public.pilot_reserve(p,s,'http://127.0.0.1:3010'); exception when others then blocked:=true; end;
     if not blocked then raise exception 'Sixth reservation must be blocked'; end if;
   end if;
 end loop;
 perform set_config('request.jwt.claim.sub',first_parent::text,true);
 if public.can_save_student_workspace(first_student,'planner','{}') then raise exception 'Free access cannot save paid planners'; end if;
 if not public.can_save_student_workspace(first_student,'grammar','{"selected":"g4-1","completed":["g4-1"],"assisted":[],"drafts":{}}') then raise exception 'Free access must allow the first lesson'; end if;
 if public.can_save_student_workspace(first_student,'grammar','{"selected":"g4-2","completed":["g4-2"],"assisted":[],"drafts":{}}') then raise exception 'Free access cannot save paid lessons'; end if;
 select * into o from public.pilot_confirm(first_order,'cs_test_database','evt_test_database');
 if not public.can_save_student_workspace(first_student,'planner','{}') then raise exception 'Paid access must save planners'; end if;
 update public.pilot_orders set starts_at=now()-interval '1 hour',ends_at=now()+interval '28 days'-interval '1 hour' where id=first_order returning * into o;
 select * into again from public.pilot_confirm(first_order,'cs_test_database','evt_test_database');
 if o.ends_at<>again.ends_at or (select count(*) from public.pilot_payment_events where event_id='evt_test_database')<>1 then raise exception 'Duplicate payment changed access or event count'; end if;
 if o.ends_at-o.starts_at<>interval '28 days' then raise exception 'Access must be exactly 28 days'; end if;
 perform set_config('request.jwt.claim.sub',first_parent::text,true);
 access:=public.get_student_access(first_student);
 if not (access->>'full_access')::boolean or access->>'pilot_status'<>'active' or access->'weekly_prompt_limit'<>'null'::jsonb then raise exception 'Paid access was not activated'; end if;
 update public.pilot_orders set starts_at=now()-interval '29 days',ends_at=now()-interval '1 day' where id=first_order;
 access:=public.get_student_access(first_student);
 if (access->>'full_access')::boolean or access->>'pilot_status'<>'expired' or (access->>'weekly_prompt_limit')::integer<>1 then raise exception 'Expired access did not return to free'; end if;
 if public.can_save_student_workspace(first_student,'planner','{}') then raise exception 'Expired access must preserve but not overwrite paid plans'; end if;
 perform set_config('request.jwt.claim.sub',p::text,true);
 if public.can_save_student_workspace(first_student,'grammar','{"selected":"g4-1"}') then raise exception 'Another parent cannot save this student'; end if;
 perform public.pilot_release(first_order);
 if (select state from public.pilot_orders where id=first_order)<>'paid' then raise exception 'Expiry must never release a purchased spot'; end if;
 if has_function_privilege('authenticated','public.pilot_confirm(uuid,text,text)','EXECUTE') or has_table_privilege('authenticated','public.subscriptions','UPDATE') then raise exception 'Browser can grant paid access'; end if;
 if (select enabled from public.pilot_campaign where id='homeschool-pilot-live') then raise exception 'Live payments must remain disabled'; end if;
end $$;
select 'PASS: five-spot cap, reservation reuse, duplicate payment, exact 28 days, expiry, and service-only grants' as result;
rollback;
