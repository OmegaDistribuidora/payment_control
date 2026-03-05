export function trimToNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function normalizeText(value: unknown): string | null {
  const trimmed = trimToNull(value);
  return trimmed ? trimmed.toLowerCase() : null;
}

export function toLikePattern(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? `%${normalized}%` : null;
}

export function toDateOnlyInFortaleza(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

export function parsePagination(query: Record<string, unknown>): { page: number; size: number; offset: number } {
  const rawPage = Number(query.page ?? 0);
  const rawSize = Number(query.size ?? 20);

  const page = Number.isFinite(rawPage) && rawPage >= 0 ? Math.floor(rawPage) : 0;
  const size = Number.isFinite(rawSize) && rawSize > 0 ? Math.min(Math.floor(rawSize), 200) : 20;
  const offset = page * size;
  return { page, size, offset };
}

export function toNumeric(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const direct = Number(value);
    if (Number.isFinite(direct)) return direct;
    const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
