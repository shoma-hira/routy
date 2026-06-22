alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Allow trusted SQL/admin contexts such as Supabase SQL Editor.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role is distinct from 'user' and not public.is_admin() then
      raise exception 'Only admins can assign profile roles';
    end if;
    return new;
  end if;

  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only admins can change profile roles';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;

create trigger prevent_profile_role_escalation
before insert or update of role on public.profiles
for each row
execute function public.prevent_profile_role_escalation();

update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where lower(email) = lower('basukehiraoka828@gmail.com')
);

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'posts'
      and cmd = 'DELETE'
  loop
    execute format('drop policy if exists %I on public.posts', policy_record.policyname);
  end loop;
end;
$$;

create policy posts_delete_own_or_admin
on public.posts
for delete
using (auth.uid() = user_id or public.is_admin());

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select
      con.conname,
      child.relname as child_table,
      child_col.attname as child_column,
      parent.relname as parent_table,
      parent_col.attname as parent_column
    from pg_constraint con
    join pg_class child on child.oid = con.conrelid
    join pg_namespace child_ns on child_ns.oid = child.relnamespace
    join pg_class parent on parent.oid = con.confrelid
    join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
    join unnest(con.conkey) with ordinality child_key(attnum, ord) on true
    join unnest(con.confkey) with ordinality parent_key(attnum, ord)
      on parent_key.ord = child_key.ord
    join pg_attribute child_col
      on child_col.attrelid = con.conrelid
     and child_col.attnum = child_key.attnum
    join pg_attribute parent_col
      on parent_col.attrelid = con.confrelid
     and parent_col.attnum = parent_key.attnum
    where con.contype = 'f'
      and child_ns.nspname = 'public'
      and parent_ns.nspname = 'public'
      and parent.relname = 'posts'
      and parent_col.attname = 'id'
      and child.relname in ('schedule_items', 'saved_posts')
      and child_col.attname = 'post_id'
      and con.confdeltype <> 'c'
  loop
    execute format(
      'alter table public.%I drop constraint %I',
      constraint_record.child_table,
      constraint_record.conname
    );
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.%I(%I) on delete cascade',
      constraint_record.child_table,
      constraint_record.conname,
      constraint_record.child_column,
      constraint_record.parent_table,
      constraint_record.parent_column
    );
  end loop;
end;
$$;
