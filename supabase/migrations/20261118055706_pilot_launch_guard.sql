begin;
alter table public.pilot_campaign drop constraint pilot_campaign_id_check;
alter table public.pilot_campaign add constraint pilot_campaign_id_check check(id in ('homeschool-pilot-test','homeschool-pilot-live'));
insert into public.pilot_campaign(id,enabled) values('homeschool-pilot-live',false);
drop function public.pilot_reserve(uuid,uuid,text);
create function public.pilot_reserve(p_parent uuid,p_student uuid,p_return text,p_campaign text default 'homeschool-pilot-test') returns public.pilot_orders language plpgsql security definer set search_path='' as $$
declare o public.pilot_orders;
begin
 perform 1 from public.pilot_campaign where id=p_campaign and enabled for update;
 if not found then raise exception 'Pilot is unavailable'; end if;
 if not exists(select 1 from public.students where id=p_student and parent_id=p_parent) then raise exception 'Student not found'; end if;
 select * into o from public.pilot_orders where student_id=p_student and campaign_id=p_campaign and state in ('reserved','paid') for update;
 if found then if o.state='paid' then raise exception 'This student already purchased the pilot'; else return o; end if; end if;
 if (select count(*) from public.pilot_orders where campaign_id=p_campaign and state in ('reserved','paid'))>=5 then raise exception 'All five pilot spots are taken or reserved'; end if;
 insert into public.pilot_orders(parent_id,student_id,return_url,campaign_id) values(p_parent,p_student,p_return,p_campaign) returning * into o;
 return o;
end; $$;
revoke all on function public.pilot_reserve(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.pilot_reserve(uuid,uuid,text,text) to service_role;
create or replace function public.pilot_confirm(p_order uuid,p_session text,p_event text) returns public.pilot_orders language plpgsql security definer set search_path='' as $$
declare o public.pilot_orders; started timestamptz:=now();
begin
 select * into o from public.pilot_orders where id=p_order;
 perform 1 from public.pilot_campaign where id=o.campaign_id for update;
 select * into o from public.pilot_orders where id=p_order for update;
 if not found or (o.checkout_session_id is not null and o.checkout_session_id<>p_session) then raise exception 'Payment does not match reservation'; end if;
 if o.state='released' then raise exception 'Released reservation requires payment review'; end if;
 if o.state<>'paid' then update public.pilot_orders set state='paid',checkout_session_id=p_session,starts_at=started,ends_at=started+interval '28 days' where id=p_order returning * into o; end if;
 insert into public.pilot_payment_events(event_id,order_id) values(p_event,p_order) on conflict do nothing;
 return o;
end; $$;
create or replace function public.pilot_release(p_order uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.pilot_campaign where id=(select campaign_id from public.pilot_orders where id=p_order) for update;
 update public.pilot_orders set state='released' where id=p_order and state='reserved';
end; $$;
revoke insert on public.students from authenticated;
commit;
