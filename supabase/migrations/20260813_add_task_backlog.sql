alter table public.tasks
  add column if not exists placement text not null default 'scheduled',
  add column if not exists backlog_kind text,
  add column if not exists original_task_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_placement_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_placement_check
      check (placement in ('scheduled', 'backlog'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_backlog_kind_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_backlog_kind_check
      check (backlog_kind in ('unscheduled', 'unexecuted'));
  end if;
end
$$;

create index if not exists tasks_user_placement_date_idx
on public.tasks (user_id, placement, task_date);
