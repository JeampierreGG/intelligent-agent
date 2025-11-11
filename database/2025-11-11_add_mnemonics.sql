-- Tablas para mnemotecnias creadas por estudiantes

create table if not exists public.educational_mnemonics (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.educational_resources(id) on delete cascade,
  user_id uuid not null,
  system_mnemonic text,
  user_mnemonic text,
  items_count int not null default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.educational_mnemonic_items (
  id uuid primary key default gen_random_uuid(),
  mnemonic_id uuid not null references public.educational_mnemonics(id) on delete cascade,
  prompt text not null,
  answer text not null
);

-- Índices y políticas básicas (ajustar según seguridad requerida)
create index if not exists idx_mnemonics_resource on public.educational_mnemonics(resource_id);
create index if not exists idx_mnemonics_user on public.educational_mnemonics(user_id);
create index if not exists idx_mnemonic_items_mn on public.educational_mnemonic_items(mnemonic_id);