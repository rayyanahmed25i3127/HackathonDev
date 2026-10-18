# Relay

A polished frontend for the hackathon's unified business management platform. Built on the **rayyan** branch for Person 2's UI/UX workstream.

## Run

Requires Node.js 20.9+ (validated with Node 24) and npm.

```bash
npm ci
npm run dev
```

If your cloud machine's default npm cache is not writable, use `npm ci --cache /tmp/relay-npm-cache`.

```bash
npm run typecheck
npm run build
npm start
npm run test:e2e
```

Browser tests use system Chromium when available, otherwise Playwright’s managed Chromium (`npx playwright install chromium`). Override the path with `PLAYWRIGHT_CHROMIUM_PATH` if needed. Do not run `next build` and `next dev` concurrently against the same `.next` directory.

## Included

- Overview with record-derived KPIs, Recharts trend chart, pipeline values, recovery, availability, appointments and collected-payment samples.
- Searchable/filterable/paginated lead and contact views, CSV export, saved dynamic lists.
- Pipeline board with drag/drop and keyboard-accessible stage selectors, stage requirements, and two field-set contexts.
- Customer drawer with ownership, response countdown, acknowledgement, reassignment, editable fields, notes, activity, conversations, payments, appointments, and safe local deletion.
- Recovery queue with explicit reasons; team availability and capacity management, including local reassignment on leave/offline.
- Conversation inbox, delivery/failure/opt-out states, payments, calendar booking/conflict checks/rescheduling/cancellation, integration status and setup placeholders.
- Workspace, assignment, stages, custom fields (five types), permission profiles and notification settings; read-only audit history.
- Responsive navigation, keyboard search (`Ctrl/Cmd+K`), accessible Radix dialogs, feedback toasts, empty/loading/error states and reduced-motion support.
- Sign-in, sign-up, password-reset previews and a public lead-capture demo. No public marketing site.

## Stack

Next.js App Router · React · TypeScript · Tailwind CSS 4 · shadcn-style Radix/CVA primitives · Lucide React · Recharts · Motion.

## Demo boundaries

**Frontend only.** All sample records and changes live in browser localStorage. No real authentication, database persistence, background escalation, realtime service, messages, invitations, payment links, Google events, or provider connections are implemented. Every external action is labeled accordingly. No credentials are needed or accepted by this frontend. Reset local data in Settings → Workspace.

See [backend handoff](docs/INTEGRATION.md) and [typed API boundaries](src/lib/api.ts) for Anas and Muznna's integration points. The relational backend should keep contacts/opportunities separate; the local adapter uses a shared projection for demonstration.

The attached reference-image URLs were inaccessible; the implementation follows the written premium SaaS CRM direction with a sage palette and consistent layouts.
