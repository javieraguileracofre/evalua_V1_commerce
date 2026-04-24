create extension if not exists "uuid-ossp";

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

alter table public.customers_master enable row level security;
alter table public.suppliers_master enable row level security;

drop policy if exists "customers_owner_select" on public.customers_master;
create policy "customers_owner_select"
on public.customers_master for select
using (auth.uid() = owner_id);

drop policy if exists "customers_owner_insert" on public.customers_master;
create policy "customers_owner_insert"
on public.customers_master for insert
with check (auth.uid() = owner_id);

drop policy if exists "customers_owner_update" on public.customers_master;
create policy "customers_owner_update"
on public.customers_master for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "suppliers_owner_select" on public.suppliers_master;
create policy "suppliers_owner_select"
on public.suppliers_master for select
using (auth.uid() = owner_id);

drop policy if exists "suppliers_owner_insert" on public.suppliers_master;
create policy "suppliers_owner_insert"
on public.suppliers_master for insert
with check (auth.uid() = owner_id);

drop policy if exists "suppliers_owner_update" on public.suppliers_master;
create policy "suppliers_owner_update"
on public.suppliers_master for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

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

drop trigger if exists trg_customers_owner on public.customers_master;
create trigger trg_customers_owner
before insert on public.customers_master
for each row execute function public.set_owner_id();

drop trigger if exists trg_suppliers_owner on public.suppliers_master;
create trigger trg_suppliers_owner
before insert on public.suppliers_master
for each row execute function public.set_owner_id();
