-- Closeness schema. Run once in the Supabase SQL editor (EU-region project).
-- Five entity tables, identical shape: client-generated uuid PK (idempotent
-- upserts), jsonb payload-style columns kept explicit where they matter,
-- RLS scoped to the owning user even though the app is single-user
-- (defence in depth).

create table if not exists conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  kind text,                -- 'quick' | 'full'
  note text,
  depth smallint,           -- 1-5, subjective experience (Decision E)
  counts jsonb,             -- behavioral counts: questions, silences, disclosures... (primary metrics)
  signals jsonb,            -- external signals: extended, followed_up, disclosed_back
  mechanics jsonb,          -- mechanics used this rep
  triggers jsonb,
  deleted boolean default false
);

create table if not exists primes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  intention text,
  phase smallint,
  deleted boolean default false
);

create table if not exists audits (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  reflections text,
  predict_reveal jsonb,     -- perspective-taking accuracy checks
  deleted boolean default false
);

create table if not exists weekly_reviews (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  week_start date,
  aggregates jsonb,         -- derived from data, confirm-or-adjust
  focus_next text,
  deleted boolean default false
);

create table if not exists settings (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  phase_override smallint,
  start_date date,
  reminders jsonb,
  deleted boolean default false
);

-- RLS: only the owner reads/writes their rows.
alter table conversations enable row level security;
alter table primes enable row level security;
alter table audits enable row level security;
alter table weekly_reviews enable row level security;
alter table settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['conversations','primes','audits','weekly_reviews','settings'] loop
    execute format('create policy "own rows select" on %I for select using (auth.uid() = user_id);', t);
    execute format('create policy "own rows insert" on %I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "own rows update" on %I for update using (auth.uid() = user_id);', t);
  end loop;
end $$;
