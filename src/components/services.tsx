'use client';
import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Send,
  CheckCheck,
  AlertCircle,
  Search,
  Plus,
  ArrowUpRight,
  Wallet,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Video,
  ExternalLink,
  RefreshCw,
  Plug,
  Link2,
  ShieldCheck,
  Bell,
  ArrowDownLeft,
  ArrowUpRight as Outbound,
  XCircle,
  Check,
  Settings2,
  LockKeyhole,
  Copy,
  Download,
} from 'lucide-react';
import { useDemo } from './demo-provider';
import { supabase } from '@/lib/supabase/browser';
import Link from 'next/link';
import {
  Avatar,
  Badge,
  Empty,
  Field,
  Owner,
  PageHeading,
  Panel,
  SearchInput,
  Select,
  Value,
  Stat,
} from './shared';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { currency, relative } from '@/lib/types';
export function ConversationsPage() {
  const { data, visibleLeads, notify, select } = useDemo();
  const [search, setSearch] = useState('');
  const [id, setId] = useState(data.messages[0]?.leadId || '');
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('all');
  const contacts = visibleLeads.filter(
    (l) =>
      (data.messages.some((m) => m.leadId === l.id) || l.source === 'WhatsApp') &&
      `${l.name} ${l.company}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'failed' &&
          data.messages.some((m) => m.leadId === l.id && m.status === 'Failed')) ||
        (filter === 'mine' && l.ownerId === 'rayyan')),
  );
  const lead = contacts.find((l) => l.id === id) || contacts[0];
  const messages = lead ? data.messages.filter((m) => m.leadId === lead.id) : [];
  return (
    <>
      <PageHeading
        eyebrow="CUSTOMER CONVERSATIONS"
        title="Stay close to your customers."
        description="One conversation. All the context. No switching tabs."
      />
      <div className="conversation-layout">
        <aside className="conversation-list">
          <div className="conversation-list-head">
            <h2>
              Inbox<Badge>{contacts.length}</Badge>
            </h2>
            <SearchInput value={search} onChange={setSearch} placeholder="Search conversations…" />
            <div className="inbox-tabs">
              {[
                ['all', 'All'],
                ['mine', 'Mine'],
                ['failed', 'Failed'],
              ].map(([v, l]) => (
                <button
                  key={v}
                  className={filter === v ? 'active' : ''}
                  onClick={() => setFilter(v)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="mobile-conversation-picker">
            <label className="sr-only" htmlFor="conversation-picker">
              Choose conversation
            </label>
            <select
              id="conversation-picker"
              value={lead?.id || ''}
              onChange={(e) => setId(e.target.value)}
            >
              {contacts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.company}
                </option>
              ))}
            </select>
          </div>
          {contacts.map((l) => {
            const last = data.messages.filter((m) => m.leadId === l.id).at(-1);
            return (
              <button
                className={`conversation-preview ${lead?.id === l.id ? 'active' : ''}`}
                key={l.id}
                onClick={() => setId(l.id)}
              >
                <Avatar name={l.name} color={l.optedOut ? 'amber' : 'teal'} />
                <div className="grow">
                  <div>
                    <strong>{l.name}</strong>
                    <small>{last ? relative(last.time) : 'New'}</small>
                  </div>
                  <p>{last?.text || 'No messages yet'}</p>
                  <span className="channel-label">
                    <MessageSquare size={10} />
                    WhatsApp{l.optedOut ? ' · Opted out' : ''}
                  </span>
                </div>
              </button>
            );
          })}
          {!contacts.length && <Empty title="No conversations" text="Try another search." />}
        </aside>
        <section className="conversation-main">
          {lead ? (
            <>
              <div className="conversation-header">
                <Avatar name={lead.name} />
                <div className="grow">
                  <button className="text-link" onClick={() => select(lead.id)}>
                    {lead.name}
                    <ArrowUpRight size={13} />
                  </button>
                  <p>
                    {lead.company} · {lead.phone}
                  </p>
                </div>
                <Owner id={lead.ownerId} />
              </div>
              <div className="conversation-status">
                <span className="tiny-dot amber-dot" />
                Conversation history · Messaging not connected
              </div>
              <div className="chat-content">
                <div className="chat-date">MESSAGE HISTORY</div>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`chat-message ${m.direction === 'out' ? 'sent' : 'received'}`}
                  >
                    <div>
                      <p>{m.text}</p>
                      <span>
                        {new Date(m.time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {m.direction === 'out' && <CheckCheck size={12} />} · {m.status}
                      </span>
                    </div>
                    {m.status === 'Failed' && (
                      <div className="message-failure">
                        <AlertCircle size={12} />
                        {m.error || 'Provider could not deliver this message.'}
                        <button
                          onClick={() =>
                            notify(
                              'Reconnect messaging to retry. The message was not sent.',
                              'info',
                            )
                          }
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {!messages.length && (
                  <Empty title="A fresh start" text="Connect Twilio to begin this conversation." />
                )}
              </div>
              {lead.optedOut && (
                <div className="inline-error">
                  <LockKeyhole size={14} />
                  This contact has opted out. You cannot send messages.
                </div>
              )}
              <form
                className="chat-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  notify(
                    'Twilio is not connected. No message was sent. Connect the provider through your backend.',
                    'info',
                  );
                }}
              >
                <label className="sr-only" htmlFor="message-draft">
                  Message draft
                </label>
                <textarea
                  id="message-draft"
                  disabled={lead.optedOut}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    lead.optedOut ? 'Messaging disabled — contact opted out' : 'Write a message…'
                  }
                  rows={2}
                />
                <div>
                  <span>Sandbox: recipients must join before receiving messages.</span>
                  <Button size="sm" disabled={lead.optedOut || !draft.trim()}>
                    <Send size={14} />
                    Send
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <Empty
              title="Select a conversation"
              text="Your customer conversations will appear here."
            />
          )}
        </section>
      </div>
    </>
  );
}
export function PaymentsPage({ onCreate }: { onCreate: () => void }) {
  const { data, visibleLeads, select, can } = useDemo();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const payments = data.payments.filter((p) => visibleLeads.some((l) => l.id === p.leadId));
  const list = payments.filter(
    (p) =>
      (status === 'all' || p.status === status) &&
      `${p.id} ${visibleLeads.find((l) => l.id === p.leadId)?.name} ${p.reference}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const sum = (s: string) =>
    payments
      .filter(
        (p) =>
          p.status === s &&
          (s !== 'Paid' ||
            (new Date(p.time).getMonth() === new Date().getMonth() &&
              new Date(p.time).getFullYear() === new Date().getFullYear())),
      )
      .reduce((n, p) => n + p.amount, 0);
  return (
    <>
      <PageHeading
        eyebrow="PAYMENTS"
        title="A clearer view of cash flow."
        description="Payment requests and collected revenue, clearly separated."
      >
        <Button onClick={onCreate} disabled={!can('create')}>
          <Plus size={16} />
          Request payment
        </Button>
      </PageHeading>
      <div className="integration-hint standalone">
        <Wallet size={18} />
        <p>
          <strong>Payments workspace.</strong> Connect Stripe to process transactions.
          Connect Stripe to create hosted checkout links and receive verified payment events.
        </p>
      </div>
      <div className="stats-grid three">
        <Stat
          title="Collected · this month"
          value={can('values') ? currency(sum('Paid')) : '••••'}
          sub="Confirmed payments"
          icon={<Wallet size={17} />}
          onClick={() => setStatus('Paid')}
        />
        <Stat
          title="Awaiting payment"
          value={can('values') ? currency(sum('Pending')) : '••••'}
          sub="Pending requests, not collected"
          icon={<Clock3 size={17} />}
          onClick={() => setStatus('Pending')}
        />
        <Stat
          title="Refunded"
          value={can('values') ? currency(sum('Refunded')) : '••••'}
          sub="Refunded transactions"
          icon={<RefreshCw size={17} />}
          onClick={() => setStatus('Refunded')}
        />
      </div>
      <Panel title="Payment activity" description="The whole journey, from request to receipt.">
        <div className="table-toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Search payments…" />
          <Select
            label="All statuses"
            value={status}
            onChange={setStatus}
            all
            options={['Paid', 'Pending', 'Failed', 'Expired', 'Abandoned', 'Refunded'].map((s) => ({
              value: s,
              label: s,
            }))}
          />
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Payment</th>
                <th>Customer / opportunity</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Requested by</th>
                <th>Provider reference</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const l = visibleLeads.find((l) => l.id === p.leadId);
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="id-text">{p.id}</span>
                    </td>
                    <td>
                      <button className="record-person" onClick={() => select(p.leadId)}>
                        <Avatar name={l?.name || 'Customer'} small />
                        <span>
                          <strong>{l?.name}</strong>
                          <small>{l?.company}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <Value amount={p.amount} /> <small className="muted">{p.currency}</small>
                    </td>
                    <td>
                      <Badge
                        tone={
                          p.status === 'Paid'
                            ? 'green'
                            : p.status === 'Failed'
                              ? 'red'
                              : p.status === 'Pending'
                                ? 'amber'
                                : 'neutral'
                        }
                        dot
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td>
                      <Owner id={p.requestedBy} />
                    </td>
                    <td>
                      <code className="reference">{p.reference}</code>
                    </td>
                    <td className="muted">
                      {new Date(p.time).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Empty title="No matching payments" text="Try another status or customer name." />
        )}
        <div className="panel-foot">
          <ShieldCheck size={13} />
          Card details belong on Stripe’s hosted checkout. Never in this workspace.
        </div>
      </Panel>
    </>
  );
}
export function CalendarPage({
  onCreate,
  onEdit,
}: {
  onCreate: () => void;
  onEdit: (id: string) => void;
}) {
  const { data, visibleLeads, setData, notify, log, can } = useDemo();
  const [owner, setOwner] = useState('all');
  const [offset, setOffset] = useState(0);
  const [cancel, setCancel] = useState<string | null>(null);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offset);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86400000));
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const list = data.appointments.filter(
    (a) => visibleLeads.some((l) => l.id === a.leadId) && (owner === 'all' || a.ownerId === owner),
  );
  return (
    <>
      <PageHeading
        eyebrow="APPOINTMENTS"
        title="Make time for what matters."
        description={`Customer appointments, in one place. Displaying times in ${tz}.`}
      >
        <Button onClick={onCreate} disabled={!can('create')}>
          <Plus size={16} />
          Book appointment
        </Button>
      </PageHeading>
      <div className="calendar-toolbar">
        <div>
          <h2>{start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          <Button variant="secondary" size="sm" onClick={() => setOffset(0)}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous week"
            onClick={() => setOffset(offset - 7)}
          >
            <ChevronLeft size={17} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next week"
            onClick={() => setOffset(offset + 7)}
          >
            <ChevronRight size={17} />
          </Button>
        </div>
        <Select
          label="All employees"
          value={owner}
          onChange={setOwner}
          all
          options={data.team.map((t) => ({ value: t.id, label: t.name }))}
        />
      </div>
      <div className="calendar-week">
        {days.map((d) => {
          const dayItems = list.filter(
            (a) => new Date(a.start).toDateString() === d.toDateString(),
          );
          return (
            <div
              className={`calendar-day ${d.toDateString() === new Date().toDateString() ? 'today' : ''}`}
              key={d.toISOString()}
            >
              <div className="calendar-day-heading">
                <span>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <strong>{d.getDate()}</strong>
                {d.toDateString() === new Date().toDateString() && <i />}
              </div>
              <div className="calendar-day-content">
                {dayItems.map((a, i) => (
                  <button
                    className={`calendar-event event-${i % 3} ${a.status === 'Cancelled' ? 'cancelled' : ''}`}
                    key={a.id}
                    onClick={() => onEdit(a.id)}
                  >
                    <span>
                      {new Date(a.start).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    <strong>{a.title}</strong>
                    <small>{visibleLeads.find((l) => l.id === a.leadId)?.name}</small>
                    <span>
                      <Clock3 size={10} />
                      {a.duration}m · {a.status === 'Cancelled' ? 'Cancelled' : a.location}
                    </span>
                  </button>
                ))}
                {!dayItems.length && <span className="calendar-no-events">No appointments</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="integration-hint standalone">
        <CalendarDays size={17} />
        <p>
          Google Calendar is not connected. Calendar availability and appointments shown are local
          records are not synchronized. <Link href="/integrations">Connect Google Calendar</Link> to create real events.
        </p>
      </div>
      <Panel title="Appointment details" description="Keep every customer commitment in sight.">
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Appointment</th>
                <th>Customer</th>
                <th>Employee</th>
                <th>When</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.title}</strong>
                    <small className="block-muted">
                      {a.location} · {a.duration} minutes
                    </small>
                  </td>
                  <td>{visibleLeads.find((l) => l.id === a.leadId)?.name}</td>
                  <td>
                    <Owner id={a.ownerId} />
                  </td>
                  <td>{new Date(a.start).toLocaleString()}</td>
                  <td>
                    <Badge tone={a.status === 'Scheduled' ? 'green' : 'neutral'}>{a.status}</Badge>
                  </td>
                  <td>
                    <div className="inline-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={a.status === 'Cancelled' || !can('edit')}
                        onClick={() => onEdit(a.id)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={a.status === 'Cancelled' || !can('edit')}
                        onClick={() => setCancel(a.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Empty
            title="No appointments yet"
            text="Book your first customer meeting to get started."
          />
        )}
      </Panel>
      <Dialog
        open={!!cancel}
        onOpenChange={(v) => {
          if (!v) setCancel(null);
        }}
        title="Cancel this appointment?"
        description="This changes the local demo record. A connected backend must also update Google Calendar."
      >
        <div className="dialog-footer">
          <Button variant="secondary" onClick={() => setCancel(null)}>
            Keep appointment
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const a = data.appointments.find((a) => a.id === cancel);
              setData((d) => ({
                ...d,
                appointments: d.appointments.map((a) =>
                  a.id === cancel ? { ...a, status: 'Cancelled' } : a,
                ),
              }));
              log('Appointment', 'Cancelled an appointment.', a?.leadId);
              notify('Appointment cancelled.');
              setCancel(null);
            }}
          >
            Cancel appointment
          </Button>
        </div>
      </Dialog>
    </>
  );
}
const providers = [
  {
    id: 'twilio',
    name: 'Twilio WhatsApp',
    description: 'Keep customer conversations connected.',
    icon: MessageSquare,
    color: 'green',
    tag: 'Messaging',
    limit:
      'Sandbox only reaches phones that have joined using the Twilio join phrase. Delivery callbacks and opt-outs must be enforced by the backend.',
    endpoint: '/api/integrations/twilio',
    requirements:
      'Twilio account SID, auth token, sandbox number, and a public HTTPS webhook. Verify X-Twilio-Signature on the server.',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'From opportunity to payment, seamlessly.',
    icon: Wallet,
    color: 'violet',
    tag: 'Payments · test mode',
    limit:
      'Test mode only. Hosted checkout handles card details. Collected revenue requires a verified webhook, never a browser redirect.',
    endpoint: '/api/integrations/stripe',
    requirements:
      'Server-side Stripe secret key and webhook signing secret. Verify Stripe-Signature and deduplicate event IDs.',
  },
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Make every appointment a commitment.',
    icon: CalendarDays,
    color: 'blue',
    tag: 'Appointments',
    limit:
      'OAuth testing accepts listed test users only. Refresh tokens can expire. Disconnected employees cannot be booked.',
    endpoint: '/api/integrations/google',
    requirements:
      'Google OAuth client credentials and redirect URI. Consent, token refresh, busy-time checks, and event updates run on the server.',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'The right alert, to the right teammate.',
    icon: Send,
    color: 'teal',
    tag: 'Escalation notifications',
    limit:
      'Each employee needs a chat destination and must start the bot. Failed alerts need bounded retries and visible error records.',
    endpoint: '/api/integrations/telegram',
    requirements:
      'Server-side bot token and per-user chat destinations. Alert includes lead, source, escalation reason, and direct link.',
  },
];
export function IntegrationsPage() {
  const { notify, can } = useDemo();
  const [provider, setProvider] = useState<string | null>(null);
  const p = providers.find((p) => p.id === provider);
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('google');
    if (result === 'connected') notify('Google Calendar connected successfully.', 'success');
    if (result === 'error') notify('Google Calendar connection failed. Please try again.', 'error');
  }, [notify]);
  const connectGoogle = async () => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) {
        notify('Sign in before connecting Google Calendar.', 'error');
        return;
      }
      const response = await fetch('/api/integrations/google/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.session.access_token}` },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || typeof result?.authorizationUrl !== 'string') {
        notify(response.status === 403 ? 'Only a workspace Owner or Admin can connect Google Calendar.' : 'Unable to start Google Calendar authorization.', 'error');
        return;
      }
      window.location.assign(result.authorizationUrl);
    } catch {
      notify('Unable to start Google Calendar authorization.', 'error');
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="CONNECTED WORKSPACE"
        title="Your tools. Better together."
        description="Bring conversations, payments, and appointments into the same story."
      >
        <Badge tone="amber">Integration status</Badge>
      </PageHeading>
      <div className="integration-summary">
        <span className="integration-summary-icon">
          <Plug size={22} />
        </span>
        <div>
          <h2>Built for a connected business.</h2>
          <p>Four essential integrations. One complete customer record.</p>
        </div>
        <div className="integration-count">
          <strong>
            0 <span>/ 4</span>
          </strong>
          <small>providers connected</small>
        </div>
      </div>
      <div className="integration-grid">
        {providers.map((p) => (
          <Panel key={p.id}>
            <div className="integration-card">
              <div className="integration-card-top">
                <span className={`provider-icon provider-${p.color}`}>
                  <p.icon size={26} />
                </span>
                <Badge dot>Not connected</Badge>
              </div>
              <span className="eyebrow">{p.tag}</span>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <div className="provider-status">
                <span>Last successful sync</span>
                <strong>Never</strong>
              </div>
              <p className="provider-limit">{p.limit}</p>
              <Button
                variant="secondary"
                disabled={!can('integrations')}
                onClick={() => setProvider(p.id)}
              >
                <Link2 size={14} />
                Connection setup
                <ArrowUpRight size={14} />
              </Button>
            </div>
          </Panel>
        ))}
      </div>
      <Panel
        title="Synchronization history"
        description="Every request, callback, and retry has a place here."
        action={<Badge>Read only</Badge>}
      >
        <Empty
          title="Your connections start here"
          text="There are no real integration events yet. Your backend will supply timestamps, direction, result, provider reference, failure reasons, and retry counts."
        />
      </Panel>
      <Dialog
        open={!!p}
        onOpenChange={(v) => {
          if (!v) setProvider(null);
        }}
        title={p ? `Connect ${p.name}` : 'Connect provider'}
        description={p?.id === 'google' ? 'Connect securely with Google OAuth. Credentials stay on the server.' : 'Backend integration placeholder. Never enter API keys in this frontend.'}
      >
        {p?.id === 'google' ? (
          <div className="form-body">
            <div className="integration-hint">
              <LockKeyhole size={17} />
              <p>Google will ask you to approve Calendar access. No Google credentials or refresh tokens are entered in this app.</p>
            </div>
            <h3>Connect Google Calendar</h3>
            <p className="muted">You must be signed in as a workspace Owner or Admin. The server will protect the OAuth state and store tokens securely.</p>
          </div>
        ) : (
          <div className="form-body">
          <div className="integration-hint">
            <LockKeyhole size={17} />
            <p>
              Store credentials securely on the server, scoped to this workspace. The browser only
              receives connection status.
            </p>
          </div>
          <h3>What your integration teammate needs</h3>
          <p className="muted">{p?.requirements}</p>
          <Field label="Proposed endpoint">
            <code className="endpoint">{p?.endpoint}</code>
          </Field>
          <p className="muted">{p?.limit}</p>
          </div>
        )}
        <div className="dialog-footer">
          <Button variant="secondary" onClick={() => setProvider(null)}>
            Close
          </Button>
          <Button
            onClick={() =>
              p?.id === 'google' ? connectGoogle() : notify(
                'Backend connection is pending. No credentials were submitted and no provider was connected.',
                'info',
              )
            }
          >
            {p?.id === 'google' ? 'Connect Google Calendar' : 'Check connection'}
            {p?.id === 'google' ? <ArrowUpRight size={14} /> : <RefreshCw size={14} />}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
export function ServiceAction({
  action,
  onClose,
}: {
  action: { type: string; leadId?: string; editId?: string } | null;
  onClose: () => void;
}) {
  const { data, setData, visibleLeads, notify, log, can } = useDemo();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isPayment = action?.type === 'payment';
  const existing = data.appointments.find((a) => a.id === action?.editId);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can(existing ? 'edit' : 'create')) return;
    const form = new FormData(e.currentTarget);
    const leadId = String(form.get('leadId'));
    const l = data.leads.find((l) => l.id === leadId);
    if (!l) return;
    if (isPayment) {
      const amountPkr = Number(form.get('amount'));
      const amountPaisa = Math.round(amountPkr * 100);
      if (!Number.isFinite(amountPkr) || amountPkr < 1 || amountPkr > 1_000_000 || !Number.isSafeInteger(amountPaisa)) {
        setError('Enter a valid amount between PKR 1 and PKR 1,000,000.');
        return;
      }
      const { data: authData } = await supabase.auth.getSession();
      const session = authData.session;
      if (!session) {
        setError('Please sign in before starting a Safepay checkout.');
        return;
      }
      setBusy(true);
      try {
        const response = await fetch('/api/v1/payments/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ amountPaisa, leadId }),
        });
        const result = (await response.json().catch(() => ({}))) as {
          checkoutUrl?: string;
          message?: string;
        };
        if (!response.ok || !result.checkoutUrl) {
          throw new Error(result.message || 'Unable to create the Safepay checkout.');
        }
        const checkoutUrl = new URL(result.checkoutUrl);
        if (checkoutUrl.protocol !== 'https:' && checkoutUrl.hostname !== 'localhost') {
          throw new Error('Safepay returned an invalid checkout URL.');
        }
        window.location.assign(checkoutUrl.toString());
      } catch (err) {
        setBusy(false);
        setError(err instanceof Error ? err.message : 'Unable to create the Safepay checkout.');
      }
      return;
    }
    const ownerId = String(form.get('ownerId')),
      start = new Date(String(form.get('start'))).toISOString(),
      duration = Number(form.get('duration'));
    const owner = data.team.find((t) => t.id === ownerId);
    if (!owner?.calendar) {
      setError('This employee has no calendar connection, so they cannot be booked.');
      return;
    }
    const conflict = data.appointments.find(
      (a) =>
        a.id !== existing?.id &&
        a.ownerId === ownerId &&
        a.status === 'Scheduled' &&
        new Date(start).getTime() < new Date(a.start).getTime() + a.duration * 60000 &&
        new Date(start).getTime() + duration * 60000 > new Date(a.start).getTime(),
    );
    if (conflict) {
      setError(`Overlaps with “${conflict.title}”. Choose another time or employee.`);
      return;
    }
    if (new Date(start).getTime() < Date.now()) {
      setError('Choose a future appointment time.');
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    const apt = {
      id: existing?.id || crypto.randomUUID(),
      leadId,
      ownerId,
      title: String(form.get('title')),
      start,
      duration,
      status: 'Scheduled' as const,
      location: String(form.get('location')),
    };
    setData((d) => ({
      ...d,
      appointments: existing
        ? d.appointments.map((a) => (a.id === existing.id ? apt : a))
        : [...d.appointments, apt],
      leads: d.leads.map((l) =>
        l.id === leadId
          ? {
              ...l,
              lastAction: new Date().toISOString(),
              acknowledgedAt: l.acknowledgedAt || new Date().toISOString(),
            }
          : l,
      ),
    }));
    log(
      'Appointment',
      `${existing ? 'Rescheduled' : 'Created'} appointment: ${apt.title}.`,
      leadId,
    );
    setBusy(false);
    setError('');
    onClose();
    notify('Appointment saved. Calendar sync requires a connected account.', 'info');
  };
  const localDate = (iso: string) => {
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  return (
    <Dialog
      open={!!action}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setError('');
        }
      }}
      title={
        isPayment
          ? 'Pay with Safepay (Sandbox)'
          : existing
            ? 'Reschedule appointment'
            : 'Make the next connection.'
      }
      description={
        isPayment
          ? 'Set the amount in PKR. Safepay will open a sandbox checkout in a new page.'
          : 'Booking · checks conflicts against scheduled appointments.'
      }
    >
      <form onSubmit={submit}>
        <div className="form-body">
          <Field label="Customer / opportunity">
            <select
              name="leadId"
              defaultValue={existing?.leadId || action?.leadId || visibleLeads[0]?.id}
              required
            >
              {visibleLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.company}
                </option>
              ))}
            </select>
          </Field>
          {isPayment ? (
            <>
              <div className="form-grid">
                <Field label="Amount">
                  <input
                    type="number"
                    name="amount"
                    required
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Currency">
                  <input value="PKR" readOnly aria-label="Currency" />
                </Field>
              </div>
              <Field label="Description">
                <input name="description" required placeholder="Consultation deposit" />
              </Field>
              <div className="integration-hint">
                <Wallet size={17} />
                <p>
                  Sandbox only. Safepay hosts the checkout and this CRM never receives card details.
                </p>
              </div>
            </>
          ) : (
            <>
              <Field label="Appointment title">
                <input
                  name="title"
                  required
                  defaultValue={existing?.title}
                  placeholder="e.g. Discovery call"
                />
              </Field>
              <Field label="Employee">
                <select name="ownerId" defaultValue={existing?.ownerId || 'rayyan'}>
                  {data.team.map((t) => (
                    <option key={t.id} value={t.id} disabled={!t.calendar}>
                      {t.name}
                      {!t.calendar ? ' · Calendar not connected' : ' · Calendar connected'}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="form-grid">
                <Field label={`Date & time · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}>
                  <input
                    type="datetime-local"
                    name="start"
                    required
                    defaultValue={
                      existing
                        ? localDate(existing.start)
                        : localDate(new Date(Date.now() + 3600000).toISOString())
                    }
                  />
                </Field>
                <Field label="Duration">
                  <select name="duration" defaultValue={existing?.duration || 30}>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </Field>
              </div>
              <Field label="Location">
                <select name="location" defaultValue={existing?.location || 'Google Meet'}>
                  <option>Google Meet</option>
                  <option>Office</option>
                  <option>Phone call</option>
                </select>
              </Field>
              <p className="muted">
                Times are saved as UTC and displayed in your time zone. Google busy-time lookup and
                event synchronization await backend integration.
              </p>
            </>
          )}
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="dialog-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy || !can(existing ? 'edit' : 'create')}>
            {busy
              ? 'Saving…'
              : isPayment
                ? 'Pay with Safepay (Sandbox)'
                : existing
                  ? 'Save new time'
                  : 'Save appointment'}
            <ArrowUpRight size={14} />
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
