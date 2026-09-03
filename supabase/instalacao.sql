-- APROVA — instalação (rode uma vez no SQL Editor do Supabase)

create table if not exists public.aprova_docs (
  id          text primary key,
  doc         jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.aprova_docs enable row level security;

-- Equipe pequena com link compartilhado: quem tem a chave anon lê e grava.
-- Para restringir de verdade, troque por políticas com auth.uid().
drop policy if exists "aprova leitura" on public.aprova_docs;
create policy "aprova leitura" on public.aprova_docs for select using (true);

drop policy if exists "aprova escrita" on public.aprova_docs;
create policy "aprova escrita" on public.aprova_docs for insert with check (true);

drop policy if exists "aprova atualizacao" on public.aprova_docs;
create policy "aprova atualizacao" on public.aprova_docs for update using (true) with check (true);

-- Bucket das mídias, leitura pública (as imagens aparecem no <img>)
insert into storage.buckets (id, name, public)
values ('aprova', 'aprova', true)
on conflict (id) do update set public = true;

drop policy if exists "aprova midia leitura" on storage.objects;
create policy "aprova midia leitura" on storage.objects
  for select using (bucket_id = 'aprova');

drop policy if exists "aprova midia envio" on storage.objects;
create policy "aprova midia envio" on storage.objects
  for insert with check (bucket_id = 'aprova');

drop policy if exists "aprova midia troca" on storage.objects;
create policy "aprova midia troca" on storage.objects
  for update using (bucket_id = 'aprova') with check (bucket_id = 'aprova');
