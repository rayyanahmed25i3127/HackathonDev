-- RASS development seed. Create the three Auth users first in
-- Supabase Dashboard -> Authentication -> Users, then set these emails.
-- This file contains no passwords or secrets.

insert into public.clinic_settings (id, name, address, phone, timezone, opening_time, closing_time, closed_weekdays)
values (
  true,
  'RASS',
  '3rd Floor, Plaza 95, Bunyad Plaza, Paradise Commercial Way, Phase 4 Bahria Town, Islamabad',
  '03199789989',
  'Asia/Karachi',
  '10:00',
  '19:00',
  '{5,0}'
)
on conflict (id) do update set name = excluded.name, address = excluded.address, phone = excluded.phone,
  timezone = excluded.timezone, opening_time = excluded.opening_time, closing_time = excluded.closing_time,
  closed_weekdays = excluded.closed_weekdays;

insert into public.service_types (specialty, name, default_minutes, default_fee_paisa)
select * from (values
  ('dermatology'::public.doctor_specialty, 'Dermatology consultation', 30, null::integer),
  ('dermatology'::public.doctor_specialty, 'Hair loss consultation', 30, null::integer),
  ('dermatology'::public.doctor_specialty, 'PRP session', 60, null::integer),
  ('dermatology'::public.doctor_specialty, 'Hair transplant', 120, null::integer),
  ('ophthalmology'::public.doctor_specialty, 'Ophthalmology consultation', 30, null::integer),
  ('ophthalmology'::public.doctor_specialty, 'Eye exam / refraction', 30, null::integer),
  (null::public.doctor_specialty, 'Follow-up', 20, null::integer),
  (null::public.doctor_specialty, 'Procedure', 60, null::integer)
) as services(specialty, name, default_minutes, default_fee_paisa)
where not exists (select 1 from public.service_types existing where existing.name = services.name);

-- Replace these email addresses with the actual Auth users before running this section.
insert into public.profiles (id, full_name, role, phone)
select u.id, v.full_name, v.role::public.staff_role, v.phone
from auth.users u
join (values
  ('dr.majid@rass.clinic', 'Lt. Col. Dr. Majid Hussain (R)', 'doctor', null),
  ('dr.maeirah@rass.clinic', 'Lt. Col. Dr. Maeirah Shafique (R)', 'doctor', null),
  ('reception@rass.clinic', 'RASS Reception', 'receptionist', '03199789989')
) as v(email, full_name, role, phone) on lower(u.email) = lower(v.email)
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role, phone = excluded.phone, is_active = true;

insert into public.doctors (profile_id, specialty, display_name, qualifications)
select p.id, v.specialty::public.doctor_specialty, v.display_name, v.qualifications
from public.profiles p
join (values
  ('Lt. Col. Dr. Majid Hussain (R)', 'dermatology', 'Dr. Majid Hussain', 'Lt. Col. (R), Dermatology'),
  ('Lt. Col. Dr. Maeirah Shafique (R)', 'ophthalmology', 'Dr. Maeirah Shafique', 'Lt. Col. (R), Ophthalmology')
) as v(profile_name, specialty, display_name, qualifications) on lower(p.full_name) = lower(v.profile_name)
on conflict (profile_id) do update set specialty = excluded.specialty, display_name = excluded.display_name, qualifications = excluded.qualifications, is_active = true;

insert into public.doctor_schedules (doctor_id, weekday, start_time, end_time)
select d.id, weekday, '10:00', '19:00'
from public.doctors d
cross join generate_series(1, 4) as weekdays(weekday)
on conflict (doctor_id, weekday) do update set start_time = excluded.start_time, end_time = excluded.end_time;

insert into public.doctor_schedules (doctor_id, weekday, start_time, end_time)
select d.id, 6, '10:00', '19:00'
from public.doctors d
on conflict (doctor_id, weekday) do update set start_time = excluded.start_time, end_time = excluded.end_time;
