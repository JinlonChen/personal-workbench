create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Shanghai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.focus_projects (
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

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  task_date date not null,
  placement text not null default 'scheduled' check (placement in ('scheduled', 'backlog')),
  backlog_kind text check (backlog_kind in ('unscheduled', 'unexecuted')),
  original_task_date date,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done', 'cancelled')),
  source text not null default 'manual' check (source in ('manual', 'work_entry', 'recurring_plan')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.work_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  title text not null,
  content text not null default '',
  result text not null default '',
  task_id uuid,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, task_id) references public.tasks(user_id, id) on delete set null (task_id)
);

create table public.learning_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  title text not null,
  content text not null default '',
  source_url text not null default '',
  key_points text not null default '',
  next_action text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null,
  completed_summary text not null default '',
  main_gain text not null default '',
  blockers text not null default '',
  improvement text not null default '',
  tomorrow_focus text not null default '',
  mood text not null default 'neutral' check (mood in ('low', 'neutral', 'steady', 'good', 'great')),
  energy smallint not null default 3 check (energy between 1 and 5),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, review_date)
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  task_title text not null,
  focus_date date not null,
  planned_minutes smallint not null check (planned_minutes in (15, 25, 45, 60)),
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recurring_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'life' check (category in ('work', 'life')),
  start_date date not null,
  interval integer not null check (interval > 0),
  unit text not null check (unit in ('day', 'week', 'month', 'quarter', 'year')),
  mode text not null check (mode in ('fixed', 'after_completion')),
  missed_policy text check (missed_policy in ('catch_up_all', 'latest_only')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  in_app_reminder boolean not null default true,
  browser_notification boolean not null default false,
  end_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'terminated')),
  completion_anchor_date date,
  next_due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check ((mode = 'fixed' and missed_policy is not null) or (mode = 'after_completion' and missed_policy is null))
);

alter table public.tasks
  add column recurring_plan_id uuid references public.recurring_plans(id) on delete set null,
  add column recurrence_due_date date;

create table public.recurring_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recurring_plan_id uuid not null references public.recurring_plans(id) on delete cascade,
  due_date date not null,
  task_id uuid references public.tasks(id) on delete set null,
  status text not null default 'generated' check (status in ('generated', 'completed', 'cancelled', 'skipped', 'deleted')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recurring_plan_id, due_date)
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger focus_projects_set_updated_at
before update on public.focus_projects
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger work_entries_set_updated_at
before update on public.work_entries
for each row execute function public.set_updated_at();

create trigger learning_entries_set_updated_at
before update on public.learning_entries
for each row execute function public.set_updated_at();

create trigger daily_reviews_set_updated_at
before update on public.daily_reviews
for each row execute function public.set_updated_at();

create trigger focus_sessions_set_updated_at
before update on public.focus_sessions
for each row execute function public.set_updated_at();

create trigger recurring_plans_set_updated_at
before update on public.recurring_plans
for each row execute function public.set_updated_at();

create trigger recurring_occurrences_set_updated_at
before update on public.recurring_occurrences
for each row execute function public.set_updated_at();

create index tasks_user_date_idx on public.tasks (user_id, task_date);
create index tasks_user_placement_date_idx on public.tasks (user_id, placement, task_date);
create index focus_projects_user_date_idx on public.focus_projects (user_id, next_review_date);
create index work_entries_user_date_idx on public.work_entries (user_id, entry_date);
create index learning_entries_user_date_idx on public.learning_entries (user_id, entry_date);
create index daily_reviews_user_date_idx on public.daily_reviews (user_id, review_date);
create index focus_sessions_user_date_idx on public.focus_sessions (user_id, focus_date);
create index focus_sessions_user_task_idx on public.focus_sessions (user_id, task_id);
create index recurring_plans_user_date_idx on public.recurring_plans (user_id, next_due_date);
create index recurring_occurrences_user_date_idx on public.recurring_occurrences (user_id, due_date);
create index tasks_user_recurring_idx on public.tasks (user_id, recurring_plan_id, recurrence_due_date);

create index tasks_search_idx on public.tasks using gin (to_tsvector(
  'simple', coalesce(title, '') || ' ' || coalesce(description, '')
));
create index work_entries_search_idx on public.work_entries using gin (to_tsvector(
    'simple',
    coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(result, '')
));
create index learning_entries_search_idx on public.learning_entries using gin (to_tsvector(
    'simple',
    coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(key_points, '')
));
create index work_entries_tags_idx on public.work_entries using gin (tags);
create index learning_entries_tags_idx on public.learning_entries using gin (tags);

alter table public.profiles enable row level security;
alter table public.focus_projects enable row level security;
alter table public.tasks enable row level security;
alter table public.work_entries enable row level security;
alter table public.learning_entries enable row level security;
alter table public.daily_reviews enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.recurring_plans enable row level security;
alter table public.recurring_occurrences enable row level security;

create policy profiles_select_own on public.profiles
for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_delete_own on public.profiles
for delete using (auth.uid() = id);

create policy focus_projects_select_own on public.focus_projects
for select using (auth.uid() = user_id);
create policy focus_projects_insert_own on public.focus_projects
for insert with check (auth.uid() = user_id);
create policy focus_projects_update_own on public.focus_projects
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy focus_projects_delete_own on public.focus_projects
for delete using (auth.uid() = user_id);

create policy tasks_select_own on public.tasks
for select using (auth.uid() = user_id);
create policy tasks_insert_own on public.tasks
for insert with check (auth.uid() = user_id);
create policy tasks_update_own on public.tasks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy tasks_delete_own on public.tasks
for delete using (auth.uid() = user_id);

create policy work_entries_select_own on public.work_entries
for select using (auth.uid() = user_id);
create policy work_entries_insert_own on public.work_entries
for insert with check (auth.uid() = user_id);
create policy work_entries_update_own on public.work_entries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy work_entries_delete_own on public.work_entries
for delete using (auth.uid() = user_id);

create policy learning_entries_select_own on public.learning_entries
for select using (auth.uid() = user_id);
create policy learning_entries_insert_own on public.learning_entries
for insert with check (auth.uid() = user_id);
create policy learning_entries_update_own on public.learning_entries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy learning_entries_delete_own on public.learning_entries
for delete using (auth.uid() = user_id);

create policy daily_reviews_select_own on public.daily_reviews
for select using (auth.uid() = user_id);
create policy daily_reviews_insert_own on public.daily_reviews
for insert with check (auth.uid() = user_id);
create policy daily_reviews_update_own on public.daily_reviews
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy daily_reviews_delete_own on public.daily_reviews
for delete using (auth.uid() = user_id);

create policy focus_sessions_select_own on public.focus_sessions
for select using (auth.uid() = user_id);
create policy focus_sessions_insert_own on public.focus_sessions
for insert with check (auth.uid() = user_id);
create policy focus_sessions_update_own on public.focus_sessions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy focus_sessions_delete_own on public.focus_sessions
for delete using (auth.uid() = user_id);

create policy recurring_plans_select_own on public.recurring_plans
for select using (auth.uid() = user_id);
create policy recurring_plans_insert_own on public.recurring_plans
for insert with check (auth.uid() = user_id);
create policy recurring_plans_update_own on public.recurring_plans
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy recurring_plans_delete_own on public.recurring_plans
for delete using (auth.uid() = user_id);

create policy recurring_occurrences_select_own on public.recurring_occurrences
for select using (auth.uid() = user_id);
create policy recurring_occurrences_insert_own on public.recurring_occurrences
for insert with check (auth.uid() = user_id);
create policy recurring_occurrences_update_own on public.recurring_occurrences
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy recurring_occurrences_delete_own on public.recurring_occurrences
for delete using (auth.uid() = user_id);
