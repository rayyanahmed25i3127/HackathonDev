'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Download,
  ArrowUpRight,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Bookmark,
  Check,
  GripVertical,
  MoreHorizontal,
  ShieldAlert,
  ArrowRight,
  Columns3,
  List,
  Building2,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useDemo, getRecovery } from './demo-provider';
import {
  Avatar,
  Badge,
  PageHeading,
  Panel,
  Owner,
  StageBadge,
  Source,
  Countdown,
  Empty,
  SearchInput,
  Select,
  Value,
  exportLeads,
  Field,
} from './shared';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { type Lead, recoveryReason, currency, relative } from '@/lib/types';
export function LeadsPage({
  onCreate,
  recovery = false,
  contacts = false,
}: {
  onCreate: () => void;
  recovery?: boolean;
  contacts?: boolean;
}) {
  const { data, visibleLeads, select, can, notify, setData } = useDemo();
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState(params.get('stage') || 'all');
  const [source, setSource] = useState('all');
  const [owner, setOwner] = useState('all');
  const [tag, setTag] = useState('all');
  const [date, setDate] = useState(params.get('date') || 'all');
  const [page, setPage] = useState(1);
  const [savedName, setSavedName] = useState('');
  const [save, setSave] = useState(false);
  const [filters, setFilters] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const base = recovery ? getRecovery(visibleLeads, data.rules.idleHours) : visibleLeads;
  const list = base.filter(
    (l) =>
      `${l.name} ${l.company} ${l.email} ${l.id}`.toLowerCase().includes(search.toLowerCase()) &&
      (stage === 'all' || l.stage === stage) &&
      (source === 'all' || l.source === source) &&
      (owner === 'all' || l.ownerId === owner) &&
      (tag === 'all' || l.tag === tag) &&
      (date !== 'today' || new Date(l.createdAt).toDateString() === new Date().toDateString()) &&
      (params.get('ack') !== 'yes' || !!l.acknowledgedAt),
  );
  const pageCount = Math.max(1, Math.ceil(list.length / 8));
  const safePage = Math.min(page, pageCount);
  const shown = list.slice((safePage - 1) * 8, safePage * 8);
  const filterCount = [stage, source, owner, tag, date].filter((x) => x !== 'all').length;
  return (
    <>
      <PageHeading
        eyebrow={
          recovery ? 'LEAD PROTECTION' : contacts ? 'CUSTOMER RELATIONSHIPS' : 'LEAD MANAGEMENT'
        }
        title={
          recovery
            ? 'A second chance to connect.'
            : contacts
              ? 'People behind the pipeline.'
              : 'Every lead. A clear next step.'
        }
        description={
          recovery
            ? 'Overdue, escalated, or quiet for too long. Bring these conversations back to life.'
            : contacts
              ? 'Customer context, conversations, and opportunities, all in one place.'
              : 'Capture the interest. Keep the conversation moving.'
        }
      >
        <Button
          variant="secondary"
          disabled={!can('export')}
          onClick={() => {
            exportLeads(list, can('values'));
            notify('Filtered records exported as CSV.');
          }}
        >
          <Download size={15} />
          Export
        </Button>
        <Button onClick={onCreate} disabled={!can('create')}>
          <Plus size={16} />
          {contacts ? 'Add contact' : 'New lead'}
        </Button>
      </PageHeading>
      {recovery && (
        <div className="recovery-stats">
          {[
            {
              label: 'Response overdue',
              count: base.filter(
                (l) => !l.acknowledgedAt && new Date(l.deadline).getTime() < Date.now(),
              ).length,
              tone: 'red',
            },
            {
              label: 'Repeated escalation',
              count: base.filter((l) => l.escalations >= 2).length,
              tone: 'amber',
            },
            {
              label: 'No recent activity',
              count: base.filter(
                (l) =>
                  Date.now() - new Date(l.lastAction).getTime() > data.rules.idleHours * 3600000 &&
                  !['Won', 'Lost'].includes(l.stage),
              ).length,
              tone: 'violet',
            },
          ].map((s) => (
            <div key={s.label}>
              <Badge tone={s.tone}>
                <ShieldAlert size={13} />
                {s.label}
              </Badge>
              <strong>{String(s.count).padStart(2, '0')}</strong>
              <span>leads to follow up</span>
            </div>
          ))}
        </div>
      )}
      <Panel className="records-panel">
        <div className="record-tabs">
          <button
            className={owner === 'all' ? 'active' : ''}
            onClick={() => {
              setStage('all');
              setOwner('all');
              setSource('all');
              setTag('all');
              setDate('all');
            }}
          >
            All {contacts ? 'contacts' : recovery ? 'at-risk leads' : 'leads'}
            <span>{base.length}</span>
          </button>
          <button
            className={owner === 'rayyan' ? 'active' : ''}
            onClick={() => setOwner(owner === 'rayyan' ? 'all' : 'rayyan')}
          >
            Assigned to me
          </button>
          {data.savedLists.map((s) => (
            <button
              key={s.name}
              onClick={() => {
                setSource(s.source);
                setStage(s.stage);
                setOwner(s.owner);
                setTag(s.tag);
                setDate(s.date);
                setPage(1);
                notify(`Opened “${s.name}”.`, 'info');
              }}
            >
              <Bookmark size={12} />
              {s.name}
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={contacts ? 'Search contacts…' : 'Search leads…'}
          />
          <div className="toolbar-right">
            <Select
              label="All stages"
              value={stage}
              onChange={setStage}
              all
              options={data.stages.map((s) => ({ value: s, label: s }))}
            />
            <Select
              label="All owners"
              value={owner}
              onChange={setOwner}
              all
              options={data.team.map((t) => ({ value: t.id, label: t.name }))}
            />
            <Button variant="secondary" size="sm" onClick={() => setFilters(!filters)}>
              <Filter size={14} />
              Filters{filterCount > 0 && <span className="filter-count">{filterCount}</span>}
            </Button>
          </div>
        </div>
        {filters && (
          <div className="expanded-filters">
            <Select
              label="All sources"
              value={source}
              onChange={setSource}
              all
              options={['Website', 'WhatsApp', 'Manual', 'Referral'].map((s) => ({
                value: s,
                label: s,
              }))}
            />
            <Select
              label="All tags"
              value={tag}
              onChange={setTag}
              all
              options={['High intent', 'Follow up', 'Enterprise'].map((s) => ({
                value: s,
                label: s,
              }))}
            />
            <Select
              label="Any date"
              value={date}
              onChange={setDate}
              all
              options={[{ value: 'today', label: 'Created today' }]}
            />
            <Button variant="ghost" size="sm" onClick={() => setSave(true)}>
              <Bookmark size={13} />
              Save list
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStage('all');
                setSource('all');
                setOwner('all');
                setTag('all');
                setDate('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
        {checked.length > 0 && (
          <div className="selection-bar">
            <Check size={14} />
            {checked.length} selected
            <Button
              size="sm"
              variant="ghost"
              disabled={!can('export')}
              onClick={() =>
                exportLeads(
                  list.filter((l) => checked.includes(l.id)),
                  can('values'),
                )
              }
            >
              <Download size={13} />
              Export selected
            </Button>
            <button onClick={() => setChecked([])}>Clear selection</button>
          </div>
        )}
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input
                    type="checkbox"
                    aria-label="Select visible records"
                    checked={shown.length > 0 && shown.every((l) => checked.includes(l.id))}
                    onChange={(e) => setChecked(e.target.checked ? shown.map((l) => l.id) : [])}
                  />
                </th>
                <th>
                  {contacts ? 'Contact name' : 'Lead name'}
                  <ArrowDown size={12} />
                </th>
                <th>Stage</th>
                <th>Source</th>
                <th>Owner</th>
                {!contacts && <th>{recovery ? 'Recovery reason' : 'Response status'}</th>}
                <th>{contacts ? 'Email address' : 'Value'}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((l, i) => (
                <tr key={l.id}>
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      aria-label={`Select ${l.name}`}
                      checked={checked.includes(l.id)}
                      onChange={(e) =>
                        setChecked((c) =>
                          e.target.checked ? [...c, l.id] : c.filter((id) => id !== l.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <button className="record-person" onClick={() => select(l.id)}>
                      <Avatar
                        name={l.name}
                        color={['violet', 'amber', 'pink', 'blue', 'teal'][i % 5]}
                      />
                      <span>
                        <strong>{l.name}</strong>
                        <small>{l.company}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <StageBadge stage={l.stage} />
                  </td>
                  <td>
                    <Source source={l.source} />
                  </td>
                  <td>
                    <Owner id={l.ownerId} />
                  </td>
                  {!contacts && (
                    <td>
                      {recovery ? (
                        <Badge tone="amber">{recoveryReason(l, data.rules.idleHours)}</Badge>
                      ) : (
                        <Countdown lead={l} />
                      )}
                    </td>
                  )}
                  <td>
                    {contacts ? (
                      <span className="muted">{l.email}</span>
                    ) : (
                      <span className="table-money">
                        <Value amount={l.value} />
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="icon-link"
                      onClick={() => select(l.id)}
                      aria-label={`Open ${l.name}`}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && (
          <Empty
            title="No matching records"
            text="Try a different search or clear a filter to see more results."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStage('all');
                  setSource('all');
                  setOwner('all');
                  setTag('all');
                  setDate('all');
                }}
              >
                Clear search & filters
              </Button>
            }
          />
        )}
        <div className="table-pagination">
          <span>
            {list.length ? `${(safePage - 1) * 8 + 1}–${Math.min(safePage * 8, list.length)}` : '0'}{' '}
            of {list.length} {contacts ? 'contacts' : 'leads'}
          </span>
          <div>
            <Button
              size="sm"
              variant="secondary"
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft size={14} />
              Previous
            </Button>
            <span>
              Page {safePage} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={safePage === pageCount}
              onClick={() => setPage(safePage + 1)}
            >
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Panel>
      <p className="page-footnote">
        <span className="tiny-dot" />
        {contacts
          ? 'One customer record. Every conversation connected.'
          : 'Connected workspace · Changes are saved to your account.'}
      </p>
      <Dialog
        open={save}
        onOpenChange={setSave}
        title="Save a dynamic list"
        description="This list updates as records start or stop matching your filters."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (data.savedLists.some((l) => l.name === savedName.trim())) {
              notify('Choose a unique list name.', 'error');
              return;
            }
            setData((d) => ({
              ...d,
              savedLists: [
                ...d.savedLists,
                { name: savedName.trim(), source, stage, owner, tag, date },
              ],
            }));
            setSave(false);
            notify('Saved list created.');
          }}
        >
          <div className="form-body">
            <Field label="List name">
              <input
                required
                maxLength={35}
                value={savedName}
                onChange={(e) => setSavedName(e.target.value)}
                placeholder="e.g. High-intent website leads"
              />
            </Field>
            <p className="muted">
              {filterCount} active criteria · {list.length} matching records
            </p>
          </div>
          <div className="dialog-footer">
            <Button type="button" variant="secondary" onClick={() => setSave(false)}>
              Cancel
            </Button>
            <Button>Save list</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
export function PipelinePage({ onCreate }: { onCreate: () => void }) {
  const { data, visibleLeads, select, updateLead, can, notify, setData } = useDemo();
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState('all');
  const [view, setView] = useState('board');
  const [drag, setDrag] = useState<string | null>(null);
  const leads = visibleLeads.filter(
    (l) =>
      (l.pipeline || 'Sales pipeline') === data.pipeline &&
      `${l.name} ${l.company}`.toLowerCase().includes(search.toLowerCase()) &&
      (owner === 'all' || l.ownerId === owner),
  );
  const move = (id: string, stage: string) => {
    const l = data.leads.find((l) => l.id === id);
    if (!l || l.stage === stage) return;
    const missing = data.fields.filter(
      (f) => f.pipeline === data.pipeline && f.requiredStage === stage && !l.fields[f.id],
    );
    if (missing.length) {
      notify(
        `Complete ${missing.map((f) => f.name).join(', ')} in the lead details before moving to ${stage}.`,
        'error',
      );
      select(id);
      return;
    }
    updateLead(
      id,
      { stage, acknowledgedAt: l.acknowledgedAt || new Date().toISOString() },
      'Stage change',
      `${l.name} moved to ${stage}.`,
    );
  };
  return (
    <>
      <PageHeading
        eyebrow="OPPORTUNITIES"
        title="Turn conversations into wins."
        description="A shared view of every opportunity, from first hello to a signed deal."
      >
        <Button onClick={onCreate} disabled={!can('create')}>
          <Plus size={16} />
          Add opportunity
        </Button>
      </PageHeading>
      <div className="pipeline-toolbar">
        <Select
          label="Pipeline"
          value={data.pipeline}
          onChange={(v) => setData((d) => ({ ...d, pipeline: v }))}
          options={['Sales pipeline', 'Service pipeline'].map((s) => ({ value: s, label: s }))}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Find an opportunity…" />
        <Select
          label="All owners"
          value={owner}
          onChange={setOwner}
          all
          options={data.team.map((t) => ({ value: t.id, label: t.name }))}
        />
        <div className="segmented">
          <button
            className={view === 'board' ? 'active' : ''}
            onClick={() => setView('board')}
            aria-label="Board view"
          >
            <Columns3 size={16} />
          </button>
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>
      {view === 'board' ? (
        <div className="kanban">
          {data.stages.map((s, i) => {
            const list = leads.filter((l) => l.stage === s);
            return (
              <section
                key={s}
                className={`kanban-column ${params.get('stage') === s ? 'highlight-column' : ''}`}
                onDragOver={(e) => {
                  if (can('edit')) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  move(e.dataTransfer.getData('text/plain'), s);
                  setDrag(null);
                }}
              >
                <div className="kanban-heading">
                  <span className={`stage-dot stage-color-${i % 6}`} />
                  <h2>{s}</h2>
                  <span className="kanban-count">{list.length}</span>
                  <button
                    aria-label={`Add opportunity to ${s}`}
                    onClick={onCreate}
                    disabled={!can('create')}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <div className="kanban-value">
                  <Value amount={list.reduce((sum, l) => sum + l.value, 0)} />
                  <span>total value</span>
                </div>
                <div className="kanban-cards">
                  {list.map((l) => (
                    <article
                      className={`opportunity-card ${drag === l.id ? 'dragging' : ''}`}
                      key={l.id}
                      draggable={can('edit')}
                      onDragStart={(e) => {
                        setDrag(l.id);
                        e.dataTransfer.setData('text/plain', l.id);
                      }}
                      onDragEnd={() => setDrag(null)}
                    >
                      <div className="opportunity-top">
                        <Badge
                          tone={
                            l.tag === 'High intent'
                              ? 'green'
                              : l.tag === 'Enterprise'
                                ? 'violet'
                                : 'neutral'
                          }
                        >
                          {l.tag}
                        </Badge>
                        <GripVertical size={14} />
                      </div>
                      <button className="opportunity-name" onClick={() => select(l.id)}>
                        {l.name}
                        <ArrowUpRight size={14} />
                      </button>
                      <span className="opportunity-company">
                        <Building2 size={12} />
                        {l.company}
                      </span>
                      <strong className="opportunity-value">
                        <Value amount={l.value} />
                      </strong>
                      <Source source={l.source} />
                      <div className="opportunity-bottom">
                        <Owner id={l.ownerId} />
                        <Countdown lead={l} />
                      </div>
                      <label className="stage-control">
                        <span className="sr-only">Stage for {l.name}</span>
                        <select
                          disabled={!can('edit')}
                          value={l.stage}
                          onChange={(e) => move(l.id, e.target.value)}
                        >
                          {data.stages.map((st) => (
                            <option key={st}>{st}</option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))}
                  {!list.length && (
                    <div className="kanban-empty">
                      Drop an opportunity here
                      <br />
                      <span>or create a new one</span>
                    </div>
                  )}
                </div>
                <button className="kanban-add" onClick={onCreate} disabled={!can('create')}>
                  <Plus size={14} />
                  Add opportunity
                </button>
              </section>
            );
          })}
        </div>
      ) : (
        <Panel>
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Company</th>
                  <th>Value</th>
                  <th>Owner</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <button className="text-link" onClick={() => select(l.id)}>
                        {l.name}
                      </button>
                    </td>
                    <td>{l.company}</td>
                    <td>
                      <Value amount={l.value} />
                    </td>
                    <td>
                      <Owner id={l.ownerId} />
                    </td>
                    <td>
                      <select
                        aria-label={`Stage for ${l.name}`}
                        disabled={!can('edit')}
                        value={l.stage}
                        onChange={(e) => move(l.id, e.target.value)}
                      >
                        {data.stages.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <p className="page-footnote">
        Drag cards between stages, or use their stage selector. Required fields are checked before a
        move.
      </p>
    </>
  );
}
export function CompaniesPage() {
  const { visibleLeads, select, can } = useDemo();
  const [search, setSearch] = useState('');
  const companies = [...new Set(visibleLeads.map((l) => l.company))].filter((c) =>
    c.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="CUSTOMER RELATIONSHIPS"
        title="Your network, connected."
        description="Every company. Every relationship. The bigger picture."
      />
      <div className="company-search">
        <SearchInput value={search} onChange={setSearch} placeholder="Search companies…" />
      </div>
      <div className="company-grid">
        {companies.map((c, i) => {
          const leads = visibleLeads.filter((l) => l.company === c);
          return (
            <Panel key={c}>
              <div className="company-card">
                <span className={`company-logo company-logo-${i % 4}`}>
                  <Building2 size={23} />
                </span>
                <h2>{c}</h2>
                <span className="muted">
                  {leads.length} contact · {leads.length} opportunity
                </span>
                <div className="company-value">
                  <span>Open pipeline value</span>
                  <strong>
                    <Value
                      amount={leads
                        .filter((l) => !['Won', 'Lost'].includes(l.stage))
                        .reduce((s, l) => s + l.value, 0)}
                    />
                  </strong>
                </div>
                {leads.map((l) => (
                  <button className="company-contact" key={l.id} onClick={() => select(l.id)}>
                    <Avatar name={l.name} small />
                    <span>{l.name}</span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
      {!companies.length && (
        <Empty title="No companies found" text="Try a different company name." />
      )}
    </>
  );
}
