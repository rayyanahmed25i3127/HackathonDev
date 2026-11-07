export const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME?.trim() || 'RASS';
export const clinicTimezone = process.env.APP_TIMEZONE?.trim() || 'Asia/Karachi';

export function normalizePkPhone(input: string): string {
  const compact = input.trim().replace(/[\s()-]/g, '');
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;
  const normalized = digits.startsWith('0') ? `92${digits.slice(1)}` : digits.startsWith('3') ? `92${digits}` : digits;
  if (!/^923\d{9}$/.test(normalized)) throw new Error('Enter a valid Pakistan mobile number.');
  return `+${normalized}`;
}

export function isValidCnic(input: string): boolean { return /^\d{5}-\d{7}-\d$/.test(input.trim()); }

export function formatPkrPaisa(paisa: number | null | undefined): string {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Math.round((paisa ?? 0) / 100));
}

export function formatPkDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: clinicTimezone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(typeof value === 'string' ? new Date(value) : value);
}

export function formatPkTime(value: string | Date): string {
  return new Intl.DateTimeFormat('en-PK', { timeZone: clinicTimezone, hour: 'numeric', minute: '2-digit', hour12: true }).format(typeof value === 'string' ? new Date(value) : value);
}
