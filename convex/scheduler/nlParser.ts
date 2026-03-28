/**
 * Rule-based natural language → fixed events + tasks for the deterministic scheduler.
 * No external APIs.
 */

import type { FixedEvent, Task } from "./models";

export type ParsedNaturalLanguage = {
  tasks: Task[];
  fixedEvents: FixedEvent[];
  preference?: "morning" | "night";
};

const LEAD_INS =
  /^(i\s+have|i\s+need\s+to|need\s+to|want\s+to|going\s+to|also|then|and\s+then)\s+/i;

function stripLeadIn(s: string): string {
  let t = s.trim();
  while (LEAD_INS.test(t)) {
    t = t.replace(LEAD_INS, "").trim();
  }
  return t;
}

/** Split on commas, semicolons, newlines, "and", "also". */
export function splitIntoSegments(input: string): string[] {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const raw = normalized.split(
    /\s*(?:\n+|;|,|\band\b|\balso\b)\s*/i,
  );
  return raw
    .map((x) => stripLeadIn(x.trim()))
    .filter((x) => x.length > 0);
}

function clampMin(m: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, m));
}

/**
 * Parse ranges like "10-2", "10:30-14:00", "9am-11:30am" within a segment.
 * Returns minutes 0–1440; clamps to working day.
 */
function parseTimeRangeMinutes(segment: string): {
  startMin: number;
  endMin: number;
  rest: string;
} | null {
  const s = segment.trim();

  const hm =
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i.exec(
      s,
    );
  if (hm) {
    let h1 = parseInt(hm[1], 10);
    const m1 = hm[2] ? parseInt(hm[2], 10) : 0;
    const ap1 = (hm[3] || "").toLowerCase();
    let h2 = parseInt(hm[4], 10);
    const m2 = hm[5] ? parseInt(hm[5], 10) : 0;
    const ap2 = (hm[6] || "").toLowerCase();
    if (ap1 === "pm" && h1 < 12) h1 += 12;
    if (ap1 === "am" && h1 === 12) h1 = 0;
    if (ap2 === "pm" && h2 < 12) h2 += 12;
    if (ap2 === "am" && h2 === 12) h2 = 0;
    if (!ap1 && !ap2 && h2 < h1) h2 += 12;
    if (!ap1 && !ap2 && h2 <= h1 && h2 < 12) h2 += 12;
    let startMin = h1 * 60 + m1;
    let endMin = h2 * 60 + m2;
    if (endMin <= startMin) endMin = Math.min(23 * 60 + 59, startMin + 60);
    const dayStart = 8 * 60;
    const dayEnd = 23 * 60;
    startMin = clampMin(startMin, dayStart, dayEnd);
    endMin = clampMin(endMin, dayStart + 15, dayEnd);
    if (endMin <= startMin) endMin = Math.min(dayEnd, startMin + 60);
    const rest = s.replace(hm[0], " ").replace(/\s+/g, " ").trim();
    return { startMin, endMin, rest };
  }

  const simple = /\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b/.exec(s);
  if (simple) {
    let h1 = parseInt(simple[1], 10);
    let h2 = parseInt(simple[2], 10);
    if (h2 < h1 || (h1 < 12 && h2 < h1)) h2 += 12;
    let startMin = h1 * 60;
    let endMin = h2 * 60;
    if (endMin <= startMin) endMin += 12 * 60;
    const dayStart = 8 * 60;
    const dayEnd = 23 * 60;
    startMin = clampMin(startMin, dayStart, dayEnd);
    endMin = clampMin(endMin, dayStart + 15, dayEnd);
    if (endMin <= startMin) endMin = Math.min(dayEnd, startMin + 60);
    const rest = s.replace(simple[0], " ").replace(/\s+/g, " ").trim();
    return { startMin, endMin, rest };
  }

  return null;
}

function isClassLike(segment: string): boolean {
  return /\b(class|classes|lecture|seminar|lab|section)\b/i.test(segment);
}

function isStudyLike(segment: string): boolean {
  return /\b(study|studying|revision|rev\b|dsa|coursework|homework|assign(?:ment)?|project|essay|paper|exam|prep)\b/i.test(
    segment,
  );
}

function isGymLike(segment: string): boolean {
  return /\b(gym|workout|exercise|run|yoga|cardio|lift)\b/i.test(segment);
}

function inferDuration(segment: string): number {
  const s = segment.toLowerCase();
  if (isStudyLike(s)) {
    if (/\blong\b|\bextended\b|\bdeep\b/.test(s)) return 120;
    return 105;
  }
  if (isGymLike(s)) return 60;
  if (/\b(assign(?:ment)?|homework|project|essay|paper)\b/.test(s)) return 120;
  if (isClassLike(s)) return 90;
  if (/\b(meet|hangout|coffee|social)\b/.test(s)) return 90;
  if (/\b(lunch|dinner|meal|eat)\b/.test(s)) return 45;
  if (/\b(read|reading|book)\b/.test(s)) return 45;
  if (/\b(errand|chores|clean|shop)\b/.test(s)) return 60;
  return 60;
}

function inferPriority(segment: string): number {
  const s = segment.toLowerCase();
  if (isStudyLike(s) || /\b(exam|deadline|due)\b/.test(s)) return 5;
  if (isClassLike(s)) return 4;
  if (/\b(meet|call|appointment)\b/.test(s)) return 3;
  if (isGymLike(s)) return 2;
  if (/\b(lunch|dinner|errand|email)\b/.test(s)) return 2;
  return 1;
}

function titleFromSegment(segment: string): string {
  const t = segment.trim();
  if (t.length > 80) return `${t.slice(0, 77)}…`;
  return t || "Block";
}

export function parseNaturalLanguage(input: string): ParsedNaturalLanguage {
  const text = input.trim();
  let preference: "morning" | "night" | undefined;
  if (
    /night owl|late night|evening person|at night|concentrate best.*late|best.*(?:late|night|evening)/i.test(
      text,
    )
  ) {
    preference = "night";
  }
  if (
    /morning person|early bird|concentrate best.*morning|best.*morning|in the morning\b/i.test(
      text,
    )
  ) {
    preference = "morning";
  }

  let segments = splitIntoSegments(text);
  if (segments.length === 0 && text.length > 0) {
    segments = [stripLeadIn(text)];
  }

  const tasks: Task[] = [];
  const fixedEvents: FixedEvent[] = [];

  const skipPhrases =
    /^(night owl|morning person|early bird|thanks|please)$/i;

  for (const rawSeg of segments) {
    if (rawSeg.length < 2) continue;
    if (skipPhrases.test(rawSeg)) continue;

    const range = parseTimeRangeMinutes(rawSeg);
    const segForTitle = range?.rest ?? rawSeg;
    const cleaned = segForTitle.replace(/\s+/g, " ").trim();
    if (!cleaned && range) {
      fixedEvents.push({
        label: "Block",
        start: range.startMin,
        end: range.endMin,
      });
      continue;
    }

    if (range && (isClassLike(rawSeg) || isClassLike(cleaned))) {
      fixedEvents.push({
        label: titleFromSegment(cleaned || "Classes"),
        start: range.startMin,
        end: range.endMin,
      });
      continue;
    }

    if (range && cleaned.length > 0) {
      fixedEvents.push({
        label: titleFromSegment(cleaned),
        start: range.startMin,
        end: range.endMin,
      });
      continue;
    }

    if (range && !cleaned.length) {
      fixedEvents.push({
        label: "Scheduled block",
        start: range.startMin,
        end: range.endMin,
      });
      continue;
    }

    tasks.push({
      name: titleFromSegment(cleaned),
      duration: inferDuration(cleaned),
      priority: inferPriority(cleaned),
    });
  }

  if (tasks.length === 0 && fixedEvents.length === 0 && text.length > 0) {
    tasks.push({
      name: titleFromSegment(text),
      duration: inferDuration(text),
      priority: inferPriority(text),
    });
  }

  return { tasks, fixedEvents, preference };
}
