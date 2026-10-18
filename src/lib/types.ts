export type Stage = string;
export type Availability = 'Available' | 'Busy' | 'On leave' | 'Offline';
export type Role = 'Owner' | 'Admin' | 'User';
export interface Employee {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: Role;
  status: Availability;
  limit: number;
  calendar: boolean;
  email: string;
}
export interface Lead {
  pipeline?: string;
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: 'Website' | 'WhatsApp' | 'Manual' | 'Referral';
  ownerId: string;
  stage: Stage;
  value: number;
  tag: string;
  createdAt: string;
  assignedAt: string;
  deadline: string;
  acknowledgedAt?: string;
  escalations: number;
  lastAction: string;
  notes: string[];
  optedOut?: boolean;
  fields: Record<string, string>;
}
export interface Activity {
  id: string;
  leadId?: string;
  actor: string;
  type: string;
  text: string;
  time: string;
  before?: string;
  after?: string;
}
export interface Payment {
  id: string;
  leadId: string;
  amount: number;
  currency: string;
  status: 'Paid' | 'Pending' | 'Failed' | 'Expired' | 'Abandoned' | 'Refunded';
  requestedBy: string;
  reference: string;
  time: string;
}
export interface Appointment {
  id: string;
  leadId: string;
  ownerId: string;
  title: string;
  start: string;
  duration: number;
  status: 'Scheduled' | 'Cancelled';
  location: string;
}
export interface Message {
  id: string;
  leadId: string;
  text: string;
  direction: 'in' | 'out';
  status: 'Received' | 'Delivered' | 'Sent' | 'Failed';
  time: string;
  error?: string;
}
export interface CustomField {
  id: string;
  name: string;
  type: 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Checkbox';
  pipeline: string;
  requiredStage: string;
  options?: string;
}
export interface Rules {
  levelWindows?: number[];
  window: number;
  idleHours: number;
  backupId: string;
  managerId: string;
  levels: number;
  method: 'Round robin';
}
export interface DemoState {
  leads: Lead[];
  team: Employee[];
  stages: string[];
  fields: CustomField[];
  activities: Activity[];
  payments: Payment[];
  appointments: Appointment[];
  messages: Message[];
  rules: Rules;
  role: Role;
  hiddenMetrics: string[];
  savedLists: {
    name: string;
    source: string;
    stage: string;
    owner: string;
    tag: string;
    date: string;
  }[];
  pipeline: string;
  notificationDestination: string;
  permissions: Record<string, boolean>;
}
export const currency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
export const shortMoney = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : currency(n);
export const relative = (date: string) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  return m < 1
    ? 'Just now'
    : m < 60
      ? `${m}m ago`
      : m < 1440
        ? `${Math.floor(m / 60)}h ago`
        : `${Math.floor(m / 1440)}d ago`;
};
export const recoveryReason = (l: Lead, idle = 24) =>
  !l.acknowledgedAt && new Date(l.deadline).getTime() < Date.now()
    ? 'Response overdue'
    : l.escalations >= 2
      ? 'Repeated escalation'
      : !['Won', 'Lost'].includes(l.stage) &&
          Date.now() - new Date(l.lastAction).getTime() > idle * 3600000
        ? 'No recent activity'
        : '';
