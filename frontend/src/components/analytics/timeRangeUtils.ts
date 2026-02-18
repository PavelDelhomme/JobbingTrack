import type { TimeRangeOption } from './TimeRangeSelector';

export function getPeriodMs(
  range: TimeRangeOption,
  windowEnd: Date
): { start: Date; end: Date; limit: number } {
  const end = new Date(windowEnd);
  const now = Date.now();
  let start: Date;
  let limit: number;
  switch (range) {
    case 'today': {
      start = new Date(end);
      start.setHours(0, 0, 0, 0);
      const endOfDay = new Date(start);
      endOfDay.setHours(23, 59, 59, 999);
      const effectiveEnd = end.getTime() > endOfDay.getTime() ? endOfDay : end;
      limit = Math.min(1440, Math.ceil((effectiveEnd.getTime() - start.getTime()) / (60 * 1000)));
      return { start, end: effectiveEnd, limit };
    }
    case '1h':
      start = new Date(end.getTime() - 60 * 60 * 1000);
      limit = 60;
      break;
    case '6h':
      start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
      limit = 360;
      break;
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      limit = 1440;
      break;
    case '3d':
      start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
      limit = 4320;
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      limit = 10080;
      break;
    case '14d':
      start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);
      limit = 20160;
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      limit = 43200;
      break;
    default:
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      limit = 1440;
  }
  return { start, end, limit };
}

export function formatRangeLabel(
  start: Date,
  end: Date,
  range: TimeRangeOption
): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  if (range === 'today') return fmt(start);
  if (range === '1h' || range === '6h' || range === '24h') {
    return `${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `Du ${fmt(start)} au ${fmt(end)}`;
}
