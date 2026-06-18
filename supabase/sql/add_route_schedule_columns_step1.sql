-- STEP 1: Add nullable route/post metadata columns and new schedule item columns.
-- Run this manually from Supabase SQL Editor after reviewing the target database.
-- This migration intentionally keeps legacy columns and does not add strict checks yet.

begin;

alter table public.posts
  add column if not exists route_date date,
  add column if not exists area text,
  add column if not exists transport_type text,
  add column if not exists companion_type text,
  add column if not exists budget integer,
  add column if not exists weather_type text,
  add column if not exists caption text,
  add column if not exists updated_at timestamptz;

alter table public.schedule_items
  add column if not exists start_time text,
  add column if not exists end_time text,
  add column if not exists content_name text,
  add column if not exists place_name text,
  add column if not exists updated_at timestamptz;

-- Safe backfill only:
-- Current app code stores the schedule start time in schedule_items.time.
update public.schedule_items
set start_time = time
where start_time is null
  and time is not null;

-- Current app code stores the schedule content name in schedule_items.spot_name.
update public.schedule_items
set content_name = spot_name
where content_name is null
  and spot_name is not null;

-- Do not backfill end_time in STEP 1.
-- stay_duration is a display string in current app code, and existing DB values may
-- include multiple formats. Automatic conversion is deferred until values are audited.

-- Do not backfill place_name.
-- Existing spot_name may contain either content names or place names, and cannot be
-- safely split automatically.

-- Keep legacy columns:
-- public.schedule_items.time
-- public.schedule_items.spot_name
-- public.schedule_items.stay_duration
-- public.posts.type
-- public.posts.cover_image_url

commit;
