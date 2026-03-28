/** Parse "HH:mm" to minutes from midnight. */
export function timeToMinutes(t: string): number {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(t.trim());
  if (!m) throw new Error(`Invalid time (expected HH:mm): ${t}`);
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidTime(t: string): boolean {
  return /^([01]?\d|2[0-3]):([0-5]\d)$/.test(t.trim());
}

/** True if [a0,a1] overlaps [b0,b1] (half-open could be used; we use inclusive touch as overlap). */
export function rangesOverlap(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): boolean {
  return a0 < b1 && b0 < a1;
}

export function assertValidBlock(startTime: string, endTime: string) {
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    throw new Error("Blocks must use 24h HH:mm strings");
  }
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new Error("Block startTime must be before endTime");
  }
}
