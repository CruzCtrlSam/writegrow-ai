-- ============================================================
-- WriteGrow AI — tiered plans + optional AI add-on migration
--
-- Run this file manually in the Supabase SQL editor
-- (Database -> SQL -> New query). It is additive and non-destructive:
-- existing rows remain valid, the legacy 'premium' plan value stays in
-- the enum for backward compatibility, and AI starts disabled by default.
-- ============================================================

alter type plan_tier add value if not exists 'basic';
alter type plan_tier add value if not exists 'pro';

alter table public.subscriptions
  add column if not exists ai_enabled boolean not null default false;
