'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { createDemo, STORAGE_KEY } from '@/lib/demo';
import { type DemoState, type Lead, type Activity, recoveryReason } from '@/lib/types';
import { supabase } from '@/lib/supabase/browser';
interface Context {
  data: DemoState;
  setData: Dispatch<SetStateAction<DemoState>>;
  ready: boolean;
  now: number;
  notify: (text: string, tone?: 'success' | 'info' | 'error') => void;
  toast: { text: string; tone: string } | null;
  selected: string | null;
  select: (id: string | null) => void;
  can: (permission: string) => boolean;
  visibleLeads: Lead[];
  log: (type: string, text: string, leadId?: string, before?: string, after?: string) => void;
  updateLead: (id: string, patch: Partial<Lead>, type: string, text: string) => void;
  acknowledge: (id: string) => void;
  reassign: (id: string, ownerId: string, automatic?: boolean) => void;
  reset: () => void;
}
const DemoContext = createContext<Context | null>(null);
export const useDemo = () => {
  const c = useContext(DemoContext);
  if (!c) throw new Error('DemoProvider is required');
  return c;
};
export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoState>(createDemo);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<Context['toast']>(null);
  const [selected, select] = useState<string | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.leads && parsed.permissions) setData(parsed);
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) return;
      // Authenticated workspaces must never fall back to seeded demo records.
      setData((current) => ({ ...current, leads: [] }));
      const response = await fetch('/api/v1/leads?limit=100', {
        headers: { Authorization: `Bearer ${auth.session.access_token}` },
      });
      if (!response.ok || cancelled) return;
      const payload = await response.json();
      const liveLeads: Lead[] = (payload.items ?? []).map((item: Record<string, unknown>) => ({
        id: String(item.id),
        name: String(item.name ?? ''),
        company: String(item.company ?? ''),
        email: String(item.email ?? ''),
        phone: String(item.phone ?? ''),
        source: item.source === 'whatsapp' ? 'WhatsApp' : item.source === 'web_form' ? 'Website' : 'Manual',
        ownerId: String(item.owner_id ?? ''),
        stage: String(item.status ?? 'New'),
        value: Number(item.value ?? 0),
        tag: String(item.tag ?? ''),
        createdAt: String(item.created_at ?? new Date().toISOString()),
        assignedAt: String(item.assigned_at ?? item.created_at ?? new Date().toISOString()),
        deadline: String(item.ack_deadline ?? item.created_at ?? new Date().toISOString()),
        acknowledgedAt: item.acknowledged_at ? String(item.acknowledged_at) : undefined,
        escalations: Number(item.escalation_level ?? 0),
        lastAction: String(item.updated_at ?? item.created_at ?? new Date().toISOString()),
        notes: [],
        fields: {},
      }));
      setData((current) => ({ ...current, leads: liveLeads }));
    })().catch(() => undefined);
    return () => { cancelled = true; };
  }, [ready]);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        setToast({
          text: 'Browser storage is unavailable. Changes will last only until this page closes.',
          tone: 'error',
        });
      }
    }
  }, [data, ready]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const notify = useCallback(
    (text: string, tone: 'success' | 'info' | 'error' = 'success') => setToast({ text, tone }),
    [],
  );
  const can = (p: string) =>
    data.role === 'Owner' ||
    (data.role === 'Admin' && p !== 'owner') ||
    data.permissions[p] === true;
  const event = (
    type: string,
    text: string,
    leadId?: string,
    before?: string,
    after?: string,
  ): Activity => ({
    id: crypto.randomUUID(),
    actor: 'Rayyan Ahmed',
    type,
    text,
    leadId,
    before,
    after,
    time: new Date().toISOString(),
  });
  const log = (type: string, text: string, leadId?: string, before?: string, after?: string) =>
    setData((d) => ({
      ...d,
      activities: [event(type, text, leadId, before, after), ...d.activities],
    }));
  const updateLead = (id: string, patch: Partial<Lead>, type: string, text: string) => {
    if (!can('edit')) {
      notify('Your demo role does not have edit permission.', 'error');
      return;
    }
    setData((d) => ({
      ...d,
      leads: d.leads.map((l) =>
        l.id === id ? { ...l, ...patch, lastAction: new Date().toISOString() } : l,
      ),
      activities: [
        event(
          type,
          text,
          id,
          JSON.stringify(
            Object.fromEntries(
              Object.keys(patch).map((k) => [
                k,
                d.leads.find((l) => l.id === id)?.[k as keyof Lead],
              ]),
            ),
          ),
          JSON.stringify(patch),
        ),
        ...d.activities,
      ],
    }));
    notify(text);
  };
  const acknowledge = async (id: string) => {
    const l = data.leads.find((l) => l.id === id);
    if (!l || l.acknowledgedAt) return;
    const { data: auth } = await supabase.auth.getSession();
    if (auth.session) {
      const response = await fetch(`/api/v1/leads/${id}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.session.access_token}` },
      });
      if (!response.ok) {
        notify('The server could not acknowledge this lead.', 'error');
        return;
      }
    }
    updateLead(
      id,
      { acknowledgedAt: new Date().toISOString() },
      'Acknowledgement',
      `${l.name} acknowledged. Response recorded.`,
    );
  };
  const reassign = (id: string, ownerId: string, automatic = false) => {
    const lead = data.leads.find((l) => l.id === id),
      owner = data.team.find((t) => t.id === ownerId);
    if (!lead || !owner) return;
    const count = data.leads.filter(
      (l) => l.ownerId === ownerId && !['Won', 'Lost'].includes(l.stage),
    ).length;
    if (owner.status !== 'Available' || count >= owner.limit) {
      notify('Choose an available teammate with remaining capacity.', 'error');
      return;
    }
    const time = new Date().toISOString();
    updateLead(
      id,
      {
        ownerId,
        assignedAt: time,
        deadline: new Date(Date.now() + data.rules.window * 1000).toISOString(),
        escalations: lead.escalations + (automatic ? 1 : 0),
      },
      automatic ? 'Escalation' : 'Reassignment',
      `${lead.name} ${automatic ? 'escalated' : 'reassigned'} to ${owner.name}.`,
    );
  };
  const reset = () => {
    setData(createDemo());
    select(null);
    notify('Demo workspace reset to sample data.');
  };
  return (
    <DemoContext.Provider
      value={{
        data,
        setData,
        ready,
        now,
        notify,
        toast,
        selected,
        select,
        can,
        visibleLeads: can('view')
          ? data.leads.filter((l) => data.role !== 'User' || l.ownerId === 'rayyan')
          : [],
        log,
        updateLead,
        acknowledge,
        reassign,
        reset,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
export const getRecovery = (leads: Lead[], idle: number) =>
  leads.filter((l) => recoveryReason(l, idle));
