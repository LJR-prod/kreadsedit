-- ============================================================
-- KREADS EDIT BATTLE — Supabase Schema
-- Coller dans : Supabase > SQL Editor > New query > Run
-- ============================================================

-- Sessions mensuelles
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,
  label text not null,
  status text not null default 'open' check (status in ('open','closed','revealed')),
  created_at timestamptz default now(),
  closed_at timestamptz,
  revealed_at timestamptz
);

-- Soumissions (1 par monteur par session)
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  editor_name text not null,
  youtube_url text not null,
  display_number integer not null,
  created_at timestamptz default now(),
  unique(session_id, editor_name),
  unique(session_id, display_number)
);

-- Votes (1 par votant par session)
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  voter_name text not null,
  gold_entry_id uuid not null references entries(id),
  silver_entry_id uuid not null references entries(id),
  bronze_entry_id uuid not null references entries(id),
  created_at timestamptz default now(),
  unique(session_id, voter_name)
);

-- Scores all-time
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  editor_name text not null unique,
  total_points integer not null default 0,
  gold_count integer not null default 0,
  silver_count integer not null default 0,
  bronze_count integer not null default 0,
  wins integer not null default 0,
  badges text[] not null default '{}',
  updated_at timestamptz default now()
);

-- ── Row Level Security ──────────────────────────────────────
alter table sessions enable row level security;
alter table entries enable row level security;
alter table votes enable row level security;
alter table scores enable row level security;

-- Lecture publique des sessions
create policy "public read sessions" on sessions for select using (true);

-- Lecture publique des entries
create policy "public read entries" on entries for select using (true);

-- Votes : insertion publique, lecture bloquée (admin seulement via service role)
create policy "public insert votes" on votes for insert with check (true);
create policy "block vote reads" on votes for select using (false);

-- Lecture publique des scores
create policy "public read scores" on scores for select using (true);

-- ── Index ───────────────────────────────────────────────────
create index if not exists idx_entries_session on entries(session_id);
create index if not exists idx_votes_session on votes(session_id);
create index if not exists idx_scores_pts on scores(total_points desc);
