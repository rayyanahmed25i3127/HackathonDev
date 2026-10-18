# Relay — frontend handoff

This branch contains presentation and a browser-local demo adapter. There are no API routes, database migrations, auth implementation, scheduled jobs, provider SDKs, webhook handlers, or real credential inputs. Do not treat the demo as a completed backend.

## Boundaries

- Rayyan: `src/components/**`, `src/app/**`, shared presentation/types.
- Anas: Supabase Auth, workspace isolation/RLS, database model, lead ownership and assignment, response deadlines, scheduled escalation/recovery, authorization, input validation, concurrency and realtime.
- Muznna: provider OAuth/webhooks, CRM server endpoints, messaging, Stripe, Calendar, Telegram, deployment.
- `src/components/demo-provider.tsx` is the replacement point for the shared state and mutations. `src/lib/api.ts` proposes typed operation boundaries and paths; agree these with teammates before wiring. UI components currently do not call these endpoints.
- `src/lib/types.ts` defines frontend DTOs. Demo contacts and opportunities share one `Lead` projection so the UI is immediately navigable. The backend should model contacts, companies, leads, opportunities, and pipelines separately, then return this projection or adapt it centrally. One contact may have multiple opportunities; do not use the demo projection as a database schema.

## Server contract expectations

Use opaque IDs, UTC ISO timestamps, and version/ETag concurrency checks. Return amounts as integer minor units from the server and convert centrally for this demo's display values (the current local adapter uses USD major units). Do not reuse sample references as real provider IDs. Paginated lists return `{ items, total, nextCursor }`. Errors return `{ code, message, fieldErrors?, requestId? }` with appropriate HTTP status codes. Mutations need pending/success/failure feedback; use returned server records, not assumed success.

| UI                         | Proposed operation                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Overview                   | `GET /api/v1/workspace` (role-aware metrics and records)                                    |
| Leads / recovery           | `GET /api/v1/leads` with search, stage, ownerId, tag, source, date, recovery, cursor, limit |
| Create lead                | `POST /api/v1/leads`; server chooses exactly one eligible owner atomically                  |
| Acknowledge                | `POST /api/v1/leads/:id/acknowledge` (idempotent)                                           |
| Reassign                   | `POST /api/v1/leads/:id/reassign` (manual, separately counted)                              |
| Lead details               | `PATCH /api/v1/leads/:id`, `POST /api/v1/leads/:id/notes`                                   |
| CRM                        | `/api/v1/contacts`, `/api/v1/companies`, `/api/v1/opportunities`                            |
| Availability               | `PATCH /api/v1/team/:id/availability`; atomically reassign unacknowledged leads             |
| Rules / fields / stages    | `/api/v1/settings`; preserve relationships and stage requirements                           |
| Audit                      | `GET /api/v1/activity` with event type, actor, date and pagination; no edit/delete          |
| Messaging                  | `/api/integrations/twilio`; send/retry and delivery state; enforce opt-out                  |
| Payment link               | `/api/integrations/stripe`; create hosted checkout; webhook confirms collection             |
| Calendar                   | `/api/integrations/google`; consent, free/busy, appointments, reschedule, cancel            |
| Escalation alerts          | `/api/integrations/telegram`; per-user routing and bounded retries                          |
| Integration status/history | Server returns status, last success, direction, event reference, error and retry count      |

Frontend connection buttons are intentionally placeholders and always explain that no service was connected. The payment action never creates a fake checkout URL. Sign-in, sign-up, password reset, invitations, and outbound messages do not claim success. Calendar creation is explicitly local demo-only and checks sample conflicts. `calendar: true` in fixtures means a sample calendar, not an OAuth connection.

## Required production guarantees

Authenticate and scope every query by server session and workspace. Do not trust browser role selection or localStorage. Mask opportunity values on the server as well as in UI and exports. Supply a public workspace-specific form token/slug for lead capture; the demo `/capture` only writes to localStorage. Validate all fields and enforce rate limits, CSRF protection where appropriate, and API permissions. Never ship provider keys/tokens to the browser.

Assignment uses available employees below capacity. The demo round-robin choice is illustrative; persist a proper server-side pointer with locking. Production timers must survive restart, follow configured escalation levels/backup/manager and avoid duplicate transitions. Backend should emit realtime lead/message/payment/availability updates. For every important mutation, return an immutable audit event with actor, timestamp, target, and before/after values. UI timelines must use backend events once connected.

Time to first response is first assignment → first acknowledgement, not the most recent reassignment. Recovery includes overdue unacknowledged, at least two escalations, or idle beyond threshold (closed leads excluded from the idle category). Open value excludes Won/Lost; collected revenue uses verified paid events minus confirmed refunds, not unpaid requests. Demo records marked Paid/Refunded are fixtures, not webhook evidence.

## Demo and validation

The browser stores one fake workspace under `relay-demo-v1`. No secrets. Reset from Settings → Workspace. Role preview is available from the profile/workspace menu. Owner/Admin see company records; User sees Rayyan's records and configured User permissions. Manager is a permission profile, not a fourth base level.

Next integration work: agree relational DTOs, replace `DemoProvider`, implement Supabase sessions and realtime, then connect each provider separately. Keep failure isolation and show real connection/error states. Production end-to-end integration checks belong to those server workstreams.
