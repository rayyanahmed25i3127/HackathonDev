'use client';
import { useState } from 'react';
import {
  Plus,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Trash2,
  Settings2,
  ShieldCheck,
  Users,
  Clock3,
  GripVertical,
  Check,
  Mail,
  Copy,
  Bell,
  Save,
  ShieldAlert,
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  ArrowRight,
  LockKeyhole,
  ExternalLink,
  UserRound,
  Building2,
} from 'lucide-react';
import { useDemo } from './demo-provider';
import {
  Avatar,
  Availability,
  Badge,
  Empty,
  Field,
  PageHeading,
  Panel,
  SearchInput,
  Select,
  Owner,
} from './shared';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import {
  type Availability as AvailabilityType,
  type Role,
  type CustomField,
  relative,
} from '@/lib/types';
export function TeamPage() {
  const { data, setData, notify, can, log } = useDemo();
  const [invite, setInvite] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const setAvailability = (id: string, status: AvailabilityType) => {
    const target = data.team.find((t) => t.id === id);
    if (!target) return;
    const isUnavailable = ['On leave', 'Offline'].includes(status);
    const unack = data.leads.filter((l) => l.ownerId === id && !l.acknowledgedAt);
    const candidates = data.team.filter((t) => t.id !== id && t.status === 'Available');
    const capacity = candidates.reduce(
      (sum, t) =>
        sum +
        Math.max(
          0,
          t.limit -
            data.leads.filter((l) => l.ownerId === t.id && !['Won', 'Lost'].includes(l.stage))
              .length,
        ),
      0,
    );
    if (isUnavailable && capacity < unack.length) {
      notify(
        'No teammate has capacity. Make another employee available before changing this status.',
        'error',
      );
      return;
    }
    let failed = false;
    setData((d) => {
      const next = {
        ...d,
        team: d.team.map((t) => (t.id === id ? { ...t, status } : t)),
        leads: [...d.leads],
        activities: [...d.activities],
      };
      if (isUnavailable) {
        for (const lead of unack) {
          const nextOwner = candidates.find(
            (t) =>
              next.leads.filter((l) => l.ownerId === t.id && !['Won', 'Lost'].includes(l.stage))
                .length < t.limit,
          );
          if (!nextOwner) {
            failed = true;
            break;
          }
          const now = new Date().toISOString();
          next.leads = next.leads.map((l) =>
            l.id === lead.id
              ? {
                  ...l,
                  ownerId: nextOwner.id,
                  assignedAt: now,
                  deadline: new Date(Date.now() + d.rules.window * 1000).toISOString(),
                }
              : l,
          );
          next.activities.unshift({
            id: crypto.randomUUID(),
            type: 'Reassignment',
            actor: 'System (demo)',
            text: `${lead.name} reassigned from ${target.name} to ${nextOwner.name} because owner is ${status.toLowerCase()}.`,
            leadId: lead.id,
            time: now,
            before: target.name,
            after: nextOwner.name,
          });
        }
      }
      if (failed) return d;
      next.activities.unshift({
        id: crypto.randomUUID(),
        type: 'Availability',
        actor: 'Rayyan Ahmed',
        text: `${target.name} changed availability to ${status}.`,
        time: new Date().toISOString(),
        before: target.status,
        after: status,
      });
      return next;
    });
    notify('Demo availability updated. Unacknowledged leads are reassigned when capacity allows.');
  };
  return (
    <>
      <PageHeading
        eyebrow="YOUR PEOPLE"
        title="A team that keeps things moving."
        description="Availability, capacity, and ownership. No guesswork."
      >
        <Button onClick={() => setInvite(true)} disabled={!can('owner')}>
          <Plus size={16} />
          Invite teammate
        </Button>
      </PageHeading>
      <div className="availability-summary">
        {['Available', 'Busy', 'On leave', 'Offline'].map((s) => (
          <button
            key={s}
            className={status === s ? 'active' : ''}
            onClick={() => setStatus(status === s ? 'all' : s)}
          >
            <span
              className={`availability-indicator indicator-${s.toLowerCase().replace(' ', '-')}`}
            />
            <strong>{data.team.filter((t) => t.status === s).length}</strong>
            <span>{s}</span>
          </button>
        ))}
      </div>
      <Panel title="Workspace members" description="Every person has a part to play.">
        <div className="table-toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Search teammates…" />
          <Badge>{data.team.length} members</Badge>
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Team member</th>
                <th>Base level</th>
                <th>Availability</th>
                <th>Open leads</th>
                <th>Calendar</th>
                <th>Change status</th>
              </tr>
            </thead>
            <tbody>
              {data.team
                .filter(
                  (t) =>
                    t.name.toLowerCase().includes(search.toLowerCase()) &&
                    (status === 'all' || t.status === status),
                )
                .map((t) => {
                  const count = data.leads.filter(
                    (l) => l.ownerId === t.id && !['Won', 'Lost'].includes(l.stage),
                  ).length;
                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="record-person">
                          <Avatar name={t.name} color={t.color} />
                          <span>
                            <strong>
                              {t.name}
                              {t.id === 'rayyan' && <small className="you-label">You</small>}
                            </strong>
                            <small>{t.email}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        {t.role === 'Owner' ? (
                          <Badge tone="violet">Owner</Badge>
                        ) : (
                          <select
                            aria-label={`Base level for ${t.name}`}
                            value={t.role}
                            disabled={!can('owner')}
                            onChange={(e) => {
                              const role = e.target.value as Role;
                              setData((d) => ({
                                ...d,
                                team: d.team.map((x) => (x.id === t.id ? { ...x, role } : x)),
                              }));
                              log(
                                'Permission change',
                                `Changed ${t.name}'s base level from ${t.role} to ${role}.`,
                                undefined,
                                t.role,
                                role,
                              );
                              notify('Base level updated in the demo.');
                            }}
                          >
                            <option>User</option>
                            <option>Admin</option>
                          </select>
                        )}
                      </td>
                      <td>
                        <Availability employee={t} />
                      </td>
                      <td>
                        <div className="capacity">
                          <span>
                            {count}
                            <small> / {t.limit}</small>
                          </span>
                          <div>
                            <i style={{ width: `${Math.min(100, (count / t.limit) * 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone={t.calendar ? 'green' : 'neutral'}>
                          {t.calendar ? 'Demo connected' : 'Not connected'}
                        </Badge>
                      </td>
                      <td>
                        <select
                          aria-label={`Availability for ${t.name}`}
                          value={t.status}
                          disabled={
                            (data.role === 'User' && t.id !== 'rayyan') ||
                            (data.role === 'Admin' && t.role === 'Owner')
                          }
                          onChange={(e) =>
                            setAvailability(t.id, e.target.value as AvailabilityType)
                          }
                        >
                          {['Available', 'Busy', 'On leave', 'Offline'].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="panel-foot">
          <ShieldCheck size={14} />
          Only Available employees below their lead limit can receive new assignments.
        </div>
      </Panel>
      <div className="policy-callout">
        <ShieldAlert size={18} />
        <div>
          <h3>A clear policy for time away</h3>
          <p>
            When someone goes On leave or Offline, unacknowledged leads move to eligible teammates.
            Acknowledged leads keep their owner. If there is no capacity, the status change is
            blocked. These are local demo rules; server enforcement is pending.
          </p>
        </div>
      </div>
      <Dialog
        open={invite}
        onOpenChange={setInvite}
        title="Make room for another teammate"
        description="Invitation delivery and account creation require Supabase Auth."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            notify('Invitation service is not connected. No email was sent.', 'info');
            setInvite(false);
          }}
        >
          <div className="form-body">
            <Field label="Email address">
              <input type="email" required placeholder="teammate@company.com" />
            </Field>
            <Field label="Base level">
              <select>
                <option>User</option>
                <option>Admin</option>
              </select>
            </Field>
            <p className="muted">
              Only the Owner can invite members and assign levels. Owner changes are protected.
            </p>
          </div>
          <div className="dialog-footer">
            <Button type="button" variant="secondary" onClick={() => setInvite(false)}>
              Cancel
            </Button>
            <Button>
              Send invitation
              <Mail size={14} />
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
const permissionLabels: Record<string, string> = {
  view: 'View CRM records',
  create: 'Create CRM records',
  edit: 'Edit CRM records',
  delete: 'Delete CRM records',
  export: 'Export CRM records',
  values: 'View opportunity values',
  assignment: 'Manage assignment rules',
  integrations: 'Manage integrations',
  audit: 'View audit history',
};
export function SettingsPage() {
  const { data, setData, notify, can, log, reset } = useDemo();
  const [tab, setTab] = useState('Assignment rules');
  const [fieldDialog, setFieldDialog] = useState(false);
  const [stageName, setStageName] = useState('');
  const [stageEdit, setStageEdit] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const tabs = [
    'Workspace',
    'Assignment rules',
    'Pipeline stages',
    'Custom fields',
    'Roles & permissions',
    'Notifications',
  ].filter(
    (t) =>
      t === 'Notifications' ||
      data.role !== 'User' ||
      (t === 'Assignment rules' && can('assignment')),
  );
  const activeTab = tabs.includes(tab) ? tab : tabs[0];
  const saveRules = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const rules = {
      window: Number(f.get('window')),
      idleHours: Number(f.get('idle')),
      backupId: String(f.get('backup')),
      managerId: String(f.get('manager')),
      levels: Number(f.get('levels')),
      method: 'Round robin' as const,
      levelWindows: [0, 1, 2].map(
        (i) => Number(f.get(`level-window-${i}`)) || Number(f.get('window')),
      ),
    };
    setData((d) => ({
      ...d,
      rules,
      team: d.team.map((t) => ({ ...t, limit: Number(f.get(`limit-${t.id}`)) || t.limit })),
    }));
    log(
      'Configuration',
      'Updated lead assignment and escalation rules.',
      undefined,
      JSON.stringify(data.rules),
      JSON.stringify(rules),
    );
    notify('Assignment rules saved in this browser.');
  };
  const saveStage = () => {
    const name = stageName.trim();
    if (!name) return;
    if (data.stages.includes(name) && name !== stageEdit) {
      notify('A stage with that name already exists.', 'error');
      return;
    }
    if (stageEdit) {
      setData((d) => ({
        ...d,
        stages: d.stages.map((s) => (s === stageEdit ? name : s)),
        leads: d.leads.map((l) => (l.stage === stageEdit ? { ...l, stage: name } : l)),
        fields: d.fields.map((f) =>
          f.requiredStage === stageEdit ? { ...f, requiredStage: name } : f,
        ),
      }));
      log(
        'Configuration',
        `Renamed pipeline stage ${stageEdit} to ${name}.`,
        undefined,
        stageEdit,
        name,
      );
    } else {
      setData((d) => ({ ...d, stages: [...d.stages, name] }));
      log('Configuration', `Added pipeline stage ${name}.`);
    }
    setStageName('');
    setStageEdit(null);
    notify('Pipeline stages updated.');
  };
  return (
    <>
      <PageHeading
        eyebrow="MAKE IT YOURS"
        title="A workspace that works your way."
        description="Configure the rules. Give your team room to do their best work."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {tabs.map((t) => (
            <button key={t} className={activeTab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {activeTab === 'Workspace' && (
            <Panel title="Workspace details" description="The home your team shares.">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  notify(
                    'Workspace profile changes need the backend. This preview keeps the demo workspace name.',
                    'info',
                  );
                }}
              >
                <div className="form-body">
                  <div className="workspace-profile">
                    <span className="workspace-logo">
                      <Building2 size={23} />
                    </span>
                    <div>
                      <strong>Acme Studio</strong>
                      <p>Business workspace · Demo</p>
                    </div>
                  </div>
                  <Field label="Workspace name">
                    <input defaultValue="Acme Studio" required />
                  </Field>
                  <Field label="Industry">
                    <select defaultValue="Professional services">
                      <option>Professional services</option>
                      <option>Real estate</option>
                      <option>Solar installation</option>
                      <option>Healthcare</option>
                    </select>
                  </Field>
                  <Field label="Time zone">
                    <input value={Intl.DateTimeFormat().resolvedOptions().timeZone} readOnly />
                  </Field>
                  <p className="muted">
                    All dates are stored in UTC. This frontend uses your browser’s time zone.
                  </p>
                </div>
                <div className="settings-footer">
                  <Button>Save workspace</Button>
                </div>
              </form>
              <div className="danger-zone">
                <h3>Reset demo workspace</h3>
                <p>
                  Clear local changes and restore the sample records. Real backend data is never
                  touched.
                </p>
                <Button variant="danger" size="sm" onClick={() => setResetOpen(true)}>
                  Reset demo data
                </Button>
              </div>
            </Panel>
          )}
          {activeTab === 'Assignment rules' && (
            <form onSubmit={saveRules}>
              <Panel
                title="Give every lead a clear owner"
                description="These rules are editable in the demo. Production automation runs on the server."
              >
                <div className="form-body">
                  <Field label="Distribution method">
                    <select name="method">
                      <option>Round robin</option>
                    </select>
                  </Field>
                  <div className="form-grid">
                    <Field
                      label="Acknowledgement window (seconds)"
                      hint="Use 30–60 seconds for a quick hackathon demo."
                    >
                      <input
                        name="window"
                        type="number"
                        min="10"
                        max="86400"
                        defaultValue={data.rules.window}
                        required
                      />
                    </Field>
                    <Field label="Idle recovery threshold (hours)">
                      <input
                        name="idle"
                        type="number"
                        min="1"
                        max="720"
                        defaultValue={data.rules.idleHours}
                        required
                      />
                    </Field>
                  </div>
                  <div className="settings-divider" />
                  <h3>When a response takes too long</h3>
                  <div className="escalation-chain">
                    <span>Next eligible employee</span>
                    <ArrowRight size={15} />
                    <span>Designated backup</span>
                    <ArrowRight size={15} />
                    <span>Manager</span>
                  </div>
                  <div className="form-grid">
                    <Field label="Designated backup">
                      <select name="backup" defaultValue={data.rules.backupId}>
                        {data.team.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Escalation manager">
                      <select name="manager" defaultValue={data.rules.managerId}>
                        {data.team.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Escalation levels">
                    <input
                      name="levels"
                      type="number"
                      min="1"
                      max="3"
                      defaultValue={data.rules.levels}
                      required
                    />
                  </Field>
                  <div className="form-grid">
                    {['Next eligible employee', 'Designated backup', 'Manager'].map((label, i) => (
                      <Field key={label} label={`${label} window (seconds)`}>
                        <input
                          name={`level-window-${i}`}
                          type="number"
                          min="10"
                          max="86400"
                          defaultValue={data.rules.levelWindows?.[i] || data.rules.window}
                          required
                        />
                      </Field>
                    ))}
                  </div>
                  <h3>Open lead limits</h3>
                  {data.team.map((t) => (
                    <Field key={t.id} label={t.name}>
                      <input
                        name={`limit-${t.id}`}
                        type="number"
                        min="1"
                        max="100"
                        defaultValue={t.limit}
                        required
                      />
                    </Field>
                  ))}
                  <div className="integration-hint">
                    <ShieldCheck size={17} />
                    <p>
                      Only Available employees below capacity receive leads. Server timers,
                      concurrency protection, automatic escalation, and Telegram delivery are
                      backend responsibilities.
                    </p>
                  </div>
                </div>
                <div className="settings-footer">
                  <Button>
                    <Save size={14} />
                    Save assignment rules
                  </Button>
                </div>
              </Panel>
            </form>
          )}
          {activeTab === 'Pipeline stages' && (
            <Panel
              title="Your pipeline. Your process."
              description="Rename, reorder, and add stages. Occupied stages cannot be deleted."
            >
              <div className="form-body">
                {data.stages.map((s, i) => (
                  <div className="stage-setting-row" key={s}>
                    <GripVertical size={15} />
                    <span className={`stage-dot stage-color-${i % 6}`} />
                    <strong className="grow">{s}</strong>
                    <Badge>{data.leads.filter((l) => l.stage === s).length} opportunities</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${s} up`}
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...data.stages];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        setData((d) => ({ ...d, stages: next }));
                        log('Configuration', `Reordered ${s} pipeline stage.`);
                      }}
                    >
                      <ArrowUp size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${s} down`}
                      disabled={i === data.stages.length - 1}
                      onClick={() => {
                        const next = [...data.stages];
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        setData((d) => ({ ...d, stages: next }));
                        log('Configuration', `Reordered ${s} pipeline stage.`);
                      }}
                    >
                      <ArrowDown size={13} />
                    </Button>
                    <button
                      className="text-link"
                      disabled={['New', 'Won', 'Lost'].includes(s)}
                      onClick={() => {
                        setStageEdit(s);
                        setStageName(s);
                      }}
                    >
                      Rename
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${s}`}
                      disabled={['New', 'Won', 'Lost'].includes(s)}
                      onClick={() => {
                        if (data.leads.some((l) => l.stage === s)) {
                          notify(
                            'Move the opportunities out of this stage before deleting it.',
                            'error',
                          );
                          return;
                        }
                        setData((d) => ({
                          ...d,
                          stages: d.stages.filter((st) => st !== s),
                          fields: d.fields.map((f) =>
                            f.requiredStage === s ? { ...f, requiredStage: '' } : f,
                          ),
                        }));
                        log('Configuration', `Deleted empty stage ${s}.`);
                        notify('Empty stage deleted.');
                      }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ))}
                <div className="inline-stage-form">
                  <input
                    aria-label={stageEdit ? 'Rename stage' : 'New stage name'}
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                    placeholder={stageEdit ? 'New name' : 'Add a pipeline stage…'}
                    maxLength={24}
                  />
                  <Button size="sm" onClick={saveStage}>
                    {stageEdit ? 'Save name' : 'Add stage'}
                    <Plus size={13} />
                  </Button>
                </div>
                <p className="muted">
                  New, Won, and Lost are protected system stages. Stage changes keep linked
                  opportunities and field rules consistent.
                </p>
              </div>
            </Panel>
          )}
          {activeTab === 'Custom fields' && (
            <Panel
              title="Capture what matters to your business"
              description="Different pipelines can have different field sets."
              action={
                <Button size="sm" onClick={() => setFieldDialog(true)}>
                  <Plus size={13} />
                  Add field
                </Button>
              }
            >
              <div className="form-body">
                <Field label="Field set">
                  <select
                    value={data.pipeline}
                    onChange={(e) => setData((d) => ({ ...d, pipeline: e.target.value }))}
                  >
                    <option>Sales pipeline</option>
                    <option>Service pipeline</option>
                  </select>
                </Field>
                {data.fields
                  .filter((f) => f.pipeline === data.pipeline)
                  .map((f) => (
                    <div className="custom-field-card" key={f.id}>
                      <span className="field-type-icon">
                        {f.type === 'Text'
                          ? 'Aa'
                          : f.type === 'Number'
                            ? '#'
                            : f.type === 'Checkbox'
                              ? '☑'
                              : f.type === 'Date'
                                ? '◷'
                                : '≡'}
                      </span>
                      <div className="grow">
                        <strong>{f.name}</strong>
                        <p>
                          {f.type} ·{' '}
                          {f.requiredStage ? `Required at ${f.requiredStage}` : 'Optional'} ·{' '}
                          {f.pipeline}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete field ${f.name}`}
                        onClick={() => {
                          if (data.leads.some((l) => l.fields[f.id])) {
                            notify(
                              'This field has customer values. Clear those values before deleting the field.',
                              'error',
                            );
                            return;
                          }
                          setData((d) => ({ ...d, fields: d.fields.filter((x) => x.id !== f.id) }));
                          log('Configuration', `Deleted empty custom field ${f.name}.`);
                          notify('Custom field removed.');
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                {!data.fields.some((f) => f.pipeline === data.pipeline) && (
                  <Empty
                    title="Your process is unique"
                    text="Add a field to capture what matters for this pipeline."
                  />
                )}
              </div>
            </Panel>
          )}
          {activeTab === 'Roles & permissions' && (
            <Panel
              title="The right access for every person"
              description="Owner, Admin, and User are base levels. Manager is a configurable permission profile."
            >
              <div className="form-body">
                <div className="role-base-grid">
                  {['Owner', 'Admin', 'User'].map((r) => (
                    <div key={r}>
                      <ShieldCheck size={20} />
                      <strong>{r}</strong>
                      <p>
                        {r === 'Owner'
                          ? 'Full workspace control'
                          : r === 'Admin'
                            ? 'Configure without changing Owner'
                            : 'Permission-based access'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="permission-title">
                  <h3>User permission profile</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!can('owner')}
                    onClick={() => {
                      setData((d) => ({
                        ...d,
                        permissions: {
                          ...d.permissions,
                          view: true,
                          edit: true,
                          assignment: true,
                          audit: true,
                        },
                      }));
                      log(
                        'Permission change',
                        'Applied Manager permission profile to User demo role.',
                      );
                      notify('Manager profile applied to demo Users.');
                    }}
                  >
                    Apply Manager profile
                  </Button>
                </div>
                {Object.entries(permissionLabels).map(([p, label]) => (
                  <label className="check-row" key={p}>
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      disabled={!can('owner')}
                      checked={data.permissions[p] || false}
                      onChange={(e) => {
                        setData((d) => ({
                          ...d,
                          permissions: { ...d.permissions, [p]: e.target.checked },
                        }));
                        log(
                          'Permission change',
                          `${e.target.checked ? 'Granted' : 'Removed'} ${label.toLowerCase()} for User demo role.`,
                        );
                      }}
                    />
                  </label>
                ))}
                <div className="integration-hint">
                  <LockKeyhole size={17} />
                  <p>
                    UI permissions are a preview only. Person 1 must enforce workspace isolation,
                    authorization, and value masking in every API response and export.
                  </p>
                </div>
              </div>
            </Panel>
          )}
          {activeTab === 'Notifications' && (
            <Panel
              title="Important moments, delivered"
              description="Choose where your personal escalation alerts should go."
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  setData((d) => ({ ...d, notificationDestination: String(f.get('destination')) }));
                  log('Configuration', 'Updated personal notification destination.');
                  notify(
                    'Notification preference saved locally. Telegram delivery is not connected.',
                    'info',
                  );
                }}
              >
                <div className="form-body">
                  <div className="personal-calendar">
                    <div className="permission-title">
                      <h3>Your Google Calendar</h3>
                      <Badge>Not connected</Badge>
                    </div>
                    <p className="muted">
                      Connect your own account with consent. Demo calendar fixtures do not represent
                      a real OAuth connection.
                    </p>
                    <div className="inline-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          notify(
                            'Google OAuth is not connected. Your backend must start the consent flow; no account was connected.',
                            'info',
                          )
                        }
                      >
                        Connect Google Calendar
                        <ArrowUpRight size={13} />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled>
                        Disconnect
                      </Button>
                    </div>
                  </div>
                  <Field label="Notification provider">
                    <select>
                      <option>Telegram</option>
                    </select>
                  </Field>
                  <Field
                    label="Your Telegram chat ID"
                    hint="Start the bot first. This is a destination identifier, never a bot token."
                  >
                    <input
                      name="destination"
                      defaultValue={data.notificationDestination}
                      placeholder="e.g. 123456789"
                      pattern="-?[0-9]+"
                      required
                    />
                  </Field>
                  <div className="notification-example">
                    <Badge tone="green">
                      <Bell size={12} />
                      Escalation alert preview
                    </Badge>
                    <h3>A lead needs your attention</h3>
                    <p>Phoenix Baker · WhatsApp</p>
                    <p>Reason: response window expired. You are now the accountable owner.</p>
                    <span className="text-link">
                      Open lead
                      <ArrowUpRight size={13} />
                    </span>
                  </div>
                  <p className="muted">
                    Your backend should deliver alerts in the same minute, retry temporary failures,
                    and expose delivery errors to Admins.
                  </p>
                </div>
                <div className="settings-footer">
                  <Button>Save notification preference</Button>
                </div>
              </form>
            </Panel>
          )}
        </div>
      </div>
      <Dialog
        open={fieldDialog}
        onOpenChange={setFieldDialog}
        title="A field for the way you work"
        description={`Add a custom field to ${data.pipeline}. It appears on record forms immediately.`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const name = String(f.get('name')).trim();
            if (
              data.fields.some(
                (x) => x.pipeline === data.pipeline && x.name.toLowerCase() === name.toLowerCase(),
              )
            ) {
              notify('Choose a unique field name for this pipeline.', 'error');
              return;
            }
            const field: CustomField = {
              id: crypto.randomUUID(),
              name,
              type: String(f.get('type')) as CustomField['type'],
              pipeline: data.pipeline,
              requiredStage: String(f.get('requiredStage')),
              options: String(f.get('options')),
            };
            setData((d) => ({ ...d, fields: [...d.fields, field] }));
            log(
              'Configuration',
              `Added ${field.type.toLowerCase()} field ${field.name} to ${field.pipeline}.`,
            );
            setFieldDialog(false);
            notify('Custom field added to forms and details.');
          }}
        >
          <div className="form-body">
            <Field label="Field name">
              <input name="name" required maxLength={45} placeholder="e.g. Budget range" />
            </Field>
            <Field label="Field type">
              <select name="type">
                {['Text', 'Number', 'Date', 'Dropdown', 'Checkbox'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Dropdown options" hint="Comma-separated. Used only for dropdown fields.">
              <input name="options" placeholder="Small business, Mid-market, Enterprise" />
            </Field>
            <Field label="Required when entering stage">
              <select name="requiredStage">
                <option value="">Optional at every stage</option>
                {data.stages.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="dialog-footer">
            <Button type="button" variant="secondary" onClick={() => setFieldDialog(false)}>
              Cancel
            </Button>
            <Button>Create field</Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Start fresh with sample data?"
        description="This removes local changes, saved lists, notes, and demo settings in this browser."
      >
        <div className="dialog-footer">
          <Button variant="secondary" onClick={() => setResetOpen(false)}>
            Keep my changes
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              reset();
              setResetOpen(false);
            }}
          >
            Reset demo workspace
          </Button>
        </div>
      </Dialog>
    </>
  );
}
export function AuditPage() {
  const { data, can } = useDemo();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [actor, setActor] = useState('all');
  const [date, setDate] = useState('all');
  const [page, setPage] = useState(1);
  if (!can('audit'))
    return (
      <>
        <PageHeading
          title="Audit history"
          description="Read-only accountability for every important change."
        />
        <Empty
          title="Audit permission required"
          text="Ask your workspace Owner to grant access to the audit history."
        />
      </>
    );
  const list = [...data.activities]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .filter(
      (a) =>
        (type === 'all' || a.type === type) &&
        (actor === 'all' || a.actor === actor) &&
        (date === 'all' || new Date(a.time).toDateString() === new Date().toDateString()) &&
        `${a.text} ${a.actor} ${a.leadId || ''}`.toLowerCase().includes(search.toLowerCase()),
    );
  return (
    <>
      <PageHeading
        eyebrow="ACCOUNTABILITY, BY DESIGN"
        title="Every action has a story."
        description="A read-only timeline of who did what, when, and why."
      >
        <Badge tone="green">
          <ShieldCheck size={13} />
          History is protected
        </Badge>
      </PageHeading>
      <Panel>
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search activity…"
          />
          <div className="toolbar-right">
            <Select
              label="All events"
              value={type}
              onChange={(v) => {
                setType(v);
                setPage(1);
              }}
              all
              options={[...new Set(data.activities.map((a) => a.type))].map((t) => ({
                value: t,
                label: t,
              }))}
            />
            <Select
              label="All actors"
              value={actor}
              onChange={(v) => {
                setActor(v);
                setPage(1);
              }}
              all
              options={[...new Set(data.activities.map((a) => a.actor))].map((t) => ({
                value: t,
                label: t,
              }))}
            />
            <Select
              label="Any date"
              value={date}
              onChange={(v) => {
                setDate(v);
                setPage(1);
              }}
              all
              options={[{ value: 'today', label: 'Today' }]}
            />
          </div>
        </div>
        <div className="audit-list">
          {list.slice((page - 1) * 15, page * 15).map((a) => (
            <div className="audit-event" key={a.id}>
              <span className={`audit-icon ${a.type === 'Escalation' ? 'audit-warning' : ''}`}>
                {a.type === 'Escalation' ? (
                  <ShieldAlert size={17} />
                ) : a.type === 'Payment' ? (
                  <WalletIcon />
                ) : (
                  <History size={17} />
                )}
              </span>
              <div className="grow">
                <div>
                  <Badge tone={a.type === 'Escalation' ? 'amber' : 'neutral'}>{a.type}</Badge>
                  {a.leadId && <code>{a.leadId}</code>}
                </div>
                <h3>{a.text}</h3>
                <p>
                  {a.actor} <span>·</span> {new Date(a.time).toLocaleString()}
                </p>
                {a.before && (
                  <div className="audit-diff">
                    <span>{a.before}</span>
                    <ArrowRight size={12} />
                    <span>{a.after}</span>
                  </div>
                )}
              </div>
              <time>{relative(a.time)}</time>
            </div>
          ))}
        </div>
        {!list.length && (
          <Empty title="No matching events" text="Try a different event type, actor, or date." />
        )}
        <div className="table-pagination">
          <span>{list.length} matching events · No edit or delete controls</span>
          <div>
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span>{page}</span>
            <Button
              size="sm"
              variant="secondary"
              disabled={page * 15 >= list.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Panel>
    </>
  );
}
function WalletIcon() {
  return <span>$</span>;
}
