export function socialPeriod(row) {
  const iso = String(row?.dateISO ?? '').trim();
  const isoMatch = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  if (isoMatch) return { year: Number(isoMatch[1]), month: Number(isoMatch[2]) };
  const dotted = /^\d{2}\.(\d{2})\.(\d{4})$/.exec(String(row?.date ?? '').trim());
  if (dotted) return { year: Number(dotted[2]), month: Number(dotted[1]) };
  return { year: null, month: null };
}

export function firstUpcomingWedding(rows = [], now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return (
    (Array.isArray(rows) ? rows : [])
      .filter((row) => row?.dateISO && row.dateISO >= today)
      .sort((left, right) => String(left.dateISO).localeCompare(String(right.dateISO)))[0] ??
    null
  );
}
