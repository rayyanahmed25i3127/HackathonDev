create extension if not exists pgcrypto;

create type public.staff_role as enum ('doctor', 'receptionist');
create type public.doctor_specialty as enum ('dermatology', 'ophthalmology');
create type public.appointment_status as enum ('booked', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');
create type public.visit_status as enum ('pending', 'waiting', 'in_consultation', 'done', 'cancelled', 'no_show');
create type public.fee_status as enum ('unpaid', 'paid', 'waived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.staff_role not null default 'receptionist',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id),
  specialty public.doctor_specialty not null,
  display_name text not null,
  qualifications text,
  registration_no text,
  slot_minutes integer not null default 15 check (slot_minutes between 5 and 240),
  max_patients_per_day integer check (max_patients_per_day is null or max_patients_per_day > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doctor_schedules (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  unique (doctor_id, weekday),
  check (end_time > start_time)
);

create table public.doctor_time_off (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  check (end_date >= start_date)
);

create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  specialty public.doctor_specialty,
  name text not null,
  default_minutes integer not null default 30 check (default_minutes > 0),
  default_fee_paisa integer check (default_fee_paisa is null or default_fee_paisa >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create sequence public.patient_mrn_seq start 1;
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  mrn text not null unique default ('P-' || lpad(nextval('public.patient_mrn_seq')::text, 6, '0')),
  full_name text not null,
  guardian_name text,
  gender text check (gender in ('male', 'female', 'other')),
  date_of_birth date,
  age_years integer check (age_years is null or age_years between 0 and 130),
  phone text not null,
  phone_alt text,
  whatsapp_number text not null,
  whatsapp_opt_in boolean not null default false,
  whatsapp_opt_in_at timestamptz,
  whatsapp_opted_out_at timestamptz,
  cnic text unique check (cnic is null or cnic ~ '^[0-9]{5}-[0-9]{7}-[0-9]$'),
  city text,
  address text,
  referred_by text,
  internal_notes text,
  is_archived boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_of_birth is not null or age_years is not null)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  doctor_id uuid not null references public.doctors(id),
  service_type_id uuid not null references public.service_types(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.appointment_status not null default 'booked',
  reason text,
  notes text,
  cancelled_reason text,
  reminder_sent_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  doctor_id uuid not null references public.doctors(id),
  appointment_id uuid references public.appointments(id),
  visit_date date not null,
  token_number integer not null check (token_number > 0),
  service_type_id uuid not null references public.service_types(id),
  reason text,
  status public.visit_status not null default 'pending',
  status_changed_at timestamptz not null default now(),
  status_changed_by uuid references public.profiles(id),
  checked_in_at timestamptz,
  consultation_started_at timestamptz,
  completed_at timestamptz,
  follow_up_date date,
  follow_up_note text,
  fee_amount_paisa integer check (fee_amount_paisa is null or fee_amount_paisa >= 0),
  fee_status public.fee_status not null default 'unpaid',
  fee_note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doctor_id, visit_date, token_number)
);

create table public.visit_status_events (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  from_status public.visit_status,
  to_status public.visit_status not null,
  changed_by uuid not null references public.profiles(id),
  changed_at timestamptz not null default now()
);

create table public.clinic_settings (
  id boolean primary key default true check (id),
  name text not null default 'RASS',
  address text not null default '3rd Floor, Plaza 95, Bunyad Plaza, Paradise Commercial Way, Phase 4 Bahria Town, Islamabad',
  phone text default '03199789989',
  timezone text not null default 'Asia/Karachi',
  opening_time time not null default '10:00',
  closing_time time not null default '19:00',
  closed_weekdays integer[] not null default '{5,0}',
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  actor_role public.staff_role not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$ declare t text; begin
  foreach t in array array['profiles','doctors','patients','appointments','visits','clinic_settings'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'set_' || t || '_updated_at', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.doctor_schedules enable row level security;
alter table public.doctor_time_off enable row level security;
alter table public.service_types enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.visits enable row level security;
alter table public.visit_status_events enable row level security;
alter table public.clinic_settings enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_staff_role() returns public.staff_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create policy "active staff read profiles" on public.profiles for select to authenticated using (is_active);
create policy "staff read clinic data" on public.doctors for select to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy "staff read schedules" on public.doctor_schedules for select to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy "staff read time off" on public.doctor_time_off for select to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy "staff read services" on public.service_types for select to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy "staff manage patients" on public.patients for all to authenticated using (public.current_staff_role() in ('doctor','receptionist')) with check (public.current_staff_role() in ('doctor','receptionist'));
create policy "staff manage appointments" on public.appointments for all to authenticated using (public.current_staff_role() in ('doctor','receptionist')) with check (public.current_staff_role() in ('doctor','receptionist'));
create policy "staff manage visits" on public.visits for all to authenticated using (public.current_staff_role() in ('doctor','receptionist')) with check (public.current_staff_role() in ('doctor','receptionist'));
create policy "staff read status events" on public.visit_status_events for select to authenticated using (public.current_staff_role() in ('doctor','receptionist'));
create policy "staff read settings" on public.clinic_settings for select to authenticated using (public.current_staff_role() in ('doctor','receptionist'));
create policy "no direct audit mutation" on public.audit_log for select to authenticated using (false);
revoke update, delete on public.audit_log from authenticated;

insert into public.clinic_settings (id) values (true) on conflict (id) do nothing;
