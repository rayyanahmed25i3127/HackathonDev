'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Users,
  Clock3,
  Wallet,
  ShieldAlert,
  CalendarDays,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Check,
  Activity,
  TrendingUp,
  Layers3,
  CheckCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDemo, getRecovery } from './demo-provider';
import {
  Avatar,
  Badge,
  Panel,
  PageHeading,
  Stat,
  Owner,
  Countdown,
  Availability,
  Empty,
  Value,
} from './shared';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { currency, shortMoney, relative } from '@/lib/types';
export default function Dashboard({ onCreate }: { onCreate: () => void }) {
  const { data, visibleLeads: leads, select, can, setData } = useDemo();
  const [customize, setCustomize] = useState(false);
  const [period, setPeriod] = useState('7');
  const recovery = getRecovery(leads, data.rules.idleHours);
  const open = leads.filter((l) => !['Won', 'Lost'].includes(l.stage));
  const value = open.reduce((s, l) => s + l.value, 0);
  const today = new Date().toDateString();
  const newToday = leads.filter((l) => new Date(l.createdAt).toDateString() === today).length;
  const responses = leads.filter((l) => l.acknowledgedAt);
  const avg = responses.length
    ? Math.round(
        responses.reduce(
          (s, l) =>
            s + (new Date(l.acknowledgedAt!).getTime() - new Date(l.createdAt).getTime()) / 60000,
          0,
        ) / responses.length,
      )
    : 0;
  const payments = data.payments.filter(
    (p) =>
      leads.some((l) => l.id === p.leadId) &&
      p.status === 'Paid' &&
      new Date(p.time).getMonth() === new Date().getMonth() &&
      new Date(p.time).getFullYear() === new Date().getFullYear(),
  );
  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const appointments = data.appointments.filter(
    (a) =>
      a.status === 'Scheduled' &&
      new Date(a.start).getTime() > Date.now() &&
      leads.some((l) => l.id === a.leadId),
  );
  const escalations = data.activities.filter(
    (a) =>
      a.type === 'Escalation' &&
      Date.now() - new Date(a.time).getTime() < 86400000 &&
      leads.some((l) => l.id === a.leadId),
  ).length;
  const trend = Array.from({ length: Number(period) }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (Number(period) - 1 - i));
    const dayLeads = leads.filter(
      (l) => new Date(l.createdAt).toDateString() === date.toDateString(),
    );
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      leads: dayLeads.length,
      acknowledged: dayLeads.filter((l) => l.acknowledgedAt).length,
    };
  });
  const metrics = [
    {
      id: 'leads',
      title: 'New leads today',
      value: String(newToday).padStart(2, '0'),
      sub: `${leads.length} total in your workspace`,
      icon: <Users size={17} />,
      href: '/leads?date=today',
    },
    {
      id: 'pipeline',
      title: 'Open pipeline value',
      value: can('values') ? shortMoney(value) : '••••',
      sub: `Across ${open.length} open opportunities`,
      icon: <Layers3 size={17} />,
      href: '/pipeline',
    },
    {
      id: 'response',
      title: 'Avg. first response',
      value: `${avg} min`,
      sub: `${responses.length} acknowledged leads`,
      icon: <Clock3 size={17} />,
      href: '/leads?ack=yes',
    },
    {
      id: 'recovery',
      title: 'Leads needing attention',
      value: String(recovery.length).padStart(2, '0'),
      sub: `${escalations} escalation${escalations !== 1 ? 's' : ''} in the last 24h`,
      icon: <ShieldAlert size={17} />,
      href: '/recovery',
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE, AT A GLANCE"
        title="Good morning, Rayyan ☀"
        description="A clear view of your business. A next step for every lead."
      >
        <Button variant="secondary" onClick={() => setCustomize(true)}>
          <SlidersHorizontal size={15} />
          Customize
        </Button>
        <Button onClick={onCreate} disabled={!can('create')}>
          <Plus size={16} />
          New lead
        </Button>
      </PageHeading>
      <div className="overview-banner">
        <div className="banner-orbit">
          <ShieldAlert size={23} />
        </div>
        <div>
          <span className="banner-kicker">NO LEAD LEFT BEHIND</span>
          <h2>
            {recovery.length
              ? `${recovery.length} leads could use a little attention.`
              : 'Every lead is in good hands.'}
          </h2>
          <p>
            {recovery.length
              ? 'Your recovery queue keeps missed opportunities from slipping away.'
              : 'Your team is keeping the conversation moving forward.'}
          </p>
        </div>
        <Link className="btn banner-button" href="/recovery">
          Review recovery queue
          <ArrowUpRight size={15} />
        </Link>
        <div className="banner-art" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>
            <ArrowUpRight size={60} strokeWidth={0.8} />
          </span>
        </div>
      </div>
      <div className="stats-grid">
        {metrics
          .filter((m) => !data.hiddenMetrics.includes(m.id))
          .map((m) => (
            <Link href={m.href} key={m.id}>
              <Stat title={m.title} value={m.value} sub={m.sub} icon={m.icon} />
            </Link>
          ))}
      </div>
      <div className="dashboard-charts">
        <Panel
          title="Lead momentum"
          description="New conversations. Meaningful first responses."
          action={
            <select
              aria-label="Chart period"
              className="compact-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
          }
        >
          <div className="chart-summary">
            <span>
              {leads.length}
              <small>total leads</small>
            </span>
            <div className="chart-legend">
              <span>
                <i className="green-dot" />
                New leads
              </span>
              <span>
                <i className="pale-dot" />
                Acknowledged
              </span>
            </div>
          </div>
          <div className="area-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 15, right: 18, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4b9674" stopOpacity={0.23} />
                    <stop offset="95%" stopColor="#4b9674" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#edf0ee" strokeDasharray="3 4" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6e796a' }}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6e796a' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 10, borderColor: '#e6eae7', fontSize: 12 }}
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="leads"
                  name="New leads"
                  stroke="#397b5e"
                  strokeWidth={2.5}
                  fill="url(#leadGradient)"
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="acknowledged"
                  name="Acknowledged"
                  stroke="#b0cfc0"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel
          title="Your pipeline"
          description="A little closer to the next win."
          action={
            <Link href="/pipeline" className="icon-link" aria-label="View pipeline">
              <ArrowUpRight size={17} />
            </Link>
          }
        >
          <div className="pipeline-total">
            <Value amount={value} />
            <Badge tone="green">{open.length} open deals</Badge>
          </div>
          <div className="stage-bars">
            {data.stages
              .filter((s) => !['Won', 'Lost'].includes(s))
              .map((stage, i) => {
                const list = open.filter((l) => l.stage === stage),
                  sum = list.reduce((s, l) => s + l.value, 0);
                return (
                  <Link
                    href={`/pipeline?stage=${encodeURIComponent(stage)}`}
                    className="stage-bar-row"
                    key={stage}
                  >
                    <div>
                      <span>
                        <i
                          style={{
                            background: ['#a8c7b5', '#80aa94', '#538c70', '#2e684b'][i % 4],
                          }}
                        />
                        {stage}
                        <small>{list.length}</small>
                      </span>
                      <strong>{can('values') ? shortMoney(sum) : '••••'}</strong>
                    </div>
                    <div className="bar-track">
                      <span
                        style={{
                          width: `${value ? Math.max(5, (sum / value) * 100) : 0}%`,
                          background: ['#bed7c8', '#9abda9', '#6c9b80', '#397957'][i % 4],
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
          </div>
        </Panel>
      </div>
      <div className="dashboard-lower">
        <Panel
          title="Recovery queue"
          description="The right follow-up can change everything."
          action={
            <Link href="/recovery" className="text-link">
              View all
              <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="recovery-mini">
            {recovery.slice(0, 3).map((l) => (
              <button className="recovery-mini-row" key={l.id} onClick={() => select(l.id)}>
                <Avatar name={l.name} color={l.escalations ? 'amber' : 'pink'} />
                <div className="grow">
                  <strong>{l.name}</strong>
                  <span>
                    {l.company} <i>·</i>{' '}
                    {l.escalations >= 2
                      ? 'Escalated twice'
                      : !l.acknowledgedAt
                        ? 'Awaiting response'
                        : 'No recent activity'}
                  </span>
                </div>
                <div className="recovery-right">
                  <Owner id={l.ownerId} compact />
                  <Countdown lead={l} />
                </div>
                <ChevronRight size={15} />
              </button>
            ))}
            {!recovery.length && (
              <Empty title="All caught up" text="No leads need recovery right now." />
            )}
          </div>
          <div className="panel-foot">
            <span className="tiny-dot amber-dot" />
            Every lead has one accountable owner.
          </div>
        </Panel>
        <Panel
          title="Team availability"
          description="Good teamwork starts with visibility."
          action={
            <Link href="/team" className="text-link">
              Manage
              <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="team-mini">
            {data.team.slice(0, 4).map((e) => {
              const count = open.filter((l) => l.ownerId === e.id).length;
              return (
                <div className="team-mini-row" key={e.id}>
                  <Avatar name={e.name} color={e.color} small />
                  <div className="grow">
                    <strong>{e.name}</strong>
                    <span>
                      {count}/{e.limit} open leads
                    </span>
                  </div>
                  <Availability employee={e} />
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      <div className="dashboard-bottom">
        <Panel
          title="Coming up next"
          action={
            <Link href="/calendar" className="text-link">
              Calendar
              <ArrowRight size={14} />
            </Link>
          }
        >
          {appointments.slice(0, 2).map((a) => (
            <button key={a.id} className="appointment-mini" onClick={() => select(a.leadId)}>
              <span className="appointment-icon">
                <CalendarDays size={17} />
              </span>
              <div className="grow">
                <strong>{a.title}</strong>
                <span>
                  {leads.find((l) => l.id === a.leadId)?.name} · {a.duration} min
                </span>
              </div>
              <span className="appointment-time">
                {new Date(a.start).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </button>
          ))}
          {!appointments.length && (
            <Empty title="Your schedule is clear" text="New appointments will appear here." />
          )}
        </Panel>
        <Panel
          title="Payments this month"
          action={
            <Link href="/payments" className="icon-link" aria-label="View payments">
              <ArrowUpRight size={17} />
            </Link>
          }
        >
          <div className="payment-summary">
            <span className="payment-icon">
              <Wallet size={24} />
            </span>
            <div>
              <strong>{can('values') ? currency(collected) : '••••'}</strong>
              <span>{payments.length} sample payments collected</span>
            </div>
            <Badge tone="green">Test data</Badge>
          </div>
          <p className="metric-footnote">Collected payments only. Excludes pending requests.</p>
        </Panel>
      </div>
      <Dialog
        open={customize}
        onOpenChange={setCustomize}
        title="Make this overview yours"
        description="Choose which figures appear. Your preference stays in this browser."
      >
        <div className="form-body">
          {metrics.map((m) => (
            <label className="check-row" key={m.id}>
              <span>{m.title}</span>
              <input
                type="checkbox"
                checked={!data.hiddenMetrics.includes(m.id)}
                onChange={() =>
                  setData((d) => ({
                    ...d,
                    hiddenMetrics: d.hiddenMetrics.includes(m.id)
                      ? d.hiddenMetrics.filter((x) => x !== m.id)
                      : [...d.hiddenMetrics, m.id],
                  }))
                }
              />
            </label>
          ))}
        </div>
        <div className="dialog-footer">
          <Button onClick={() => setCustomize(false)}>Done</Button>
        </div>
      </Dialog>
    </>
  );
}
