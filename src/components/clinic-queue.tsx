'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, CalendarPlus, Check, Clock3, Plus, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/browser';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';

type Patient = { id: string; mrn: string; full_name: string; phone: string; gender?: string; age_years?: number };
type Doctor = { id: string; display_name: string; specialty: string };
type Service = { id: string; name: string; specialty?: string };
type Visit = { id: string; token_number: number; status: string; reason?: string; patients?: Patient; doctors?: Doctor; service_types?: Service };

const statuses = ['pending', 'waiting', 'in_consultation', 'done', 'no_show', 'cancelled'];
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function ClinicQueue({ patientsOnly = false }: { patientsOnly?: boolean }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [search, setSearch] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : null;
  }
  async function load() {
    const headers = await authHeaders();
    if (!headers) return;
    const patientResponse = await fetch(`/api/v1/patients?search=${encodeURIComponent(search)}`, { headers, cache: 'no-store' });
    if (!patientResponse.ok) throw new Error('Could not load patients.');
    const patientData = await patientResponse.json();
    setPatients(patientData.items ?? []);
    if (!patientsOnly) {
      const visitResponse = await fetch('/api/v1/visits', { headers, cache: 'no-store' });
      if (!visitResponse.ok) throw new Error('Could not load today’s queue.');
      const visitData = await visitResponse.json();
      setVisits(visitData.items ?? []);
    }
    const { data: doctorsData } = await supabase.from('doctors').select('id,display_name,specialty').eq('is_active', true).order('display_name');
    const { data: servicesData } = await supabase.from('service_types').select('id,name,specialty').eq('is_active', true).order('name');
    setDoctors(doctorsData ?? []);
    setServices(servicesData ?? []);
  }
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : 'Could not load records.')); }, [search]);

  const visiblePatients = useMemo(() => patients.filter((p) => `${p.full_name} ${p.phone} ${p.mrn}`.toLowerCase().includes(search.toLowerCase())), [patients, search]);
  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(e.currentTarget);
    const headers = await authHeaders();
    if (!headers) { setError('Please sign in again.'); setBusy(false); return; }
    const response = await fetch('/api/v1/patients', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: form.get('fullName'), phone: form.get('phone'), gender: form.get('gender') || undefined, ageYears: Number(form.get('ageYears')) || undefined, cnic: form.get('cnic') || undefined, whatsappOptIn: form.get('whatsappOptIn') === 'on' }) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(result.message ?? 'Patient could not be registered.'); return; }
    setMessage(`Registered ${result.patient.full_name} (${result.patient.mrn}).`); setRegisterOpen(false); await load();
  }
  async function createAppointment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    const form = new FormData(e.currentTarget); const headers = await authHeaders();
    if (!headers || !selectedPatient) return;
    const start = new Date(String(form.get('startAt'))); const end = new Date(start.getTime() + Number(form.get('minutes') || 30) * 60000);
    const response = await fetch('/api/v1/appointments', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: selectedPatient.id, doctorId: form.get('doctorId'), serviceTypeId: form.get('serviceTypeId'), startAt: start.toISOString(), endAt: end.toISOString(), reason: form.get('reason') }) });
    const result = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setError(result.message ?? 'Appointment could not be booked.'); return; }
    setMessage('Appointment booked successfully.'); setAppointmentOpen(false);
  }
  async function archivePatient(patient: Patient) {
    if (!window.confirm(`Archive ${patient.full_name}?`)) return;
    const headers = await authHeaders(); if (!headers) return;
    const response = await fetch(`/api/v1/patients?id=${patient.id}`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true }) });
    if (!response.ok) { const result = await response.json().catch(() => ({})); setError(result.message ?? 'Patient could not be archived.'); return; }
    setMessage(`${patient.full_name} was archived.`); await load();
  }
  async function updateStatus(id: string, status: string) {
    const headers = await authHeaders(); if (!headers) return;
    const response = await fetch(`/api/v1/visits?id=${id}`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!response.ok) { const result = await response.json().catch(() => ({})); setError(result.message ?? 'Status update failed.'); return; }
    await load();
  }

  return <section className="clinic-page">
    <div className="page-heading"><div><span className="eyebrow">RASS CLINIC</span><h1>{patientsOnly ? 'Patients' : "Today's queue"}</h1><p>{patientsOnly ? 'Search and register patients securely.' : 'Manage today’s visits across both doctors.'}</p></div><div className="page-actions"><Button variant="secondary" onClick={() => load()}><RefreshCw size={15} /> Refresh</Button><Button onClick={() => setRegisterOpen(true)}><Plus size={16} /> Register patient</Button></div></div>
    {message && <div className="integration-hint"><Check size={18} /> {message}</div>}{error && <div className="integration-hint error"><Clock3 size={18} /> {error}</div>}
    <div className="panel clinic-toolbar"><div className="search-input"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient name, phone, or MRN…" /></div></div>
    {patientsOnly ? <div className="panel clinic-list">{visiblePatients.map((p) => <div className="clinic-row" key={p.id}><button className="clinic-row-main" onClick={() => { setSelectedPatient(p); setAppointmentOpen(true); }}><span><strong>{p.full_name}</strong><small>{p.mrn} · {p.phone}</small></span><CalendarPlus size={17} /></button><button className="icon-button" onClick={() => archivePatient(p)} aria-label={`Archive ${p.full_name}`}><Archive size={16} /></button></div>)}{!visiblePatients.length && <p className="empty-copy">No patients found.</p>}</div> : <div className="queue-grid">{statuses.map((status) => <div className="panel queue-column" key={status}><h3>{label(status)} <span>{visits.filter((v) => v.status === status).length}</span></h3>{visits.filter((v) => v.status === status).map((v) => <article className="queue-card" key={v.id}><b>#{v.token_number} · {v.patients?.full_name ?? 'Patient'}</b><small>{v.doctors?.display_name ?? 'Doctor'} · {v.service_types?.name ?? 'Visit'}</small><select value={v.status} onChange={(e) => updateStatus(v.id, e.target.value)} aria-label={`Status for ${v.patients?.full_name ?? 'patient'}`}>{statuses.map((s) => <option value={s} key={s}>{label(s)}</option>)}</select></article>)}</div>)}</div>}
    <Dialog open={registerOpen} onOpenChange={setRegisterOpen} title="Register patient"><form className="stack-form" onSubmit={register}><label>Full name<input name="fullName" required /></label><label>Phone<input name="phone" required placeholder="03XX-XXXXXXX" /></label><label>Age<input name="ageYears" type="number" min="0" max="130" required /></label><label>Gender<select name="gender"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label><label>CNIC<input name="cnic" placeholder="#####-#######-#" /></label><label><input name="whatsappOptIn" type="checkbox" /> Patient agrees to WhatsApp appointment messages</label><Button disabled={busy}>{busy ? 'Saving…' : 'Register patient'}</Button></form></Dialog>
    <Dialog open={appointmentOpen} onOpenChange={setAppointmentOpen} title={`Book appointment${selectedPatient ? ` · ${selectedPatient.full_name}` : ''}`}><form className="stack-form" onSubmit={createAppointment}><label>Doctor<select name="doctorId" required>{doctors.map((d) => <option value={d.id} key={d.id}>{d.display_name} · {d.specialty}</option>)}</select></label><label>Service<select name="serviceTypeId" required>{services.map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Start<input name="startAt" type="datetime-local" required /></label><label>Duration<select name="minutes" defaultValue="30"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option></select></label><label>Reason<input name="reason" /></label><Button disabled={busy}>{busy ? 'Booking…' : 'Book appointment'}</Button></form></Dialog>
  </section>;
}
