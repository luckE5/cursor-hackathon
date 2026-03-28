/**
 * Deterministic smart scheduler: packs tasks into free windows with breaks,
 * buffers, fixed-event avoidance, and overflow tracking.
 */

import type {
  FixedEvent,
  ScheduleBlock,
  SmartScheduleInput,
  SmartScheduleResult,
  Task,
  TimeSlot,
} from "./models";
import {
  clampSlots,
  mergeTimeSlots,
  subtractIntervals,
} from "../utils/timeUtils";

const BREAK_LABEL = "Break";
const BUFFER_LABEL = "Buffer";

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const da = a.deadline ?? Number.POSITIVE_INFINITY;
    const db = b.deadline ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
}

/** Mutable window queue: we advance `cursor` within `windows[wi]`. */
type WindowState = {
  windows: TimeSlot[];
  wi: number;
  cursor: number;
};

function initWindows(availability: TimeSlot[]): WindowState | null {
  if (!availability.length) return null;
  const windows = mergeTimeSlots(availability);
  return { windows, wi: 0, cursor: windows[0].start };
}

/**
 * Advance to a valid cursor inside the next non-empty window.
 * Returns false if no time left.
 */
function ensureCursor(ws: WindowState, noWorkAfter: number): boolean {
  const SAFETY = 5000;
  let steps = 0;
  while (steps++ < SAFETY) {
    if (ws.wi >= ws.windows.length) return false;
    const w = ws.windows[ws.wi];
    if (ws.cursor >= noWorkAfter) return false;
    if (ws.cursor >= w.end) {
      ws.wi++;
      if (ws.wi >= ws.windows.length) return false;
      ws.cursor = ws.windows[ws.wi].start;
      continue;
    }
    if (ws.cursor < w.start) {
      ws.cursor = w.start;
    }
    const effectiveEnd = Math.min(w.end, noWorkAfter);
    if (ws.cursor >= effectiveEnd) {
      ws.wi++;
      if (ws.wi >= ws.windows.length) return false;
      ws.cursor = ws.windows[ws.wi].start;
      continue;
    }
    return true;
  }
  return false;
}

function placeBreak(
  ws: WindowState,
  breakDuration: number,
  noWorkAfter: number,
  blocks: ScheduleBlock[],
): boolean {
  if (!ensureCursor(ws, noWorkAfter)) return false;
  const w = ws.windows[ws.wi];
  const endCap = Math.min(w.end, noWorkAfter);
  const room = endCap - ws.cursor;
  if (room <= 0) return false;
  const len = Math.min(breakDuration, room);
  if (len <= 0) return false;
  blocks.push({
    task: BREAK_LABEL,
    start: ws.cursor,
    end: ws.cursor + len,
  });
  ws.cursor += len;
  return true;
}

/**
 * Main entry: builds a feasible same-day plan without external services.
 */
export function generateSmartSchedule(data: SmartScheduleInput): SmartScheduleResult {
  const {
    tasks: rawTasks,
    freeSlots,
    fixedEvents,
    noWorkAfter,
    maxContinuousWork,
    breakDuration,
    bufferBetweenTasks,
  } = data;

  const fixedIntervals: TimeSlot[] = fixedEvents.map((f) => ({
    start: f.start,
    end: f.end,
  }));

  let availability = mergeTimeSlots(freeSlots);
  availability = subtractIntervals(availability, fixedIntervals);
  availability = clampSlots(availability, 0, noWorkAfter);

  const sortedTasks = sortTasks(rawTasks);
  const blocks: ScheduleBlock[] = [];
  const unscheduled: Task[] = [];

  if (!availability.length) {
    return { schedule: blocks, unscheduled: sortedTasks };
  }

  const ws = initWindows(availability);
  if (!ws) {
    return { schedule: blocks, unscheduled: sortedTasks };
  }

  let workStreak = 0;
  let lastEndedName: string | null = null;
  let lastEnd = -1;
  let outerSafety = 0;

  for (const task of sortedTasks) {
    let remaining = task.duration;
    let splitPieceIndex = 0;

    while (remaining > 0) {
      if (++outerSafety > 50_000) {
        unscheduled.push({ ...task, duration: remaining });
        remaining = 0;
        break;
      }

      if (!ensureCursor(ws, noWorkAfter)) {
        unscheduled.push({ ...task, duration: remaining });
        remaining = 0;
        break;
      }

      /* Mandatory recovery break after long focus stretch. */
      if (workStreak >= maxContinuousWork && breakDuration > 0) {
        const placed = placeBreak(ws, breakDuration, noWorkAfter, blocks);
        if (placed) {
          workStreak = 0;
          lastEndedName = BREAK_LABEL;
          lastEnd = blocks[blocks.length - 1]!.end;
        } else {
          /* No room in this window: skip ahead so we do not spin forever. */
          workStreak = 0;
          ws.wi++;
          if (ws.wi >= ws.windows.length) {
            unscheduled.push({ ...task, duration: remaining });
            remaining = 0;
            break;
          }
          ws.cursor = ws.windows[ws.wi].start;
        }
        continue;
      }

      /* Buffer between different tasks (not between split segments of the same task). */
      if (
        splitPieceIndex === 0 &&
        lastEndedName !== null &&
        lastEndedName !== task.name &&
        lastEndedName !== BREAK_LABEL &&
        lastEndedName !== BUFFER_LABEL &&
        lastEnd >= 0
      ) {
        const need = bufferBetweenTasks;
        if (need > 0 && !ensureCursor(ws, noWorkAfter)) {
          unscheduled.push({ ...task, duration: remaining });
          remaining = 0;
          break;
        }
        if (need > 0) {
          const w = ws.windows[ws.wi];
          const endCap = Math.min(w.end, noWorkAfter);
          const room = endCap - ws.cursor;
          const buf = Math.min(need, Math.max(0, room));
          if (buf > 0) {
            blocks.push({
              task: BUFFER_LABEL,
              start: ws.cursor,
              end: ws.cursor + buf,
            });
            ws.cursor += buf;
            lastEndedName = BUFFER_LABEL;
            lastEnd = blocks[blocks.length - 1].end;
          }
        }
      }

      if (!ensureCursor(ws, noWorkAfter)) {
        unscheduled.push({ ...task, duration: remaining });
        remaining = 0;
        break;
      }

      const w = ws.windows[ws.wi];
      const endCap = Math.min(w.end, noWorkAfter);
      const room = endCap - ws.cursor;
      if (room <= 0) {
        ws.wi++;
        if (ws.wi >= ws.windows.length) {
          unscheduled.push({ ...task, duration: remaining });
          remaining = 0;
          break;
        }
        ws.cursor = ws.windows[ws.wi].start;
        continue;
      }

      const chunk = Math.min(remaining, room);
      if (chunk <= 0) {
        ws.wi++;
        if (ws.wi >= ws.windows.length) break;
        ws.cursor = ws.windows[ws.wi].start;
        continue;
      }

      blocks.push({
        task: task.name,
        start: ws.cursor,
        end: ws.cursor + chunk,
      });
      ws.cursor += chunk;
      workStreak += chunk;
      remaining -= chunk;
      lastEndedName = task.name;
      lastEnd = blocks[blocks.length - 1].end;
      splitPieceIndex++;
    }
  }

  blocks.sort((a, b) => a.start - b.start);
  return { schedule: blocks, unscheduled };
}
