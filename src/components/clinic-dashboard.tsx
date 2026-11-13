'use client';
import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, UserRound, UsersRound } from 'lucide-react';
import { supabase } from '@/lib/supabase/browser';

export default function ClinicDashboard({ name }: { name: string }) {
  const [patientCount, setPatientCount] = useState<number | null>(null);
  useEffect(() => { (async () => { const { data } = await supabase.auth.getSession(); if (!data.session) return; const r = await fetch('/api/v1/patients', { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: 'no-store' }); if (r.ok) setPatientCount((await r.json()).total ?? 0); })(); }, []);
  const firstName = name.replace(/\s*\([^)]*\)/g, '').trim().split(' ')[3] || name.split(' ')[0];
  return <div className="clinic-page clinic-dashboard"><div className="page-heading"><div><span className="eyebrow">RASS CLINIC</span><h1>Good morning, {firstName}.</h1><p>Your clinic at a glance.</p></div></div><section className="clinic-welcome panel"><div><span className="eyebrow">TODAY</span><h2>Every patient deserves a clear next step.</h2><p>Manage registrations, appointments, and visits from one calm workspace.</p></div><div className="clinic-welcome-mark"><Clock3 size={34} /></div></section><div className="clinic-stats"><div className="panel clinic-stat"><UserRound size={20}/><span>Patients</span><strong>{patientCount ?? '—'}</strong><small>Active patient records</small></div><div className="panel clinic-stat"><CalendarDays size={20}/><span>Appointments today</span><strong>0</strong><small>Scheduled visits</small></div><div className="panel clinic-stat"><UsersRound size={20}/><span>Doctors on duty</span><strong>2</strong><small>Dermatology and ophthalmology</small></div></div><section className="panel clinic-next"><div><span className="eyebrow">NEXT</span><h2>Start with your patient list</h2><p>Register a patient, then book their appointment with the appropriate doctor.</p></div><a className="btn btn-primary" href="/leads">Open patients</a></section></div>;
}
