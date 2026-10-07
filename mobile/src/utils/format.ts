export const formatMoney = (amountMinor: number, currency = 'INR'): string => {
  const major = Math.abs(amountMinor) / 100;
  const formatted = major.toLocaleString('en-IN', { minimumFractionDigits: major % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
  const sign = amountMinor < 0 ? '-' : '';
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;
  return `${sign}${symbol}${formatted}`;
};

export const formatDistance = (km: number): string => {
  if (!Number.isFinite(km)) return '--';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
};

export const formatMinutes = (minutes?: number | null): string => {
  if (minutes === undefined || minutes === null || !Number.isFinite(minutes)) return '-- min';
  if (minutes < 1) return 'Arriving now';
  return `${Math.round(minutes)} min`;
};

const pad = (n: number) => String(n).padStart(2, '0');

export const formatTime = (iso?: string | null): string => {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ampm}`;
};

export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${formatTime(iso)}`;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const formatRelativeTime = (iso?: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24 && startOfDay(date) === startOfDay(new Date())) return `${hours}h ago`;
  const days = Math.floor((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (days === 0) return formatTime(iso);
  if (days === 1) return `Yesterday, ${formatTime(iso)}`;
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const initialsOf = (name?: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + second).toUpperCase();
};

export const maskPhone = (phone?: string | null): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};
