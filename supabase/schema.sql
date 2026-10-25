-- Esquema do banco remoto do GilmarGardens (Supabase, PostgreSQL).
-- As tabelas espelham as do SQLite do celular (src/data/banco.ts).
--
-- Colunas de sincronização:
--   atualizado_em   quando o registro foi alterado no celular; decide o conflito (vale o mais recente).
--   excluido        exclusão lógica, para que a exclusão também chegue ao outro celular.
--   sincronizado_em quando o registro chegou ao servidor; o celular baixa o que chegou depois da última vez.

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null
);

create table public.clientes (
  id text primary key,
  nome text not null,
  telefone text not null default '',
  endereco text not null default '',
  bairro text not null default '',
  tipo text not null check (tipo in ('FIXO', 'AVULSO')),
  frequencia_semanas integer,
  valor_mensal numeric(10, 2),
  data_ultimo_reajuste date,
  tamanho_jardim text not null default '',
  arvores text not null default '',
  plantas text not null default '',
  acesso_casa text not null default '',
  animais text not null default '',
  ativo boolean not null default true,
  atualizado_em timestamptz not null,
  excluido boolean not null default false,
  sincronizado_em timestamptz not null default now()
);

create table public.visitas (
  id text primary key,
  cliente_id text not null,
  data_prevista date not null,
  data_realizada date,
  servico text not null check (servico in ('MANUTENCAO', 'LIMPEZA_TERRENO')),
  valor numeric(10, 2),
  observacoes text not null default '',
  status text not null check (status in ('AGENDADA', 'REALIZADA', 'CANCELADA')),
  atualizado_em timestamptz not null,
  excluido boolean not null default false,
  sincronizado_em timestamptz not null default now()
);

create table public.pagamentos (
  id text primary key,
  cliente_id text not null,
  data date not null,
  referencia text,
  valor numeric(10, 2) not null,
  forma text not null check (forma in ('PIX', 'DINHEIRO', 'TRANSFERENCIA')),
  observacoes text not null default '',
  atualizado_em timestamptz not null,
  excluido boolean not null default false,
  sincronizado_em timestamptz not null default now()
);

create index visitas_sincronizado_em on public.visitas (sincronizado_em);
create index pagamentos_sincronizado_em on public.pagamentos (sincronizado_em);
create index clientes_sincronizado_em on public.clientes (sincronizado_em);

create function public.marcar_sincronizado_em() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.sincronizado_em := now();
  return new;
end;
$$;

create trigger clientes_sincronizado_em before insert or update on public.clientes
  for each row execute function public.marcar_sincronizado_em();
create trigger visitas_sincronizado_em before insert or update on public.visitas
  for each row execute function public.marcar_sincronizado_em();
create trigger pagamentos_sincronizado_em before insert or update on public.pagamentos
  for each row execute function public.marcar_sincronizado_em();

-- Vale a alteração mais recente: um envio com atualizado_em mais antigo que o do servidor é ignorado,
-- e o celular que o enviou recebe a versão do servidor na mesma sincronização.
create function public.manter_mais_recente() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.atualizado_em < old.atualizado_em then
    return null;
  end if;
  return new;
end;
$$;

create trigger clientes_mais_recente before update on public.clientes
  for each row execute function public.manter_mais_recente();
create trigger visitas_mais_recente before update on public.visitas
  for each row execute function public.manter_mais_recente();
create trigger pagamentos_mais_recente before update on public.pagamentos
  for each row execute function public.manter_mais_recente();

-- Só os usuários cadastrados em public.usuarios (o proprietário e Heloíse) leem e gravam os dados.
-- A função fica no esquema privado, fora da API REST.
create schema privado;
grant usage on schema privado to authenticated;

create function privado.usuario_autorizado() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.usuarios where id = (select auth.uid()));
$$;
revoke execute on function privado.usuario_autorizado() from public, anon;
grant execute on function privado.usuario_autorizado() to authenticated;

alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.visitas enable row level security;
alter table public.pagamentos enable row level security;

create policy "usuario le o proprio cadastro" on public.usuarios
  for select to authenticated using (id = (select auth.uid()));

create policy "usuarios autorizados" on public.clientes
  for all to authenticated using ((select privado.usuario_autorizado())) with check ((select privado.usuario_autorizado()));
create policy "usuarios autorizados" on public.visitas
  for all to authenticated using ((select privado.usuario_autorizado())) with check ((select privado.usuario_autorizado()));
create policy "usuarios autorizados" on public.pagamentos
  for all to authenticated using ((select privado.usuario_autorizado())) with check ((select privado.usuario_autorizado()));

-- Quem é criado no painel do Supabase (Authentication > Users > Add user) já fica autorizado.
-- O cadastro aberto (sign up) fica desligado no painel, então só o dono do projeto cria usuários.
create function privado.autorizar_novo_usuario() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function privado.autorizar_novo_usuario() from public, anon, authenticated;

create trigger autorizar_novo_usuario after insert on auth.users
  for each row execute function privado.autorizar_novo_usuario();
