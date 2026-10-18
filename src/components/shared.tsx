'use client';
import { useState, type ReactNode } from 'react';
import {
  Globe2,
  MessageCircle,
  UserRoundPlus,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Search,
  Plus,
  Inbox,
  Download,
  SlidersHorizontal,
} from 'lucide-react';
import { useDemo } from './demo-provider';
import { Button } from './ui/button';
import { type Employee, type Lead, currency } from '@/lib/types';
export function Avatar({
  name,
  color = 'violet',
  small = false,
}: {
  name: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <span className={`avatar avatar-${color} ${small ? 'avatar-sm' : ''}`} aria-label={name}>
      {name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')}
    </span>
  );
}
export function Badge({
  children,
  tone = 'neutral',
  dot = false,
}: {
  children: ReactNode;
  tone?: string;
  dot?: boolean;
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="status-dot" />}
      {children}
    </span>
  );
}
export function StageBadge({ stage }: { stage: string }) {
  return (
    <Badge
      dot
      tone={
        (
          {
            New: 'blue',
            Contacted: 'violet',
            Qualified: 'teal',
            Proposal: 'amber',
            Won: 'green',
            Lost: 'neutral',
          } as Record<string, string>
        )[stage] || 'blue'
      }
    >
      {stage}
    </Badge>
  );
}
export function Source({ source }: { source: string }) {
  return (
    <span className="source">
      <span className={`source-symbol source-${source.toLowerCase()}`}>
        {source === 'WhatsApp' ? (
          <MessageCircle size={9} />
        ) : source === 'Website' ? (
          <Globe2 size={9} />
        ) : source === 'Referral' ? (
          <UserRoundPlus size={9} />
        ) : (
          <Plus size={9} />
        )}
      </span>
      {source}
    </span>
  );
}
export function Owner({ id, compact = false }: { id: string; compact?: boolean }) {
  const { data } = useDemo();
  const e = data.team.find((t) => t.id === id);
  return e ? (
    <span className="owner">
      <Avatar name={e.name} color={e.color} small />
      {!compact && <span>{e.name.split(' ')[0]}</span>}
    </span>
  ) : (
    <span>Unassigned</span>
  );
}
export function Countdown({ lead }: { lead: Lead }) {
  const { now } = useDemo();
  if (lead.acknowledgedAt)
    return (
      <span className="countdown done">
        <Check size={13} />
        Acknowledged
      </span>
    );
  const s = Math.ceil((new Date(lead.deadline).getTime() - now) / 1000);
  return (
    <span className={`countdown ${s <= 0 ? 'overdue' : s < 180 ? 'urgent' : ''}`}>
      <Clock3 size={13} />
      {s <= 0
        ? `${Math.floor(Math.abs(s) / 60)}m overdue`
        : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} left`}
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title = 'Nothing here yet',
  text = 'Records will appear here as your workspace grows.',
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Inbox size={23} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search records…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-input">
      <Search size={16} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
  all,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  all?: boolean;
}) {
  return (
    <label className="select-label">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {all && <option value="all">{label}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} />
    </label>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Stat({
  title,
  value,
  sub,
  icon,
  trend,
  onClick,
}: {
  title: string;
  value: string;
  sub: string;
  icon: ReactNode;
  trend?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="stat-card" onClick={onClick}>
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">
        {value}
        <ArrowUpRight size={18} className="stat-arrow" />
      </div>
      <div className="stat-bottom">
        {trend && (
          <span className="trend">
            <ArrowUp size={11} />
            {trend}
          </span>
        )}
        <span>{sub}</span>
      </div>
    </Tag>
  );
}
export function exportLeads(leads: Lead[], showValues: boolean) {
  const rows = [
    ['ID', 'Name', 'Company', 'Source', 'Stage', 'Owner', ...(showValues ? ['Value'] : [])],
    ...leads.map((l) => [
      l.id,
      l.name,
      l.company,
      l.source,
      l.stage,
      l.ownerId,
      ...(showValues ? [String(l.value)] : []),
    ]),
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""').replace(/^(\s*[=+@-])/, "'$1")}"`).join(','))
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'relay-leads.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
export function Availability({ employee }: { employee: Employee }) {
  return (
    <Badge
      tone={
        employee.status === 'Available' ? 'green' : employee.status === 'Busy' ? 'amber' : 'neutral'
      }
      dot
    >
      {employee.status}
    </Badge>
  );
}
export function Value({ amount }: { amount: number }) {
  const { can } = useDemo();
  return <>{can('values') ? currency(amount) : '••••'}</>;
}
