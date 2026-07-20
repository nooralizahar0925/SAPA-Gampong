/**
 * "20 Jul 2026 · 16.40" — the shape used by the "Terakhir disimpan" label in the
 * content hub and settings headers. Returns null when there is nothing to show, so
 * callers can fall back to their own empty copy.
 */
export function formatSavedAt(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const day = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return `${day} · ${time}`;
}
