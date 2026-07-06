-- MIGRAZIONE 002 — Modulo Social Post
-- Esegui SOLO questo file in Supabase → SQL Editor se hai già configurato
-- il progetto in precedenza (prima che esistesse il modulo Social Post).
-- Non tocca né cancella nulla di ciò che hai già creato: aggiunge solo le
-- tabelle nuove necessarie a questo modulo.

-- Punteggi/note del modulo Article (se non li avevi ancora aggiunti)
alter table article_projects add column if not exists scores jsonb;
alter table article_projects add column if not exists ai_notes jsonb;

-- Sedi: ogni sede ha il proprio flusso di proposte giornaliere
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  specialization text,
  created_at timestamptz default now()
);

alter table locations enable row level security;

drop policy if exists "utenti autenticati leggono le sedi" on locations;
create policy "utenti autenticati leggono le sedi"
  on locations for select using (auth.role() = 'authenticated');

drop policy if exists "utenti autenticati gestiscono le sedi" on locations;
create policy "utenti autenticati gestiscono le sedi"
  on locations for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Query di ricerca del sito (incollate manualmente)
create table if not exists site_queries (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  query text not null,
  created_at timestamptz default now()
);

alter table site_queries enable row level security;

drop policy if exists "utenti autenticati leggono le query" on site_queries;
create policy "utenti autenticati leggono le query"
  on site_queries for select using (auth.role() = 'authenticated');

drop policy if exists "utenti autenticati gestiscono le query" on site_queries;
create policy "utenti autenticati gestiscono le query"
  on site_queries for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Proposte generate ogni giorno (5 per sede)
create table if not exists social_post_proposals (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  generated_on date not null default current_date,
  topic text,
  hook text,
  caption text,
  hashtags text,
  sources jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table social_post_proposals enable row level security;

drop policy if exists "utenti autenticati leggono le proposte" on social_post_proposals;
create policy "utenti autenticati leggono le proposte"
  on social_post_proposals for select using (auth.role() = 'authenticated');

drop policy if exists "utenti autenticati gestiscono le proposte" on social_post_proposals;
create policy "utenti autenticati gestiscono le proposte"
  on social_post_proposals for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Post finiti (immagine + copy pronti per la pubblicazione)
create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references social_post_proposals(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  image_path text,
  final_caption text,
  created_at timestamptz default now()
);

alter table social_posts enable row level security;

drop policy if exists "utenti autenticati leggono i post" on social_posts;
create policy "utenti autenticati leggono i post"
  on social_posts for select using (auth.role() = 'authenticated');

drop policy if exists "utenti autenticati gestiscono i post" on social_posts;
create policy "utenti autenticati gestiscono i post"
  on social_posts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Impostazioni brand per la generazione immagini (riga singola condivisa)
create table if not exists brand_settings (
  id int primary key default 1,
  visual_guideline text,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into brand_settings (id, visual_guideline)
values (1, '')
on conflict (id) do nothing;

alter table brand_settings enable row level security;

drop policy if exists "utenti autenticati leggono le impostazioni brand" on brand_settings;
create policy "utenti autenticati leggono le impostazioni brand"
  on brand_settings for select using (auth.role() = 'authenticated');

drop policy if exists "utenti autenticati aggiornano le impostazioni brand" on brand_settings;
create policy "utenti autenticati aggiornano le impostazioni brand"
  on brand_settings for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Storage: crea manualmente il bucket "social-assets" (privato) da
-- Supabase → Storage → New bucket PRIMA di eseguire queste due righe:
drop policy if exists "utenti autenticati caricano immagini social" on storage.objects;
create policy "utenti autenticati caricano immagini social"
  on storage.objects for insert
  with check (bucket_id = 'social-assets' and auth.role() = 'authenticated');

drop policy if exists "utenti autenticati leggono immagini social" on storage.objects;
create policy "utenti autenticati leggono immagini social"
  on storage.objects for select
  using (bucket_id = 'social-assets' and auth.role() = 'authenticated');
