-- Allow logged-in parents to update their own subscription preferences.
-- This supports the static GitHub Pages build where plan switching is a
-- self-serve app preference until real Stripe billing is connected.

alter table public.subscriptions
  add column if not exists ai_enabled boolean not null default false;

alter type plan_tier add value if not exists 'basic';
alter type plan_tier add value if not exists 'pro';

drop policy if exists subs_owner_update_preferences on public.subscriptions;
create policy subs_owner_update_preferences on public.subscriptions
  for update
  using ((select auth.uid()) = parent_id)
  with check ((select auth.uid()) = parent_id);
