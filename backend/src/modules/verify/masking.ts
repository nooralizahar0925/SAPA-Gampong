export function maskName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return '***';
  return `${trimmed[0].toUpperCase()}***`;
}

export function maskNik(nik: string) {
  const trimmed = nik.trim();
  if (trimmed.length < 8) return '****';
  return `${trimmed.slice(0, 4)}********${trimmed.slice(-4)}`;
}

export function buildMaskedPerihal(name?: string, nik?: string) {
  const maskedName = maskName(name ?? '');
  if (!nik) return `a.n. ${maskedName}`;
  return `a.n. ${maskedName} (NIK ${maskNik(nik)})`;
}
