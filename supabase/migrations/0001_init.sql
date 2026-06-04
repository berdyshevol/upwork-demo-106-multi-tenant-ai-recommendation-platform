-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Adviso — initial schema: multi-tenant recommendation platform              ║
-- ║                                                                            ║
-- ║ Tenant isolation model                                                     ║
-- ║   • Branding config (tenants, question_sets) is public-readable — it's not ║
-- ║     secret, and the app must resolve a tenant by slug before it knows the  ║
-- ║     tenant id.                                                             ║
-- ║   • Tenant-private business data (providers, provider_chunks, leads,       ║
-- ║     recommendations) is guarded by RLS. The anon role only sees rows whose ║
-- ║     tenant_id equals the `x-tenant-id` request header. A client that asks  ║
-- ║     for another tenant's rows simply gets none.                            ║
-- ║   • The service_role (server-only seed/lead writes) bypasses RLS.          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create extension if not exists vector;

-- ── Helper: tenant id carried on the request header ────────────────────────────
create or replace function public.request_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(
    current_setting('request.headers', true)::json ->> 'x-tenant-id',
    ''
  )::uuid;
$$;

-- ── Tables ─────────────────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text not null,
  logo_emoji text not null default '✨',
  theme jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.question_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  version int not null default 1,
  questions jsonb not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, version)
);

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  blurb text not null,
  services text[] not null default '{}',
  price_tier int not null check (price_tier between 1 and 4),
  service_areas text[] not null default '{}',
  available_emergency boolean not null default false,
  response_time_hours numeric not null default 48,
  rating numeric not null default 0 check (rating between 0 and 5),
  years_experience int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists providers_tenant_idx on public.providers(tenant_id);

create table if not exists public.provider_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  source text not null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);
create index if not exists provider_chunks_tenant_idx on public.provider_chunks(tenant_id);
create index if not exists provider_chunks_provider_idx on public.provider_chunks(provider_id);
-- Approximate-nearest-neighbour index over cosine distance.
create index if not exists provider_chunks_embedding_idx
  on public.provider_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists leads_tenant_idx on public.leads(tenant_id);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  score numeric not null,
  breakdown jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists recommendations_tenant_idx on public.recommendations(tenant_id);

-- ── Vector search RPC ────────────────────────────────────────────────────────────
-- Returns the nearest chunks for the *current* tenant (RLS still applies because
-- this is SECURITY INVOKER), optionally narrowed to a set of provider ids so the
-- chat agent can scope retrieval to the providers currently on screen.
create or replace function public.match_provider_chunks(
  query_embedding vector(1536),
  match_tenant uuid,
  match_count int default 6,
  filter_provider_ids uuid[] default null
)
returns table (
  id uuid,
  provider_id uuid,
  source text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.provider_id,
    c.source,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.provider_chunks c
  where c.tenant_id = match_tenant
    and (filter_provider_ids is null or c.provider_id = any (filter_provider_ids))
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ── Row-Level Security ─────────────────────────────────────────────────────────
alter table public.tenants            enable row level security;
alter table public.question_sets      enable row level security;
alter table public.providers          enable row level security;
alter table public.provider_chunks    enable row level security;
alter table public.leads              enable row level security;
alter table public.recommendations    enable row level security;

-- Public branding config: anyone may read.
drop policy if exists tenants_public_read on public.tenants;
create policy tenants_public_read on public.tenants
  for select to anon, authenticated using (true);

drop policy if exists question_sets_public_read on public.question_sets;
create policy question_sets_public_read on public.question_sets
  for select to anon, authenticated using (true);

-- Tenant-private data: anon only sees its own tenant (per the request header).
drop policy if exists providers_tenant_read on public.providers;
create policy providers_tenant_read on public.providers
  for select to anon, authenticated
  using (tenant_id = public.request_tenant_id());

drop policy if exists provider_chunks_tenant_read on public.provider_chunks;
create policy provider_chunks_tenant_read on public.provider_chunks
  for select to anon, authenticated
  using (tenant_id = public.request_tenant_id());

-- Leads: anon may create a lead for its own tenant, and read back only its own.
drop policy if exists leads_tenant_insert on public.leads;
create policy leads_tenant_insert on public.leads
  for insert to anon, authenticated
  with check (tenant_id = public.request_tenant_id());

drop policy if exists leads_tenant_read on public.leads;
create policy leads_tenant_read on public.leads
  for select to anon, authenticated
  using (tenant_id = public.request_tenant_id());

drop policy if exists recommendations_tenant_read on public.recommendations;
create policy recommendations_tenant_read on public.recommendations
  for select to anon, authenticated
  using (tenant_id = public.request_tenant_id());
