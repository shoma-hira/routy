-- Add persistent likes for ROUTY posts.
-- Review and run manually from the Supabase SQL Editor.

begin;

create table if not exists public.post_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists post_likes_post_id_idx
  on public.post_likes (post_id);

alter table public.post_likes enable row level security;

drop policy if exists post_likes_select_authenticated on public.post_likes;
create policy post_likes_select_authenticated
on public.post_likes
for select
to authenticated
using (true);

drop policy if exists post_likes_insert_own on public.post_likes;
create policy post_likes_insert_own
on public.post_likes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists post_likes_delete_own on public.post_likes;
create policy post_likes_delete_own
on public.post_likes
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, delete on public.post_likes to authenticated;

commit;
