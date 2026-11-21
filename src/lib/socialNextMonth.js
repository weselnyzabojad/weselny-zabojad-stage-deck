import { venueTodayISO } from './socialDayMinusOne.js';

export const NEXT_MONTH_PAGE_SIZE = 4;

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function nextMonthTarget(now = new Date(), timeZone = 'UTC') {
  const today = venueTodayISO(timeZone, now);
  const [year, month] = today.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return { year: nextYear, month: nextMonth, iso: `${nextYear}-${String(nextMonth).padStart(2, '0')}` };
}

export function isNextMonthWindow(now = new Date(), timeZone = 'UTC') {
  const today = venueTodayISO(timeZone, now);
  const [year, month, day] = today.split('-').map(Number);
  return day > daysInMonth(year, month) - 7;
}

function weddingRow(row) {
  return {
    id: row?.wedding_id ?? row?.id ?? null,
    bride: row?.bride_name ?? row?.bride ?? row?.cartridge?.coupleProfile?.bride?.firstName ?? null,
    groom: row?.groom_name ?? row?.groom ?? row?.cartridge?.coupleProfile?.groom?.firstName ?? null,
    city: row?.venue_city ?? row?.city ?? null,
    country: row?.venue_country ?? row?.country ?? null,
    dateISO: row?.dateISO ?? row?.cartridge?.extensions?.dateISO ?? null,
  };
}

export function buildNextMonthModel({
  weddings = [],
  now = new Date(),
  timeZone = 'UTC',
} = {}) {
  const target = nextMonthTarget(now, timeZone);
  const rows = (Array.isArray(weddings) ? weddings : [])
    .map(weddingRow)
    .filter((row) => row.dateISO && row.dateISO.startsWith(target.iso))
    .sort((left, right) => left.dateISO.localeCompare(right.dateISO));
  const pages = [];
  for (let index = 0; index < rows.length; index += NEXT_MONTH_PAGE_SIZE) {
    pages.push({
      page: pages.length + 1,
      total: Math.ceil(rows.length / NEXT_MONTH_PAGE_SIZE),
      weddings: rows.slice(index, index + NEXT_MONTH_PAGE_SIZE),
    });
  }
  return {
    available: isNextMonthWindow(now, timeZone),
    target,
    weddings: rows,
    pages,
    hasData: rows.length > 0,
  };
}

export function nextMonthFileName(year, month, page = 1) {
  return `stage-deck-next-month-${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${page}.png`;
}

export function nextMonthCaptionLines(model, locale = 'fr', page = 0) {
  if (!model.hasData) {
    return [
      locale === 'fr' ? 'Aucun mariage le mois prochain' : 'Brak wesel w przyszłym miesiącu',
      `${model.target.month}/${model.target.year}`,
    ];
  }
  const group = model.pages[page] ?? model.pages[0];
  const lines = [
    locale === 'fr'
      ? `Mois prochain ${model.target.month}/${model.target.year} · ${group.page}/${group.total}`
      : `Następny miesiąc ${model.target.month}/${model.target.year} · ${group.page}/${group.total}`,
  ];
  for (const wedding of group.weddings) {
    const date = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'pl-PL', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${wedding.dateISO}T12:00:00Z`));
    lines.push(
      [
        [wedding.bride, wedding.groom].filter(Boolean).join(' & ') || '—',
        wedding.city || '—',
        wedding.country || '—',
        date,
      ].join(' · '),
    );
  }
  return lines;
}
