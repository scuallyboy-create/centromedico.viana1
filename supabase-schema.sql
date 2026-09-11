-- VIANA I / ANA PAULA — SUPABASE V1
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin','doctor','nurse','technician','staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.employee_status as enum ('active','suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.schedule_status as enum ('on_duty','off','absent','leave');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'staff',
  employee_id text unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  role_title text,
  job_function text,
  category text,
  photo_url text,
  bio text,
  status public.employee_status not null default 'active',
  public_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  start_time time,
  end_time time,
  status public.schedule_status not null default 'on_duty',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, work_date)
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  patient_number text unique,
  full_name text not null,
  birth_date date,
  sex text,
  phone text,
  address text,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  appointment_date date not null,
  appointment_time time,
  service text,
  status text not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  record_date date not null default current_date,
  diagnosis text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  message_type text not null check(message_type in ('Sugestão','Reclamação')),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id boolean primary key default true,
  site_active boolean not null default true,
  suspension_message text not null default
    'Este website encontra-se temporariamente indisponível enquanto concluímos os últimos procedimentos administrativos do projeto.',
  updated_at timestamptz not null default now()
);

insert into public.site_settings(id) values(true)
on conflict(id) do nothing;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.profiles
    where id=auth.uid() and role='admin' and active=true
  );
$$;

create or replace function public.my_employee_id()
returns uuid
language sql stable security definer set search_path=public
as $$
  select id from public.employees where user_id=auth.uid() limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,full_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email))
  on conflict(id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.schedules enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.medical_records enable row level security;
alter table public.feedback enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_self on public.profiles
for select to authenticated
using(id=auth.uid() or public.is_admin());

create policy profiles_admin on public.profiles
for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy employees_public on public.employees
for select to anon,authenticated
using(public_visible=true);

create policy employees_admin on public.employees
for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy employees_self_update on public.employees
for update to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

create policy schedules_public on public.schedules
for select to anon,authenticated
using(exists(
  select 1 from public.employees e
  where e.id=employee_id and e.public_visible=true and e.status='active'
));

create policy schedules_owner on public.schedules
for all to authenticated
using(employee_id=public.my_employee_id() or public.is_admin())
with check(employee_id=public.my_employee_id() or public.is_admin());

create policy patients_admin on public.patients
for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy patients_owner_select on public.patients
for select to authenticated
using(created_by=auth.uid() or assigned_employee_id=public.my_employee_id());

create policy patients_insert on public.patients
for insert to authenticated
with check(created_by=auth.uid() and
  (assigned_employee_id=public.my_employee_id() or public.is_admin()));

create policy patients_update on public.patients
for update to authenticated
using(created_by=auth.uid() or assigned_employee_id=public.my_employee_id() or public.is_admin())
with check(created_by=auth.uid() or assigned_employee_id=public.my_employee_id() or public.is_admin());

create policy appointments_staff on public.appointments
for all to authenticated
using(employee_id=public.my_employee_id() or public.is_admin())
with check(employee_id=public.my_employee_id() or public.is_admin());

create policy medical_records_staff on public.medical_records
for all to authenticated
using(employee_id=public.my_employee_id() or public.is_admin())
with check(employee_id=public.my_employee_id() or public.is_admin());

create policy feedback_public_insert on public.feedback
for insert to anon,authenticated with check(true);

create policy feedback_admin on public.feedback
for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy site_public_read on public.site_settings
for select to anon,authenticated using(true);

create policy site_admin on public.site_settings
for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy audit_admin on public.audit_logs
for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create index if not exists idx_emp_status on public.employees(status);
create index if not exists idx_emp_category on public.employees(category);
create index if not exists idx_schedule_date on public.schedules(work_date);
create index if not exists idx_patients_employee on public.patients(assigned_employee_id);

-- Depois de criar o primeiro utilizador em Authentication > Users:
-- update public.profiles set role='admin', active=true where id='UUID_DO_UTILIZADOR';
