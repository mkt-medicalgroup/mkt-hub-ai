-- Da eseguire in Supabase → SQL Editor

-- Tabella storico articoli generati dal modulo "Article"
create table if not exists article_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  keyword text,
  article_type text,
  length int,
  competitor_url text,
  notes text,
  result text,
  created_at timestamptz default now()
);

alter table article_projects enable row level security;

-- Ogni utente vede e scrive solo le proprie righe
create policy "utenti leggono i propri articoli"
  on article_projects for select
  using (auth.uid() = user_id);

create policy "utenti creano i propri articoli"
  on article_projects for insert
  with check (auth.uid() = user_id);

-- Storage: crea manualmente un bucket chiamato "brand-assets" da
-- Supabase → Storage → New bucket (privato, non pubblico), poi applica
-- queste policy da SQL Editor per limitare l'accesso agli utenti loggati.

create policy "utenti autenticati caricano file brand"
  on storage.objects for insert
  with check (bucket_id = 'brand-assets' and auth.role() = 'authenticated');

create policy "utenti autenticati leggono file brand"
  on storage.objects for select
  using (bucket_id = 'brand-assets' and auth.role() = 'authenticated');
