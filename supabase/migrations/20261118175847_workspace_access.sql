begin;
create function public.can_save_student_workspace(p_student uuid,p_kind text,p_data jsonb) returns boolean language plpgsql stable security definer set search_path='' as $$
declare first_lesson text; prior jsonb; a jsonb; b jsonb; field text;
begin
 select 'g'||grade||'-1' into first_lesson from public.students where id=p_student and parent_id=auth.uid();
 if first_lesson is null then return false; end if;
 if writegrow_private.full_access(p_student) then return true; end if;
 if p_kind<>'grammar' or jsonb_typeof(p_data)<>'object' then return false; end if;
 select data into prior from public.student_workspaces where student_id=p_student and kind='grammar' and workspace_key='default';
 prior:=coalesce(prior,'{}'::jsonb);
 if coalesce(p_data->>'selected','') not in (first_lesson,coalesce(prior->>'selected',first_lesson)) then return false; end if;
 if (p_data-array['selected','drafts','completed','assisted','proofreading'])<>(prior-array['selected','drafts','completed','assisted','proofreading']) then return false; end if;
 foreach field in array array['drafts','proofreading'] loop
   a:=coalesce(p_data->field,'{}'::jsonb); b:=coalesce(prior->field,'{}'::jsonb);
   if jsonb_typeof(a)<>'object' or (a-first_lesson)<>(b-first_lesson) then return false; end if;
 end loop;
 foreach field in array array['completed','assisted'] loop
   if jsonb_typeof(coalesce(p_data->field,'[]'::jsonb))<>'array' then return false; end if;
   select coalesce(jsonb_agg(value),'[]'::jsonb) into a from jsonb_array_elements(coalesce(p_data->field,'[]'::jsonb)) where value<>to_jsonb(first_lesson);
   select coalesce(jsonb_agg(value),'[]'::jsonb) into b from jsonb_array_elements(coalesce(prior->field,'[]'::jsonb)) where value<>to_jsonb(first_lesson);
   if a<>b then return false; end if;
 end loop;
 return true;
end; $$;
revoke all on function public.can_save_student_workspace(uuid,text,jsonb) from public,anon;
grant execute on function public.can_save_student_workspace(uuid,text,jsonb) to authenticated;
alter policy workspaces_owner_insert on public.student_workspaces with check(public.can_save_student_workspace(student_id,kind,data));
alter policy workspaces_owner_update on public.student_workspaces with check(public.can_save_student_workspace(student_id,kind,data));
commit;
