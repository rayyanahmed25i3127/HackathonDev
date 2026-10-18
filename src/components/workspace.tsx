'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  Users,
  Columns3,
  ShieldAlert,
  ContactRound,
  Building2,
  MessageSquare,
  Wallet,
  CalendarDays,
  Plug,
  History,
  Settings2,
  Search,
  Bell,
  ChevronDown,
  ChevronsUpDown,
  PanelLeftClose,
  Menu,
  X,
  Plus,
  Command,
  Check,
  HelpCircle,
  LogOut,
  UserRound,
  Mail,
  LockKeyhole,
  Layers3,
  Sun,
  Globe,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Info,
  AlertCircle,
} from 'lucide-react';
import { DemoProvider, useDemo, getRecovery } from './demo-provider';
import { Avatar, Badge, Empty, Field, SearchInput } from './shared';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import Dashboard from './dashboard';
import { LeadsPage, PipelinePage, CompaniesPage } from './leads';
import { CreateRecord, LeadDetail } from './lead-detail';
import {
  CalendarPage,
  ConversationsPage,
  IntegrationsPage,
  PaymentsPage,
  ServiceAction,
} from './services';
import { AuditPage, SettingsPage, TeamPage } from './settings';
import { type Role, relative } from '@/lib/types';
import { supabase } from '@/lib/supabase/browser';
const navigation = [
  {
    group: 'WORKSPACE',
    items: [
      { label: 'Overview', href: '/', icon: LayoutDashboard },
      { label: 'Leads', href: '/leads', icon: Users },
      { label: 'Pipeline', href: '/pipeline', icon: Columns3 },
      { label: 'Recovery queue', href: '/recovery', icon: ShieldAlert },
    ],
  },
  {
    group: 'CUSTOMER RELATIONSHIPS',
    items: [
      { label: 'Contacts', href: '/contacts', icon: ContactRound },
      { label: 'Companies', href: '/companies', icon: Building2 },
      { label: 'Conversations', href: '/conversations', icon: MessageSquare },
      { label: 'Payments', href: '/payments', icon: Wallet },
      { label: 'Appointments', href: '/calendar', icon: CalendarDays },
    ],
  },
  {
    group: 'MANAGE',
    items: [
      { label: 'Team', href: '/team', icon: Users },
      { label: 'Integrations', href: '/integrations', icon: Plug },
      { label: 'Audit history', href: '/audit', icon: History },
      { label: 'Settings', href: '/settings', icon: Settings2 },
    ],
  },
];
export default function Workspace() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? (
    <DemoProvider>
      <Suspense fallback={<Loading />}>
        <WorkspaceInner />
      </Suspense>
    </DemoProvider>
  ) : (
    <Loading />
  );
}
function Loading() {
  return (
    <div className="skeleton-shell" role="status" aria-label="Getting your workspace ready">
      <aside aria-hidden="true">
        <div className="brand">
          <div className="brand-mark">
            r<span />
          </div>
          <span>relay.</span>
        </div>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="skeleton skeleton-nav" />
        ))}
      </aside>
      <div className="skeleton-main" aria-hidden="true">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-subtitle" />
        <div className="skeleton skeleton-banner" />
        <div className="skeleton-stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
        <div className="skeleton-panels">
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      </div>
      <p className="sr-only">Getting your workspace ready…</p>
    </div>
  );
}
function WorkspaceInner() {
  const pathname = usePathname();
  // Normalize the catch-all route so a trailing slash cannot select a stale screen.
  const routePath = pathname.replace(/\/+$/, '') || '/';
  const router = useRouter();
  const { data, setData, ready, toast, select, notify, visibleLeads, can } = useDemo();
  const [mobile, setMobile] = useState(false);
  const [create, setCreate] = useState(false);
  const [profile, setProfile] = useState(false);
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [action, setAction] = useState<{ type: string; leadId?: string; editId?: string } | null>(
    null,
  );
  const recovery = getRecovery(visibleLeads, data.rules.idleHours);
  const current = navigation.flatMap((g) => g.items).find((i) => i.href === routePath);
  const title = current?.label || 'Workspace';
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    setMobile(false);
  }, [pathname]);
  if (!ready) return <Loading />;
  if (routePath === '/login' || routePath === '/signup' || routePath === '/forgot-password')
    return <AuthScreen mode={routePath.slice(1)} />;
  if (routePath === '/capture') return <CaptureScreen />;
  const kind =
    routePath === '/contacts' ? 'contact' : routePath === '/pipeline' ? 'opportunity' : 'lead';
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="mobile-scrim"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
        <Link href="/" className="brand">
          <div className="brand-mark">
            r<span />
          </div>
          <span>
            relay<span className="brand-period">.</span>
          </span>
          <span className="brand-version">WORKSPACE</span>
        </Link>
        <button className="workspace-switch" onClick={() => setProfile(true)}>
          <span className="workspace-mini-logo">
            <Layers3 size={18} />
          </span>
          <span>
            <strong>Acme Studio</strong>
            <small>Business workspace</small>
          </span>
          <ChevronsUpDown size={14} />
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((g) => (
            <div className="nav-group" key={g.group}>
              <h2>{g.group}</h2>
              {g.items
                .filter((i) => i.href !== '/audit' || can('audit'))
                .map((i) => (
                  <Link
                    href={i.href}
                    key={i.href}
                    className={`nav-item ${routePath === i.href ? 'active' : ''}`}
                    aria-current={routePath === i.href ? 'page' : undefined}
                  >
                    <i.icon size={17} strokeWidth={1.7} />
                    <span>{i.label}</span>
                    {i.href === '/recovery' && recovery.length > 0 && (
                      <span className="nav-count">{recovery.length}</span>
                    )}
                    {i.href === '/conversations' && <span className="nav-message-dot" />}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="demo-card" onClick={() => setHelp(true)}>
            <span>
              <span className="tiny-dot" />
              WORKSPACE STATUS
              <ArrowUpRight size={13} />
            </span>
            <p>
              A safe space to explore.
              <br />
              Your real data comes next.
            </p>
          </button>
          <button className="profile-button" onClick={() => setProfile(true)}>
            <Avatar name="Rayyan Ahmed" color="violet" small />
            <span>
              <strong>Rayyan Ahmed</strong>
              <small>{data.role} · Acme Studio</small>
            </span>
            <ChevronsUpDown size={14} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-toggle"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb-workspace">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{title}</strong>
            <Badge tone="neutral">Active</Badge>
          </div>
          <div className="topbar-right">
            <button className="global-search" onClick={() => setSearchOpen(true)}>
              <Search size={15} />
              <span>Search anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="notification-button"
              aria-label="Open notifications"
              onClick={() => setNotifications(true)}
            >
              <Bell size={18} />
              {recovery.length > 0 && <i />}
            </button>
            <button
              className="topbar-avatar"
              aria-label="Open profile"
              onClick={() => setProfile(true)}
            >
              <Avatar name="Rayyan Ahmed" color="violet" small />
            </button>
          </div>
        </header>
        <main className="main-content" id="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={routePath}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {routePath === '/' ? (
                <Dashboard onCreate={() => setCreate(true)} />
              ) : routePath === '/leads' ? (
                <LeadsPage key={pathname} onCreate={() => setCreate(true)} />
              ) : routePath === '/recovery' ? (
                <LeadsPage key={pathname} recovery onCreate={() => setCreate(true)} />
              ) : routePath === '/contacts' ? (
                <LeadsPage key={pathname} contacts onCreate={() => setCreate(true)} />
              ) : routePath === '/pipeline' ? (
                <PipelinePage onCreate={() => setCreate(true)} />
              ) : routePath === '/companies' ? (
                <CompaniesPage />
              ) : routePath === '/conversations' ? (
                <ConversationsPage />
              ) : routePath === '/payments' ? (
                <PaymentsPage onCreate={() => setAction({ type: 'payment' })} />
              ) : routePath === '/calendar' ? (
                <CalendarPage
                  onCreate={() => setAction({ type: 'appointment' })}
                  onEdit={(editId) => setAction({ type: 'appointment', editId })}
                />
              ) : routePath === '/integrations' ? (
                <IntegrationsPage />
              ) : routePath === '/team' ? (
                <TeamPage />
              ) : routePath === '/audit' ? (
                <AuditPage />
              ) : routePath === '/settings' ? (
                <SettingsPage />
              ) : (
                <Empty
                  title="This page has moved"
                  text="Head back to your workspace overview."
                  action={
                    <Link href="/" className="btn btn-primary">
                      Back to overview
                    </Link>
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
          <footer className="main-footer">
            <span>
              <span className="footer-logo">r.</span>Every lead, moving forward.
            </span>
            <button onClick={() => setHelp(true)}>
              <HelpCircle size={13} />
              Help & demo guide
            </button>
          </footer>
        </main>
      </div>
      <CreateRecord open={create} onClose={() => setCreate(false)} kind={kind} />
      <LeadDetail onAction={(type, leadId) => setAction({ type, leadId })} />
      <ServiceAction
        key={action ? `${action.type}-${action.leadId}-${action.editId}` : 'none'}
        action={action}
        onClose={() => setAction(null)}
      />
      <Dialog
        open={profile}
        onOpenChange={setProfile}
        title="Your workspace"
        description="Acme Studio · Connected workspace"
      >
        <div className="form-body">
          <div className="profile-dialog-person">
            <Avatar name="Rayyan Ahmed" />
            <div>
              <h3>Rayyan Ahmed</h3>
              <p>rayyan@example.com</p>
            </div>
          </div>
          <Field
            label="Preview as a base level"
            hint="This changes the UI preview. It does not provide authentication or server-side security."
          >
            <select
              value={data.role}
              onChange={(e) => {
                setData((d) => ({ ...d, role: e.target.value as Role }));
                notify(`Previewing the ${e.target.value} experience.`, 'info');
              }}
            >
              <option>Owner</option>
              <option>Admin</option>
              <option>User</option>
            </select>
          </Field>
          <p className="muted">
            User previews show Rayyan’s own leads and figures. Opportunity values follow the
            configured permission profile.
          </p>
          <Link href="/capture" className="profile-link" onClick={() => setProfile(false)}>
            <Globe size={16} />
            Open public lead form
            <ArrowUpRight size={14} />
          </Link>
          <Link href="/login" className="profile-link" onClick={() => setProfile(false)}>
            <LogOut size={16} />
            Open sign-in preview
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </Dialog>
      <Dialog
        open={help}
        onOpenChange={setHelp}
        title="Meet your next business workspace."
        description="Relay is your connected workspace for every lead."
      >
        <div className="form-body">
          <div className="help-step">
            <span>01</span>
            <div>
              <h3>Bring a new lead in</h3>
              <p>Create a lead to see local round-robin assignment and a response countdown.</p>
            </div>
          </div>
          <div className="help-step">
            <span>02</span>
            <div>
              <h3>Keep the next step clear</h3>
              <p>
                Acknowledge a lead, add a note, move its stage, or reassign it to an available
                teammate.
              </p>
            </div>
          </div>
          <div className="help-step">
            <span>03</span>
            <div>
              <h3>Reconnect with at-risk leads</h3>
              <p>
                Review the recovery queue and the read-only activity history. Change availability to
                test local reassignment.
              </p>
            </div>
          </div>
          <div className="integration-hint">
            <Info size={17} />
            <p>
              Changes stay in this browser. Supabase authentication, database persistence, real-time
              updates, server automation, and external provider connections are placeholders. No
              messages, invitations, or payments are sent.
            </p>
          </div>
        </div>
        <div className="dialog-footer">
          <Button onClick={() => setHelp(false)}>
            Got it
            <Check size={14} />
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Find your next step"
        description="Search leads, customers, companies, and workspace pages."
      >
        <div className="command-search">
          <SearchInput value={query} onChange={setQuery} placeholder="Search workspace…" />
        </div>
        <div className="command-results">
          {visibleLeads
            .filter(
              (l) =>
                query &&
                `${l.name} ${l.company} ${l.email}`.toLowerCase().includes(query.toLowerCase()),
            )
            .slice(0, 6)
            .map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  select(l.id);
                  setSearchOpen(false);
                }}
              >
                <Avatar name={l.name} small />
                <span>
                  <strong>{l.name}</strong>
                  <small>
                    {l.company} · {l.id}
                  </small>
                </span>
                <ArrowUpRight size={14} />
              </button>
            ))}
          {navigation
            .flatMap((g) => g.items)
            .filter(
              (i) =>
                i.label.toLowerCase().includes(query.toLowerCase()) &&
                (i.href !== '/audit' || can('audit')),
            )
            .slice(0, query ? 5 : 7)
            .map((i) => (
              <button
                key={i.href}
                onClick={() => {
                  router.push(i.href);
                  setSearchOpen(false);
                }}
              >
                <i.icon size={17} />
                <span>{i.label}</span>
                <ArrowRight size={14} />
              </button>
            ))}
          {query &&
            !visibleLeads.some((l) =>
              `${l.name} ${l.company} ${l.email}`.toLowerCase().includes(query.toLowerCase()),
            ) &&
            !navigation
              .flatMap((g) => g.items)
              .some((i) => i.label.toLowerCase().includes(query.toLowerCase())) && (
              <Empty title="No results found" text="Try a customer name, company, or page name." />
            )}
        </div>
      </Dialog>
      <Dialog
        open={notifications}
        onOpenChange={setNotifications}
        title="Your attention, where it matters"
        description="Workspace notifications and alerts."
      >
        {recovery.map((l) => (
          <button
            className="notification-row"
            key={l.id}
            onClick={() => {
              setNotifications(false);
              select(l.id);
            }}
          >
            <span className="notification-icon">
              <ShieldAlert size={18} />
            </span>
            <span>
              <strong>{l.name} needs a follow-up</strong>
              <small>
                {l.company} ·{' '}
                {l.escalations >= 2 ? 'Repeated escalation' : 'Response or activity overdue'}
              </small>
            </span>
            <ArrowUpRight size={15} />
          </button>
        ))}
        {!recovery.length && (
          <Empty title="You’re all caught up" text="Nothing needs your attention right now." />
        )}
      </Dialog>
      {createPortal(
        <div aria-live="polite" aria-atomic="true" className="toast-region">
          <AnimatePresence>
            {toast && (
              <motion.div
                className={`toast toast-${toast.tone}`}
                role={toast.tone === 'error' ? 'alert' : 'status'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                {toast.tone === 'error' ? (
                  <AlertCircle size={18} />
                ) : toast.tone === 'info' ? (
                  <Info size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                <span>{toast.text}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </div>
  );
}
function AuthScreen({ mode }: { mode: string }) {
  const { notify } = useDemo();
  const router = useRouter();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSignup = mode === 'signup',
    isReset = mode === 'forgot-password';
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Link href="/" className="brand">
          <div className="brand-mark">
            r<span />
          </div>
          <span>relay.</span>
        </Link>
        <div className="auth-story-main">
          <Badge tone="green">EVERY LEAD, MOVING FORWARD</Badge>
          <h1>
            Good business
            <br />
            starts with a<br />
            <em>real connection.</em>
          </h1>
          <p>
            One workspace for the people, conversations, and opportunities that move your business
            forward.
          </p>
          <div className="auth-illustration">
            <div className="auth-float-card">
              <span className="tiny-dot" />
              New lead assigned
              <CheckCircle2 size={17} />
            </div>
            <div className="auth-connection">
              <Avatar name="Olivia Rhye" color="amber" />
              <span />
              <div className="auth-relay-mark">r.</div>
              <span />
              <Avatar name="Rayyan Ahmed" color="violet" />
            </div>
            <div className="auth-float-card second">
              <ShieldCheck size={17} />
              No lead left behind.<span>↗</span>
            </div>
          </div>
        </div>
        <span className="auth-copyright">A little more clarity. A lot more possibility.</span>
      </section>
      <section className="auth-form-side">
        <Link href="/" className="auth-back">
          <ArrowLeft size={14} />
          Back to workspace
        </Link>
        <div className="auth-form-content">
          <span className="auth-symbol">
            <LockKeyhole size={24} />
          </span>
          <h2>
            {isReset
              ? 'Let’s get you back in.'
              : isSignup
                ? 'A fresh start for your team.'
                : 'Welcome back.'}
          </h2>
          <p>
            {isReset
              ? 'Request a secure link to reset your password.'
              : isSignup
                ? 'Create your workspace. Give every lead a clear path.'
                : 'Your next great customer conversation is waiting.'}
          </p>
          {submitted ? (
            <div className="integration-hint">
              <Info size={20} />
              <p>
                {submitted}
              </p>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError('');
                setLoading(true);
                const form = new FormData(e.currentTarget);
                const email = String(form.get('email') ?? '');
                const password = String(form.get('password') ?? '');
                const result = isReset
                  ? await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/login`,
                    })
                  : isSignup
                    ? await supabase.auth.signUp({
                        email,
                        password,
                        options: { data: { full_name: String(form.get('name') ?? '') } },
                      })
                    : await supabase.auth.signInWithPassword({ email, password });
                setLoading(false);
                if (result.error) setError(result.error.message);
                else if (isReset) setSubmitted('Password reset email requested. Check your inbox.');
                else router.push('/');
              }}
            >
              {isSignup && (
                <>
                  <Field label="Your name">
                    <input name="name" required autoComplete="name" placeholder="Rayyan Ahmed" />
                  </Field>
                  <Field label="Workspace name">
                    <input name="workspace" required placeholder="Your company" />
                  </Field>
                </>
              )}
              <Field label="Work email">
                <input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
              </Field>
              {!isReset && (
                <Field label="Password">
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    placeholder="At least 8 characters"
                  />
                </Field>
              )}
              {!isSignup && !isReset && (
                <Link href="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              )}
              <Button disabled={loading}>
                {loading
                  ? 'Please wait…'
                  : isReset
                    ? 'Send reset link'
                    : isSignup
                      ? 'Create workspace'
                      : 'Sign in'}
                <ArrowRight size={15} />
              </Button>
              {error && <p className="form-error" role="alert">{error}</p>}
            </form>
          )}
          <div className="auth-divider">
            <span>or explore first</span>
          </div>
          <Link href="/" className="btn btn-secondary auth-demo">
            Open workspace
            <ArrowUpRight size={15} />
          </Link>
          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : 'New to Relay?'}{' '}
            <Link href={isSignup ? '/login' : '/signup'}>
              {isSignup ? 'Sign in' : 'Create a workspace'}
            </Link>
          </p>
          <p className="auth-note">
            <ShieldCheck size={13} />
            Secure workspace access.
          </p>
        </div>
      </section>
    </div>
  );
}
function CaptureScreen() {
  const { data, setData } = useDemo();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="capture-layout">
      <Link href="/" className="brand">
        <div className="brand-mark">
          r<span />
        </div>
        <span>relay.</span>
      </Link>
      <section className="capture-card">
        <Badge tone="green">ACME STUDIO</Badge>
        <h1>Let’s start a conversation.</h1>
        <p>Tell us a little about yourself. We’ll connect you with the right person.</p>
        {done ? (
          <div className="capture-success">
            <CheckCircle2 size={40} />
            <h2>Your request has been received.</h2>
            <p>Your request was added locally. No real submission was sent to a server.</p>
            <Link href="/leads" className="btn btn-primary">
              View in workspace
              <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const eligible = data.team.filter(
                (t) =>
                  t.status === 'Available' &&
                  data.leads.filter((l) => l.ownerId === t.id && !['Won', 'Lost'].includes(l.stage))
                    .length < t.limit,
              );
              if (!eligible.length) {
                setError(
                  'The team is at capacity. Please try later or adjust team availability.',
                );
                return;
              }
              const now = new Date().toISOString(),
                id = `LD-${Date.now().toString().slice(-6)}`,
                name = String(f.get('name'));
              const lead = {
                id,
                name,
                company: String(f.get('company')),
                email: String(f.get('email')),
                phone: String(f.get('phone')),
                source: 'Website' as const,
                ownerId: eligible[data.leads.length % eligible.length].id,
                stage: 'New',
                value: 0,
                tag: 'Follow up',
                createdAt: now,
                assignedAt: now,
                deadline: new Date(Date.now() + data.rules.window * 1000).toISOString(),
                lastAction: now,
                escalations: 0,
                notes: [String(f.get('message'))],
                fields: {},
              };
              setData((d) => ({
                ...d,
                leads: [lead, ...d.leads],
                activities: [
                  {
                    id: crypto.randomUUID(),
                    leadId: id,
                    actor: 'System (demo)',
                    type: 'Assignment',
                    text: `Captured ${name} through the public form and assigned one owner.`,
                    time: now,
                  },
                  ...d.activities,
                ],
              }));
              setDone(true);
            }}
          >
            <Field label="Full name">
              <input name="name" required autoComplete="name" placeholder="Your name" />
            </Field>
            <Field label="Email address">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
              />
            </Field>
            <div className="form-grid">
              <Field label="Company">
                <input name="company" required placeholder="Company name" />
              </Field>
              <Field label="Phone number">
                <input name="phone" type="tel" required placeholder="+1 415 555 0123" />
              </Field>
            </div>
            <Field label="How can we help?">
              <textarea
                name="message"
                required
                maxLength={2000}
                placeholder="A little about what you’re looking for…"
              />
            </Field>
            {error && <p className="inline-error">{error}</p>}
            <Button>
              Get in touch
              <ArrowUpRight size={15} />
            </Button>
            <p className="capture-note">Secure request form.</p>
          </form>
        )}
      </section>
      <span className="capture-powered">
        Powered by <strong>relay.</strong> Every lead, moving forward.
      </span>
    </div>
  );
}
