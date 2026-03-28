/**
 * Pure time helpers for the scheduler (minutes-from-midnight model).
 */

import type { TimeSlot } from "../scheduler/models";

/** Merge overlapping or adjacent slots (within `gapMerge` minutes). */
export function mergeTimeSlots(
  slots: TimeSlot[],
  gapMerge = 0,
): TimeSlot[] {
  if (!slots.length) return [];
  const sorted = [...slots].sort((a, b) => a.start - b.start);
  const out: TimeSlot[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur.start <= last.end + gapMerge) {
      last.end = Math.max(last.end, cur.end);
    } else {
      out.push({ ...cur });
    }
  }
  return out.filter((s) => s.end > s.start);
}

/** Remove occupied [cut.start, cut.end) from a single slot; may return 0–2 pieces. */
export function subtractOneSlot(slot: TimeSlot, cut: TimeSlot): TimeSlot[] {
  const out: TimeSlot[] = [];
  if (cut.end <= slot.start || cut.start >= slot.end) {
    return [slot];
  }
  if (slot.start < cut.start) {
    out.push({ start: slot.start, end: Math.min(slot.end, cut.start) });
  }
  if (cut.end < slot.end) {
    out.push({ start: Math.max(slot.start, cut.end), end: slot.end });
  }
  return out.filter((s) => s.end > s.start);
}

/**
 * Subtract many occupied intervals from free slots.
 * Overlapping cuts are merged first to reduce work.
 */
export function subtractIntervals(
  free: TimeSlot[],
  occupied: TimeSlot[],
): TimeSlot[] {
  let result = mergeTimeSlots(free);
  const cuts = mergeTimeSlots(occupied);
  for (const cut of cuts) {
    const next: TimeSlot[] = [];
    for (const s of result) {
      next.push(...subtractOneSlot(s, cut));
    }
    result = mergeTimeSlots(next);
  }
  return result.filter((s) => s.end > s.start);
}

/** Clamp every slot to [minStart, maxEnd]; drop empty. */
export function clampSlots(
  slots: TimeSlot[],
  minStart: number,
  maxEnd: number,
): TimeSlot[] {
  const out: TimeSlot[] = [];
  for (const s of slots) {
    const start = Math.max(s.start, minStart);
    const end = Math.min(s.end, maxEnd);
    if (end > start) out.push({ start, end });
  }
  return mergeTimeSlots(out);
}

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function minutesToHHmm(total: number): string {
  const m = Math.max(0, Math.round(total));
  const h = Math.floor(m / 60) % 24;
  const mi = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const x = HHMM.exec(hhmm.trim());
  if (!x) throw new Error(`Invalid HH:mm: ${hhmm}`);
  return parseInt(x[1], 10) * 60 + parseInt(x[2], 10);
}
