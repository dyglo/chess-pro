create table if not exists public.match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists match_messages_match_id_created_at_idx
  on public.match_messages (match_id, created_at);

alter table public.match_messages enable row level security;

create policy "match_messages_select"
  on public.match_messages
  for select
  using (
    exists (
      select 1 from public.match_players mp
      where mp.match_id = match_messages.match_id
        and mp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.matches m
      where m.id = match_messages.match_id
        and (m.white_user_id = auth.uid() or m.black_user_id = auth.uid())
    )
  );

create policy "match_messages_insert"
  on public.match_messages
  for insert
  with check (
    auth.uid() = user_id
    and (
      exists (
        select 1 from public.match_players mp
        where mp.match_id = match_messages.match_id
          and mp.user_id = auth.uid()
      )
      or exists (
        select 1 from public.matches m
        where m.id = match_messages.match_id
          and (m.white_user_id = auth.uid() or m.black_user_id = auth.uid())
      )
    )
  );
