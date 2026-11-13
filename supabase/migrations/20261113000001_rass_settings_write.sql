grant update on public.clinic_settings to authenticated;

create policy "receptionist update clinic settings"
on public.clinic_settings for update to authenticated
using (public.current_staff_role() = 'receptionist')
with check (public.current_staff_role() = 'receptionist');
