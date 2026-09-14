create table if not exists public.thought_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  title text not null,
  content text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists thought_entries_user_date_idx on public.thought_entries (user_id, entry_date);
create index if not exists thought_entries_search_idx on public.thought_entries using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));
create index if not exists thought_entries_tags_idx on public.thought_entries using gin (tags);

drop trigger if exists thought_entries_set_updated_at on public.thought_entries;
create trigger thought_entries_set_updated_at before update on public.thought_entries
for each row execute function public.set_updated_at();

alter table public.thought_entries enable row level security;

drop policy if exists thought_entries_select_own on public.thought_entries;
create policy thought_entries_select_own on public.thought_entries for select using (auth.uid() = user_id);
drop policy if exists thought_entries_insert_own on public.thought_entries;
create policy thought_entries_insert_own on public.thought_entries for insert with check (auth.uid() = user_id);
drop policy if exists thought_entries_update_own on public.thought_entries;
create policy thought_entries_update_own on public.thought_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists thought_entries_delete_own on public.thought_entries;
create policy thought_entries_delete_own on public.thought_entries for delete using (auth.uid() = user_id);
