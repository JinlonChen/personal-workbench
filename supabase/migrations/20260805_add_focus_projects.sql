create table if not exists public.focus_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform_url text not null default '',
  owner text not null,
  tier text not null default 'parallel' check (tier in ('top', 'parallel', 'paused')),
  status text not null default 'on_track' check (status in ('on_track', 'attention', 'blocked')),
  current_goal text not null default '',
  risk text not null default '',
  next_action text not null default '',
  latest_conclusion text not null default '',
  next_review_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists focus_projects_user_date_idx
on public.focus_projects (user_id, next_review_date);

alter table public.focus_projects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'focus_projects_set_updated_at'
      and tgrelid = 'public.focus_projects'::regclass
  ) then
    create trigger focus_projects_set_updated_at
    before update on public.focus_projects
    for each row execute function public.set_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'focus_projects' and policyname = 'focus_projects_select_own') then
    create policy focus_projects_select_own on public.focus_projects for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'focus_projects' and policyname = 'focus_projects_insert_own') then
    create policy focus_projects_insert_own on public.focus_projects for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'focus_projects' and policyname = 'focus_projects_update_own') then
    create policy focus_projects_update_own on public.focus_projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'focus_projects' and policyname = 'focus_projects_delete_own') then
    create policy focus_projects_delete_own on public.focus_projects for delete using (auth.uid() = user_id);
  end if;
end
$$;
