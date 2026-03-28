import {
  addWeeks,
  format,
  startOfWeek,
  isSameWeek,
  isToday,
} from "date-fns";

/** Monday-based ISO dates for Mon–Sun */
export function getWeekIsoDates(anchor: Date): string[] {
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return format(d, "yyyy-MM-dd");
  });
}

export function weekRangeLabel(anchor: Date): string {
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const y = format(monday, "yyyy");
  if (format(monday, "MMM") === format(sunday, "MMM")) {
    return `${format(monday, "MMM d")} – ${format(sunday, "d, yyyy")}`;
  }
  return `${format(monday, "MMM d")} – ${format(sunday, "MMM d, yyyy")}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export { addWeeks, isSameWeek, isToday, format, startOfWeek };
