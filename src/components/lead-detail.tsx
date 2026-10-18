'use client';
import { useEffect, useState } from 'react';
import {
  Check,
  Clock3,
  Mail,
  Phone,
  Building2,
  ArrowUpRight,
  Plus,
  MessageSquare,
  Send,
  StickyNote,
  CalendarDays,
  Wallet,
  History,
  ShieldAlert,
  UserRound,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { useDemo } from './demo-provider';
import { Avatar, Badge, Countdown, Field, Owner, StageBadge, Source, Empty, Value } from './shared';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { relative, currency, type Lead } from '@/lib/types';
export function LeadDetail({ onAction }: { onAction: (type: string, leadId?: string) => void }) {
  const { data, setData, selected, select, updateLead, acknowledge, reassign, notify, can, log } =
    useDemo();
  const [tab, setTab] = useState('Overview');
  const [note, setNote] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [assign, setAssign] = useState(false);
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);
  const l = data.leads.find((l) => l.id === selected);
  useEffect(() => {
    setTab('Overview');
    setNote('');
  }, [selected]);
  if (!l) return null;
  const events = data.activities
    .filter((a) => a.leadId === l.id)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const messages = data.messages.filter((m) => m.leadId === l.id);
  const payments = data.payments.filter((p) => p.leadId === l.id);
  const appointments = data.appointments.filter((a) => a.leadId === l.id);
  function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || !l) return;
    updateLead(
      l.id,
      {
        notes: [...l.notes, note.trim()],
        acknowledgedAt: l.acknowledgedAt || new Date().toISOString(),
      },
      'Note',
      `Added a note for ${l.name}: ${note.trim()}`,
    );
    setNote('');
  }
  const changeStage = (stage: string) => {
    const missing = data.fields.filter(
      (f) =>
        f.pipeline === (l.pipeline || data.pipeline) &&
        f.requiredStage === stage &&
        !l.fields[f.id],
    );
    if (missing.length) {
      notify(`Fill ${missing.map((f) => f.name).join(', ')} before moving to ${stage}.`, 'error');
      return;
    }
    updateLead(
      l.id,
      { stage, acknowledgedAt: l.acknowledgedAt || new Date().toISOString() },
      'Stage change',
      `${l.name} moved to ${stage}.`,
    );
  };
  return (
    <>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) select(null);
        }}
        title="Customer workspace"
        description={`${l.id} · Created ${relative(l.createdAt)}`}
        drawer
      >
        <div className="detail-hero">
          <Avatar name={l.name} color="violet" />
          <div className="grow">
            <h2>{l.name}</h2>
            <p>
              <Building2 size={13} />
              {l.company}
            </p>
          </div>
          <StageBadge stage={l.stage} />
        </div>
        <div className="detail-contact">
          <a href={`mailto:${l.email}`}>
            <Mail size={13} />
            {l.email}
          </a>
          <a href={`tel:${l.phone.replace(/[^+\d]/g, '')}`}>
            <Phone size={13} />
            {l.phone}
          </a>
        </div>
        <div className={`ownership-card ${!l.acknowledgedAt ? 'pending' : ''}`}>
          <div className="ownership-top">
            <span>
              <ShieldAlert size={15} />
              Lead accountability
            </span>
            <Countdown lead={l} />
          </div>
          <div className="ownership-main">
            <Owner id={l.ownerId} />
            <button
              className="text-link"
              disabled={!can('edit')}
              onClick={() => {
                setNewOwner(l.ownerId);
                setAssign(true);
              }}
            >
              Reassign
              <ArrowUpRight size={13} />
            </button>
          </div>
          <p>
            {l.acknowledgedAt
              ? 'This lead has a recorded first response.'
              : `Awaiting an action from ${data.team.find((e) => e.id === l.ownerId)?.name.split(' ')[0]}.`}
            {l.escalations > 0 &&
              ` Escalated ${l.escalations} time${l.escalations > 1 ? 's' : ''}.`}
          </p>
          {!l.acknowledgedAt && (
            <Button size="sm" onClick={() => acknowledge(l.id)} disabled={!can('edit')}>
              <Check size={14} />
              Acknowledge lead
            </Button>
          )}
        </div>
        <div className="detail-tabs">
          {['Overview', 'Activity', 'Messages', 'Payments', 'Appointments'].map((t) => (
            <button className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="detail-body">
          {tab === 'Overview' && (
            <>
              <div className="detail-section-title">
                <h3>Opportunity details</h3>
                <button className="text-link" disabled={!can('edit')} onClick={() => setEdit(true)}>
                  Edit record
                  <ArrowUpRight size={13} />
                </button>
                <Badge tone="neutral">{l.pipeline || 'Sales pipeline'}</Badge>
              </div>
              <div className="details-grid">
                <div>
                  <span>Opportunity value</span>
                  <strong>
                    <Value amount={l.value} />
                  </strong>
                </div>
                <div>
                  <span>Source</span>
                  <Source source={l.source} />
                </div>
                <Field label="Pipeline stage">
                  <select
                    value={l.stage}
                    disabled={!can('edit')}
                    onChange={(e) => changeStage(e.target.value)}
                  >
                    {data.stages.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <div>
                  <span>Tag</span>
                  <Badge tone="violet">{l.tag}</Badge>
                </div>
                <div>
                  <span>Assigned</span>
                  <strong>{new Date(l.assignedAt).toLocaleString()}</strong>
                </div>
                <div>
                  <span>Last activity</span>
                  <strong>{relative(l.lastAction)}</strong>
                </div>
              </div>
              <div className="detail-section-title">
                <h3>Custom fields</h3>
                <span>{l.pipeline || 'Sales pipeline'}</span>
              </div>
              <div className="custom-field-list">
                {data.fields
                  .filter((f) => f.pipeline === (l.pipeline || 'Sales pipeline'))
                  .map((f) => (
                    <Field
                      key={f.id}
                      label={`${f.name}${f.requiredStage ? ` · required for ${f.requiredStage}` : ''}`}
                    >
                      {f.type === 'Dropdown' ? (
                        <select
                          disabled={!can('edit')}
                          value={l.fields[f.id] || ''}
                          onChange={(e) =>
                            updateLead(
                              l.id,
                              { fields: { ...l.fields, [f.id]: e.target.value } },
                              'Field edit',
                              `${f.name} updated for ${l.name}.`,
                            )
                          }
                        >
                          <option value="">Select an option</option>
                          {(f.options || 'Option 1,Option 2').split(',').map((o) => (
                            <option key={o}>{o.trim()}</option>
                          ))}
                        </select>
                      ) : f.type === 'Checkbox' ? (
                        <input
                          type="checkbox"
                          disabled={!can('edit')}
                          checked={l.fields[f.id] === 'true'}
                          onChange={(e) =>
                            updateLead(
                              l.id,
                              { fields: { ...l.fields, [f.id]: String(e.target.checked) } },
                              'Field edit',
                              `${f.name} updated for ${l.name}.`,
                            )
                          }
                        />
                      ) : (
                        <input
                          disabled={!can('edit')}
                          type={
                            f.type === 'Number' ? 'number' : f.type === 'Date' ? 'date' : 'text'
                          }
                          defaultValue={l.fields[f.id] || ''}
                          onBlur={(e) => {
                            if (e.target.value !== (l.fields[f.id] || ''))
                              updateLead(
                                l.id,
                                { fields: { ...l.fields, [f.id]: e.target.value } },
                                'Field edit',
                                `${f.name} updated for ${l.name}.`,
                              );
                          }}
                          placeholder={`Add ${f.name.toLowerCase()}`}
                        />
                      )}
                    </Field>
                  ))}
              </div>
              <div className="detail-section-title">
                <h3>Notes</h3>
                <StickyNote size={15} />
              </div>
              {l.notes.map((n, i) => (
                <div key={i} className="note-card">
                  <p>{n}</p>
                  <span>Workspace note</span>
                </div>
              ))}
              <form onSubmit={saveNote} className="note-form">
                <label className="sr-only" htmlFor="lead-note">
                  Add a note
                </label>
                <textarea
                  id="lead-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add context for your next conversation…"
                  required
                  maxLength={2000}
                />
                <Button size="sm" disabled={!note.trim() || !can('edit')}>
                  <Plus size={13} />
                  Add note
                </Button>
              </form>
              <div className="quick-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setTab('Messages');
                  }}
                >
                  <MessageSquare size={14} />
                  Message
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onAction('payment', l.id)}>
                  <Wallet size={14} />
                  Payment request
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onAction('appointment', l.id)}>
                  <CalendarDays size={14} />
                  Book appointment
                </Button>
              </div>
            </>
          )}
          {tab === 'Activity' && (
            <>
              <div className="detail-section-title">
                <h3>A complete history</h3>
                <Badge>Read only</Badge>
              </div>
              <div className="timeline">
                {events.map((e) => (
                  <div className="timeline-event" key={e.id}>
                    <span className="timeline-icon">
                      {e.type === 'Escalation' ? <ShieldAlert size={14} /> : <History size={14} />}
                    </span>
                    <div>
                      <strong>{e.text}</strong>
                      <p>
                        {e.actor} · {new Date(e.time).toLocaleString()}
                      </p>
                      {e.before && (
                        <span className="audit-diff">
                          {e.before} → {e.after}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {!events.length && (
                <Empty
                  title="The story starts here"
                  text="Notes, assignments, and changes will appear in this timeline."
                />
              )}
            </>
          )}
          {tab === 'Messages' && (
            <>
              <div className="integration-hint">
                <MessageSquare size={16} />
                <p>Twilio is not connected. Sample conversation only; no messages are delivered.</p>
              </div>
              {l.optedOut && (
                <div className="inline-error">
                  This contact opted out. Messaging is blocked until consent is restored.
                </div>
              )}
              <div className="detail-messages">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`message-bubble ${m.direction === 'out' ? 'outgoing' : ''}`}
                  >
                    <p>{m.text}</p>
                    <span>
                      {new Date(m.time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {m.status}
                    </span>
                    {m.error && <small className="error-text">{m.error}</small>}
                  </div>
                ))}
              </div>
              {!messages.length && (
                <Empty
                  title="Start a conversation"
                  text="Connect Twilio to send and receive customer messages."
                />
              )}
              <Button
                disabled={l.optedOut}
                variant="secondary"
                onClick={() =>
                  notify('Connect Twilio in Integrations before sending a message.', 'info')
                }
              >
                <Send size={14} />
                Connect messaging to reply
              </Button>
            </>
          )}
          {tab === 'Payments' && (
            <>
              <div className="detail-section-title">
                <h3>Payment history</h3>
                <Button size="sm" onClick={() => onAction('payment', l.id)}>
                  <Plus size={13} />
                  Request payment
                </Button>
              </div>
              {payments.map((p) => (
                <div className="detail-related" key={p.id}>
                  <span className="payment-icon">
                    <Wallet size={18} />
                  </span>
                  <div className="grow">
                    <strong>
                      <Value amount={p.amount} />
                    </strong>
                    <span>{p.reference} · Sample event</span>
                  </div>
                  <Badge
                    tone={p.status === 'Paid' ? 'green' : p.status === 'Failed' ? 'red' : 'amber'}
                  >
                    {p.status}
                  </Badge>
                </div>
              ))}
              {!payments.length && (
                <Empty
                  title="No payments yet"
                  text="Payment requests and provider-confirmed events will appear here."
                />
              )}
              <p className="muted">
                Payment details are entered on Stripe’s hosted checkout. No card data is stored
                here.
              </p>
            </>
          )}
          {tab === 'Appointments' && (
            <>
              <div className="detail-section-title">
                <h3>Appointments</h3>
                <Button size="sm" onClick={() => onAction('appointment', l.id)}>
                  <Plus size={13} />
                  Book
                </Button>
              </div>
              {appointments.map((a) => (
                <div className="detail-related" key={a.id}>
                  <CalendarDays size={20} />
                  <div className="grow">
                    <strong>{a.title}</strong>
                    <span>
                      {new Date(a.start).toLocaleString()} · {a.duration} min
                    </span>
                  </div>
                  <Badge tone={a.status === 'Scheduled' ? 'green' : 'neutral'}>{a.status}</Badge>
                </div>
              ))}
              {!appointments.length && (
                <Empty
                  title="Make time to connect"
                  text="Book a customer appointment to see it here."
                />
              )}
            </>
          )}
          <div className="detail-record-actions">
            <Button
              variant="secondary"
              size="sm"
              disabled={!can('edit')}
              onClick={() => setEdit(true)}
            >
              Edit customer details
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!can('delete')}
              onClick={() => setRemove(true)}
            >
              Delete record
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={assign}
        onOpenChange={setAssign}
        title="Keep ownership clear"
        description="Only available teammates with remaining capacity can receive a lead."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reassign(l.id, newOwner);
            setAssign(false);
          }}
        >
          <div className="form-body">
            <Field label="New owner">
              <select value={newOwner} onChange={(e) => setNewOwner(e.target.value)} required>
                {data.team
                  .filter((t) => t.status === 'Available')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ·{' '}
                      {
                        data.leads.filter(
                          (l) => l.ownerId === t.id && !['Won', 'Lost'].includes(l.stage),
                        ).length
                      }
                      /{t.limit} leads
                    </option>
                  ))}
              </select>
            </Field>
            <p className="muted">
              Manual reassignment is recorded separately from automatic escalation.
            </p>
          </div>
          <div className="dialog-footer">
            <Button variant="secondary" type="button" onClick={() => setAssign(false)}>
              Cancel
            </Button>
            <Button disabled={newOwner === l.ownerId}>Reassign lead</Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={edit}
        onOpenChange={setEdit}
        title="The details make the difference"
        description="Update this customer and their linked opportunity."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            updateLead(
              l.id,
              {
                name: String(f.get('name')).trim(),
                email: String(f.get('email')),
                phone: String(f.get('phone')),
                company: String(f.get('company')).trim(),
                ...(can('values') ? { value: Number(f.get('value')) } : {}),
              },
              'Field edit',
              `Updated customer details for ${l.name}.`,
            );
            setEdit(false);
          }}
        >
          <div className="form-body">
            <Field label="Full name">
              <input name="name" required defaultValue={l.name} />
            </Field>
            <Field label="Company">
              <input name="company" required defaultValue={l.company} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required defaultValue={l.email} />
            </Field>
            <Field label="Phone">
              <input name="phone" type="tel" required defaultValue={l.phone} />
            </Field>
            {can('values') && (
              <Field label="Opportunity value (USD)">
                <input name="value" type="number" min="0" step="0.01" defaultValue={l.value} />
              </Field>
            )}
          </div>
          <div className="dialog-footer">
            <Button type="button" variant="secondary" onClick={() => setEdit(false)}>
              Cancel
            </Button>
            <Button>Save record</Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={remove}
        onOpenChange={setRemove}
        title="Delete this customer record?"
        description="This removes the local customer, opportunity, messages, payments, and appointments. The audit history is retained."
      >
        <div className="dialog-footer">
          <Button variant="secondary" onClick={() => setRemove(false)}>
            Keep record
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!can('delete')) return;
              log(
                'Deletion',
                `Deleted local customer record ${l.name} and related demo records.`,
                l.id,
              );
              setData((d) => ({
                ...d,
                leads: d.leads.filter((x) => x.id !== l.id),
                payments: d.payments.filter((x) => x.leadId !== l.id),
                messages: d.messages.filter((x) => x.leadId !== l.id),
                appointments: d.appointments.filter((x) => x.leadId !== l.id),
              }));
              setRemove(false);
              select(null);
              notify('Local record deleted. Audit history retained.');
            }}
          >
            Delete local record
          </Button>
        </div>
      </Dialog>
    </>
  );
}
export function CreateRecord({
  open,
  onClose,
  kind = 'lead',
}: {
  open: boolean;
  onClose: () => void;
  kind?: string;
}) {
  const { data, setData, notify, can } = useDemo();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can('create')) return;
    const form = new FormData(e.currentTarget);
    const eligible = data.team.filter(
      (t) =>
        t.status === 'Available' &&
        data.leads.filter((l) => l.ownerId === t.id && !['Won', 'Lost'].includes(l.stage)).length <
          t.limit,
    );
    const owner =
      (form.get('owner') as string) || eligible[data.leads.length % eligible.length]?.id;
    if (!owner || !eligible.some((t) => t.id === owner)) {
      setError('No eligible employees. Set a teammate to Available or increase their lead limit.');
      return;
    }
    const required = data.fields.filter(
      (f) => f.pipeline === data.pipeline && f.requiredStage === data.stages[0],
    );
    if (required.some((f) => !form.get(f.id))) {
      setError('Complete the required custom fields.');
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 350));
    const now = new Date().toISOString();
    const l: Lead = {
      pipeline: data.pipeline,
      id: `LD-${Date.now().toString().slice(-6)}`,
      name: String(form.get('name')).trim(),
      email: String(form.get('email')).trim(),
      phone: String(form.get('phone')),
      company: String(form.get('company')).trim(),
      source: String(form.get('source')) as Lead['source'],
      ownerId: owner,
      stage: data.stages[0],
      value: Number(form.get('value') || 0),
      tag: String(form.get('tag')),
      createdAt: now,
      assignedAt: now,
      deadline: new Date(Date.now() + data.rules.window * 1000).toISOString(),
      lastAction: now,
      escalations: 0,
      notes: [],
      fields: Object.fromEntries(
        data.fields
          .filter((f) => f.pipeline === data.pipeline)
          .map((f) => [f.id, String(form.get(f.id) || '')]),
      ),
    };
    setData((d) => ({
      ...d,
      leads: [l, ...d.leads],
      activities: [
        {
          id: crypto.randomUUID(),
          type: 'Assignment',
          actor: 'System (demo)',
          text: `Created ${l.name} and assigned to ${d.team.find((t) => t.id === owner)?.name}.`,
          leadId: l.id,
          time: now,
        },
        ...d.activities,
      ],
    }));
    setBusy(false);
    onClose();
    notify(`${l.name} added to the demo workspace.`);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setError('');
        }
      }}
      title={
        kind === 'contact'
          ? 'Add a contact'
          : kind === 'opportunity'
            ? 'Create an opportunity'
            : 'A new conversation starts here.'
      }
      description="Add the essentials. We’ll give this lead one accountable owner."
    >
      <form onSubmit={create}>
        <div className="form-body">
          <div className="form-grid">
            <Field label="Full name *">
              <input
                name="name"
                autoComplete="name"
                required
                placeholder="e.g. Alex Morgan"
                maxLength={100}
              />
            </Field>
            <Field label="Company *">
              <input name="company" required placeholder="Company name" maxLength={100} />
            </Field>
            <Field label="Email address *">
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="alex@company.com"
              />
            </Field>
            <Field label="Phone number *">
              <input type="tel" name="phone" required placeholder="+1 (415) 555-0123" />
            </Field>
            <Field label="Lead source">
              <select name="source" defaultValue="Manual">
                {['Manual', 'Website', 'WhatsApp', 'Referral'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            {can('values') && (
              <Field label="Opportunity value (USD)">
                <input name="value" type="number" min="0" step="0.01" placeholder="0.00" />
              </Field>
            )}
            <Field label="Assigned owner">
              <select name="owner">
                <option value="">Auto-assign · round robin</option>
                {data.team
                  .filter((t) => t.status === 'Available')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Tag">
              <select name="tag">
                <option>High intent</option>
                <option>Follow up</option>
                <option>Enterprise</option>
              </select>
            </Field>
          </div>
          {data.fields
            .filter((f) => f.pipeline === data.pipeline)
            .map((f) => (
              <Field
                key={f.id}
                label={`${f.name}${f.requiredStage === data.stages[0] ? ' *' : ''}`}
              >
                {f.type === 'Dropdown' ? (
                  <select name={f.id} required={f.requiredStage === data.stages[0]}>
                    <option value="">Select an option</option>
                    {(f.options || 'Option 1,Option 2').split(',').map((o) => (
                      <option key={o}>{o.trim()}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={f.id}
                    type={
                      f.type === 'Checkbox'
                        ? 'checkbox'
                        : f.type === 'Number'
                          ? 'number'
                          : f.type === 'Date'
                            ? 'date'
                            : 'text'
                    }
                    required={f.requiredStage === data.stages[0]}
                  />
                )}
              </Field>
            ))}
          <div className="integration-hint">
            <Clock3 size={16} />
            <p>{data.rules.window} second acknowledgement window. Frontend demo assignment only.</p>
          </div>
          {error && (
            <div role="alert" className="inline-error">
              {error}
            </div>
          )}
        </div>
        <div className="dialog-footer">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy || !can('create')}>
            {busy
              ? 'Creating…'
              : kind === 'contact'
                ? 'Add contact'
                : kind === 'opportunity'
                  ? 'Create opportunity'
                  : 'Create lead'}
            <ArrowUpRight size={14} />
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
