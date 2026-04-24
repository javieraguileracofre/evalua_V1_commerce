-- Habilitar extension UUID
create extension if not exists "uuid-ossp";

-- Perfiles de usuario
create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  rut text not null default '',
  phone text not null default '',
  company text,
  role text not null default 'seller' check (role in ('admin', 'seller', 'viewer')),
  created_at timestamptz not null default now()
);

alter table public.users_profile add column if not exists first_name text not null default '';
alter table public.users_profile add column if not exists last_name text not null default '';
alter table public.users_profile add column if not exists rut text not null default '';
alter table public.users_profile add column if not exists phone text not null default '';
alter table public.users_profile add column if not exists company text;

-- Inventario
create table if not exists public.inventory_items (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sku text not null,
  name text not null,
  category text,
  stock integer not null default 0,
  cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Publicaciones de venta
create table if not exists public.sales_posts (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  title text not null,
  description text,
  sale_price numeric(12,2) not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'paused')),
  created_at timestamptz not null default now()
);

-- Maestros PRO: clientes
create table if not exists public.customers_master (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  rut text,
  email text,
  phone text,
  address text,
  contact_name text,
  payment_terms text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- Maestros PRO: proveedores
create table if not exists public.suppliers_master (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  rut text,
  email text,
  phone text,
  address text,
  contact_name text,
  payment_terms text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.users_profile enable row level security;
alter table public.inventory_items enable row level security;
alter table public.sales_posts enable row level security;
alter table public.customers_master enable row level security;
alter table public.suppliers_master enable row level security;

-- Perfil: cada usuario ve/edita solo su perfil
create policy "users_profile_self_select"
on public.users_profile for select
using (auth.uid() = id);

create policy "users_profile_self_insert"
on public.users_profile for insert
with check (auth.uid() = id);

create policy "users_profile_self_update"
on public.users_profile for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Crear perfil automaticamente cuando se crea un usuario en auth.users
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users_profile (id, email, role, first_name, last_name, rut, phone, company)
  values (
    new.id,
    coalesce(new.email, ''),
    'seller',
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'rut', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'company', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    rut = excluded.rut,
    phone = excluded.phone,
    company = excluded.company;
  return new;
end;
$$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Inventario: cada usuario administra lo suyo
create policy "inventory_owner_select"
on public.inventory_items for select
using (auth.uid() = owner_id);

create policy "inventory_owner_insert"
on public.inventory_items for insert
with check (auth.uid() = owner_id);

create policy "inventory_owner_update"
on public.inventory_items for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- Sales posts: cada usuario administra lo suyo
create policy "sales_owner_select"
on public.sales_posts for select
using (auth.uid() = owner_id);

create policy "sales_owner_insert"
on public.sales_posts for insert
with check (auth.uid() = owner_id);

create policy "sales_owner_update"
on public.sales_posts for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- Maestros clientes: cada usuario administra lo suyo
create policy "customers_owner_select"
on public.customers_master for select
using (auth.uid() = owner_id);

create policy "customers_owner_insert"
on public.customers_master for insert
with check (auth.uid() = owner_id);

create policy "customers_owner_update"
on public.customers_master for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- Maestros proveedores: cada usuario administra lo suyo
create policy "suppliers_owner_select"
on public.suppliers_master for select
using (auth.uid() = owner_id);

create policy "suppliers_owner_insert"
on public.suppliers_master for insert
with check (auth.uid() = owner_id);

create policy "suppliers_owner_update"
on public.suppliers_master for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- Trigger para completar owner_id desde auth.uid()
create or replace function public.set_owner_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_inventory_owner on public.inventory_items;
create trigger trg_inventory_owner
before insert on public.inventory_items
for each row execute function public.set_owner_id();

drop trigger if exists trg_sales_owner on public.sales_posts;
create trigger trg_sales_owner
before insert on public.sales_posts
for each row execute function public.set_owner_id();

drop trigger if exists trg_customers_owner on public.customers_master;
create trigger trg_customers_owner
before insert on public.customers_master
for each row execute function public.set_owner_id();

drop trigger if exists trg_suppliers_owner on public.suppliers_master;
create trigger trg_suppliers_owner
before insert on public.suppliers_master
for each row execute function public.set_owner_id();
