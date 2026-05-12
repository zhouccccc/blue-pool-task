import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to parse current ISO format
const fmtWeek = (d: dayjs.Dayjs) => `${d.isoWeekYear()}-W${String(d.isoWeek()).padStart(2, '0')}`;

export function getCurrentWeekStr(): string {
  return fmtWeek(dayjs());
}

export function getNextWeekStr(currentWeekStr: string): string {
  if (!currentWeekStr || !currentWeekStr.includes('-W')) return getCurrentWeekStr();
  const [yStr, wStr] = currentWeekStr.split('-W');
  const d = dayjs().year(parseInt(yStr, 10)).isoWeek(parseInt(wStr, 10)).startOf('isoWeek').add(1, 'week');
  return fmtWeek(d);
}

export function getWeekOptions() {
  // Generates 6 items: 4 past weeks, this week, 1 next week
  const now = dayjs();
  const offsets = [-4, -3, -2, -1, 0, 1];
  return offsets.map(offset => {
    const d = now.add(offset, 'week');
    const val = fmtWeek(d);
    let label = `W${d.isoWeek()}`;
    if (offset === 0) label += ' (本周)';
    else if (offset === 1) label += ' (下周)';
    return { value: val, label: `${label} [${d.startOf('isoWeek').format('MM/DD')} - ${d.endOf('isoWeek').format('MM/DD')}]` };
  });
}

export function formatWeekRange(weekStr: string | number | undefined) {
  if (!weekStr) return '';
  const str = String(weekStr);
  if (!str.includes('-W')) {
    return `W${str}`;
  }
  
  const [, weekNumStr] = str.split('-W');
  const week = parseInt(weekNumStr, 10);
  if (isNaN(week)) return str;

  return `W${week}`;
}

export function getWeekDateRange(weekStr: string | number | undefined) {
  if (!weekStr) return '';
  const str = String(weekStr);
  if (!str.includes('-W')) return '';

  const [yearStr, weekNumStr] = str.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekNumStr, 10);
  if (isNaN(year) || isNaN(week)) return '';

  const d = dayjs().year(year).isoWeek(week).startOf('isoWeek');
  return `${d.format('MM/DD')} - ${d.endOf('isoWeek').format('MM/DD')}`;
}
