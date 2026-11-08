# RASS staff setup

Create three users in Supabase Authentication before running `supabase/seed.sql`:

1. `dr.majid@rass.clinic` — Lt. Col. Dr. Majid Hussain (R)
2. `dr.maeirah@rass.clinic` — Lt. Col. Dr. Maeirah Shafique (R)
3. `reception@rass.clinic` — RASS Reception

Use temporary passwords and require a password reset where appropriate. The seed script links these Auth users to `profiles` and creates the two doctor records. No password is stored in the repository.

The current schedule is 10:00–19:00, Monday–Thursday and Saturday. Friday and Sunday are closed. The phone number and hours are clinic settings and can be changed later.
