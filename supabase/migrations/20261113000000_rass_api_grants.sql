-- Supabase creates tables without granting Data API privileges to authenticated.
-- RLS still controls which rows each staff member may access.
grant usage on schema public to authenticated;

grant select on public.profiles,
  public.doctors,
  public.doctor_schedules,
  public.doctor_time_off,
  public.service_types,
  public.clinic_settings to authenticated;

grant select, insert, update on public.patients,
  public.appointments,
  public.visits to authenticated;

grant select on public.visit_status_events to authenticated;
