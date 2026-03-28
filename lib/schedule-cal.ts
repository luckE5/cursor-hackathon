/** Calendar math for weekly planner (local day, HH:mm strings). */

/** Planner day canvas (matches smart scheduler working window start). */
export const DAY_START_MIN = 8 * 60; // 08:00
export const DAY_END_MIN = 23 * 60; // 23:00
export const SLOT_MINUTES = 30;
export const SNAP_MINUTES = 15;
export const DAY_RANGE_MIN = DAY_END_MIN - DAY_START_MIN;
export const SLOT_COUNT = DAY_RANGE_MIN / SLOT_MINUTES;

export type CalBlock = {
  startTime: string;
  endTime: string;
  type: "task" | "free" | "meeting";
  label?: string;
  description?: string;
  meetingLink?: string;
};

export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function snapMin(m: number, step = SNAP_MINUTES): number {
  return Math.round(m / step) * step;
}

export function clampDay(m: number): number {
  return Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, m));
}

export function minutesToTopPct(m: number): number {
  const clamped = clampDay(m);
  return ((clamped - DAY_START_MIN) / DAY_RANGE_MIN) * 100;
}

export function durationToHeightPct(startM: number, endM: number): number {
  const s = clampDay(startM);
  const e = clampDay(endM);
  return Math.max(0, ((e - s) / DAY_RANGE_MIN) * 100);
}

/** Greedy column assignment for overlapping intervals (same day). */
export function layoutOverlappingBlocks(
  blocks: CalBlock[],
): Map<number, { col: number; cols: number }> {
  const indexed = blocks.map((b, i) => ({ b, i }));
  const sorted = [...indexed].sort(
    (a, c) => timeToMin(a.b.startTime) - timeToMin(c.b.startTime),
  );
  const colEnds: number[] = [];
  const assignments: { index: number; col: number }[] = [];
  for (const { b, i } of sorted) {
    const s = timeToMin(b.startTime);
    const e = timeToMin(b.endTime);
    let col = 0;
    while (col < colEnds.length && colEnds[col] > s) col++;
    if (col === colEnds.length) colEnds.push(e);
    else colEnds[col] = Math.max(colEnds[col], e);
    assignments.push({ index: i, col });
  }
  const cols = Math.max(1, colEnds.length);
  const map = new Map<number, { col: number; cols: number }>();
  for (const a of assignments) {
    map.set(a.index, { col: a.col, cols });
  }
  return map;
}

export function yToMinutes(y: number, heightPx: number): number {
  if (heightPx <= 0) return DAY_START_MIN;
  const ratio = Math.max(0, Math.min(1, y / heightPx));
  return snapMin(DAY_START_MIN + ratio * DAY_RANGE_MIN);
}
