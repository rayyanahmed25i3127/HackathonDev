# Clinic ERP migration plan

This branch converts the Relay sales CRM into a single-clinic ERP. The work is staged so the app remains buildable after each phase.

## RASS profile

RASS is a two-doctor outpatient clinic in Islamabad. Dr. Majid Hussain (R) handles dermatology and Dr. Maeirah Shafique (R) handles ophthalmology. The receptionist owns registration and booking; doctors maintain their own clinical notes and prescriptions. The current address is 3rd Floor, Plaza 95, Bunyad Plaza, Paradise Commercial Way, Phase 4 Bahria Town, Islamabad. Phone is provisional. Hours are 10:00–19:00, closed Friday and Sunday.

## Repository audit

| Area | Decision | Reason |
|---|---|---|
| `src/app/[[...slug]]/page.tsx`, `layout.tsx`, `error.tsx`, `globals.css`, `experimental-ui.css`, `icon.svg` | TRANSFORM | Keep the App Router shell, accessibility, and visual language; rebrand and replace CRM routes. |
| `src/components/ui/*`, `shared.tsx` | KEEP | Reusable accessible primitives. |
| `workspace.tsx`, `dashboard.tsx`, `leads.tsx`, `lead-detail.tsx`, `services.tsx`, `settings.tsx` | TRANSFORM | Reuse shell, list, drawer, calendar, inbox, audit, and settings patterns for clinic workflows. |
| `demo-provider.tsx`, `src/lib/demo.ts` | DELETE | Local sample data is forbidden for real clinic records. |
| `src/lib/types.ts`, `src/lib/api.ts` | TRANSFORM | Replace lead/sales projections with clinic types and server API contracts. |
| `src/lib/supabase/*` | KEEP/TRANSFORM | Retain authenticated server/browser clients and harden cookie sessions and role checks. |
| `src/lib/integrations/google-calendar.ts`, `google-oauth-state.ts`, `resend.ts`, `safepay.ts` | DELETE | Clinic scope removes Google, email alerts, and online payments. |
| `src/lib/notifications/*` | TRANSFORM | Reuse queue/retry mechanics for WhatsApp jobs. |
| `src/app/api/v1/leads`, `recovery`, `team`, `workspace`, `activity` | DELETE/TRANSFORM | Replace sales APIs with patients, visits, appointments, queue, and audit APIs. |
| `src/app/api/v1/payments/**`, `src/app/api/integrations/google/**`, `src/app/payments/**` | DELETE | Explicitly out of scope for the clinic. |
| `src/app/api/internal/notification-worker` | TRANSFORM | Become the protected WhatsApp worker. |
| `supabase/migrations/*` | DELETE/REPLACE | Existing migrations depend on undefined CRM tables; create a clean schema with RLS. |
| `tests/workspace.spec.ts` | TRANSFORM | Replace CRM tests with clinic queue, roles, appointments, and WhatsApp mock tests. |
| `docs/INTEGRATION.md` | DELETE/REWRITE | Replace with clinic architecture, WhatsApp setup, roles, and decisions docs. |
| `README.md`, `package.json`, `.gitignore` | TRANSFORM | Document the clinic app, env vars, commands, and generated-file exclusions. |

## Execution phases

1. Foundation: schema, RLS, auth/session, PKT/PKR helpers, rebrand, role-aware shell.
2. Core operations: patients, queue/visits, doctors, schedules, appointments, manual fees.
3. WhatsApp: mock/cloud provider, webhook, queue, templates, inbox, reminders.
4. Admin: staff, audit, dashboard, reports.
5. Clinical records: consultations, prescriptions, media and print views.
6. Hardening: tests, docs, secrets scan, dead-code removal and final build.
