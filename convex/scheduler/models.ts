/**
 * Core types for the deterministic smart schedule engine.
 * All times are minutes from midnight (0–1440+ allowed for late-night edge cases).
 */

export type Task = {
  name: string;
  duration: number;
  priority: number;
  /** Optional “finish-by” minute-of-day; lower = sooner in the day. */
  deadline?: number;
};

export type TimeSlot = {
  start: number;
  end: number;
};

/** One placed segment on the timeline (task work, break, or buffer). */
export type ScheduleBlock = {
  task: string;
  start: number;
  end: number;
};

export type FixedEvent = {
  label: string;
  start: number;
  end: number;
};

export type SmartScheduleInput = {
  tasks: Task[];
  /** User-available windows before subtracting fixed events. */
  freeSlots: TimeSlot[];
  /** Hard commitments that consume time (classes, transit, etc.). */
  fixedEvents: FixedEvent[];
  /** Do not schedule work ending after this minute (exclusive cap handled in engine). */
  noWorkAfter: number;
  /** Minutes of focused work before a mandatory break. */
  maxContinuousWork: number;
  breakDuration: number;
  /** Gap between different tasks (realistic transitions). */
  bufferBetweenTasks: number;
  preference: "morning" | "night";
};

export type SmartScheduleResult = {
  schedule: ScheduleBlock[];
  unscheduled: Task[];
};
