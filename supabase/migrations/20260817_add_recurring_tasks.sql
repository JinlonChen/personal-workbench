create table if not exists public.recurring_plans (
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
  add column if not exists recurring_plan_id uuid references public.recurring_plans(id) on delete set null,
  add column if not exists recurrence_due_date date;

alter table public.tasks drop constraint if exists tasks_source_check;
alter table public.tasks add constraint tasks_source_check
  check (source in ('manual', 'work_entry', 'recurring_plan'));

create table if not exists public.recurring_occurrences (
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

create index if not exists recurring_plans_user_date_idx on public.recurring_plans (user_id, next_due_date);
create index if not exists recurring_occurrences_user_date_idx on public.recurring_occurrences (user_id, due_date);
create index if not exists tasks_user_recurring_idx on public.tasks (user_id, recurring_plan_id, recurrence_due_date);

drop trigger if exists recurring_plans_set_updated_at on public.recurring_plans;
create trigger recurring_plans_set_updated_at before update on public.recurring_plans
for each row execute function public.set_updated_at();
drop trigger if exists recurring_occurrences_set_updated_at on public.recurring_occurrences;
create trigger recurring_occurrences_set_updated_at before update on public.recurring_occurrences
for each row execute function public.set_updated_at();

alter table public.recurring_plans enable row level security;
alter table public.recurring_occurrences enable row level security;

drop policy if exists recurring_plans_select_own on public.recurring_plans;
create policy recurring_plans_select_own on public.recurring_plans for select using (auth.uid() = user_id);
drop policy if exists recurring_plans_insert_own on public.recurring_plans;
create policy recurring_plans_insert_own on public.recurring_plans for insert with check (auth.uid() = user_id);
drop policy if exists recurring_plans_update_own on public.recurring_plans;
create policy recurring_plans_update_own on public.recurring_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists recurring_plans_delete_own on public.recurring_plans;
create policy recurring_plans_delete_own on public.recurring_plans for delete using (auth.uid() = user_id);

drop policy if exists recurring_occurrences_select_own on public.recurring_occurrences;
create policy recurring_occurrences_select_own on public.recurring_occurrences for select using (auth.uid() = user_id);
drop policy if exists recurring_occurrences_insert_own on public.recurring_occurrences;
create policy recurring_occurrences_insert_own on public.recurring_occurrences for insert with check (auth.uid() = user_id);
drop policy if exists recurring_occurrences_update_own on public.recurring_occurrences;
create policy recurring_occurrences_update_own on public.recurring_occurrences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists recurring_occurrences_delete_own on public.recurring_occurrences;
create policy recurring_occurrences_delete_own on public.recurring_occurrences for delete using (auth.uid() = user_id);
