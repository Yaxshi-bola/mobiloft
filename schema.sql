-- =============================================================
-- MOBILOFT — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. ORDERS TABLE
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text unique not null,
  customer_name text not null,
  phone text,
  model text not null,
  issue text,
  status text not null default 'qabul',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_order_id_idx on public.orders (order_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_customer_name_idx on public.orders (customer_name);

-- 2. BANNERS TABLE
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cta_text text,
  cta_link text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists banners_enabled_idx on public.banners (enabled);

-- 3. ADMINS TABLE
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  telegram_id text unique not null,
  role text not null default 'admin',  -- 'super_admin' | 'admin'
  name text,
  created_at timestamptz not null default now()
);

-- Insert Super Admin (your Telegram ID)
insert into public.admins (telegram_id, role, name)
values ('8544023815', 'super_admin', 'Super Admin')
on conflict (telegram_id) do nothing;

-- 4. SETTINGS TABLE (single row)
create table if not exists public.settings (
  id int primary key default 1,
  cleanup_days int not null default 30,
  contact_phone text default '+998 90 123 45 67',
  contact_address text default 'Toshkent, Chilonzor',
  contact_telegram text default 'mobiloft_admin',
  updated_at timestamptz default now()
);

-- Ensure single settings row
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- 5. ROW LEVEL SECURITY
alter table public.orders enable row level security;
alter table public.banners enable row level security;
alter table public.admins enable row level security;
alter table public.settings enable row level security;

-- Public read (for anon key — customer view reads via anon)
create policy "Public read orders" on public.orders for select using (true);
create policy "Public read banners" on public.banners for select using (true);
create policy "Public read settings" on public.settings for select using (true);

-- Only authenticated/anon can insert/update/delete (you'll secure this via service role or admin check)
-- For now, allow anon to write (replace with proper auth in production)
create policy "Public write orders" on public.orders for all using (true) with check (true);
create policy "Public write banners" on public.banners for all using (true) with check (true);
create policy "Public write settings" on public.settings for all using (true) with check (true);

-- IMPORTANT: In production, you should:
-- 1. Disable public write policies above
-- 2. Create an Edge Function that validates Telegram WebApp initData
-- 3. Use service role key for admin operations
-- 4. Or implement RLS policies that check telegram_id against admins table

-- 6. CLEANUP FUNCTION (optional — for scheduled cron)
create or replace function public.cleanup_old_orders(days_threshold int)
returns int
language plpgsql
as $$
declare
  deleted_count int;
begin
  with deleted as (
    delete from public.orders
    where status = 'topshirildi'
      and created_at < (now() - (days_threshold || ' days')::interval)
    returning id
  )
  select count(*) into deleted_count from deleted;
  return deleted_count;
end;
$$;

-- 7. SAMPLE DATA (optional)
-- insert into public.orders (order_id, customer_name, phone, model, issue, status, note)
-- values
--   ('MLF-2045', 'Ali Valiyev', '+998 90 123 45 67', 'iPhone 13 Pro Max', 'Ekran singan', 'tamil', 'Ustada'),
--   ('MLF-2046', 'Dilshod Karimov', '+998 91 234 56 78', 'iPhone 14 Pro', 'Batareya', 'qabul', '');

-- insert into public.banners (title, cta_text, cta_link, enabled)
-- values ('📢 Ekran almashtirishga 20% chegirma', 'Batafsil', '', true);

-- =============================================================
-- DONE. The app should now work with your Supabase project.
-- Replace 'your-anon-key' in app.js with the actual anon key.
-- =============================================================
