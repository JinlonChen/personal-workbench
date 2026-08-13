create table if not exists public.focus_sessions (
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

create index if not exists focus_sessions_user_date_idx on public.focus_sessions (user_id, focus_date);
create index if not exists focus_sessions_user_task_idx on public.focus_sessions (user_id, task_id);

create trigger focus_sessions_set_updated_at
before update on public.focus_sessions
for each row execute function public.set_updated_at();

alter table public.focus_sessions enable row level security;

create policy focus_sessions_select_own on public.focus_sessions
for select using (auth.uid() = user_id);
create policy focus_sessions_insert_own on public.focus_sessions
for insert with check (auth.uid() = user_id);
create policy focus_sessions_update_own on public.focus_sessions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy focus_sessions_delete_own on public.focus_sessions
for delete using (auth.uid() = user_id);
