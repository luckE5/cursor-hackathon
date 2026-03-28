/**
 * Smart schedule generation — deterministic engine + rule-based NL parser.
 * (No external AI services.)
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { assertValidBlock } from "./lib/time";
import { generateSmartSchedule } from "./scheduler/engine";
import { parseNaturalLanguage } from "./scheduler/nlParser";
import type {
  FixedEvent,
  ScheduleBlock,
  SmartScheduleInput,
  Task,
} from "./scheduler/models";
import { mergeTimeSlots, minutesToHHmm } from "./utils/timeUtils";

export type ConvexBlock = {
  startTime: string;
  endTime: string;
  type: "task" | "free" | "meeting";
  label?: string;
  description?: string;
  meetingLink?: string;
};

/**
 * Turns engine output + fixed meetings into Convex `replaceBlocks` payload.
 * Sorted by start time; validates HH:mm for each segment.
 */
function engineBlocksAndFixedToConvex(
  engineBlocks: ScheduleBlock[],
  fixedEvents: FixedEvent[],
): ConvexBlock[] {
  const out: ConvexBlock[] = [];

  for (const fe of fixedEvents) {
    const startTime = minutesToHHmm(fe.start);
    const endTime = minutesToHHmm(fe.end);
    assertValidBlock(startTime, endTime);
    out.push({
      startTime,
      endTime,
      type: "meeting",
      label: fe.label,
    });
  }

  for (const b of engineBlocks) {
    const startTime = minutesToHHmm(b.start);
    const endTime = minutesToHHmm(b.end);
    assertValidBlock(startTime, endTime);
    if (b.task === "Break" || b.task === "Buffer") {
      out.push({ startTime, endTime, type: "free", label: b.task });
    } else {
      out.push({ startTime, endTime, type: "task", label: b.task });
    }
  }

  out.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return out;
}

/** Unified working window 08:00–23:00 with breaks & buffers. */
function dayProfile(_preference: "morning" | "night") {
  const dayStart = 8 * 60;
  const dayEnd = 23 * 60;
  return {
    freeSlot: { start: dayStart, end: dayEnd },
    noWorkAfter: dayEnd,
    maxContinuousWork: 90,
    breakDuration: 12,
    bufferBetweenTasks: 8,
  };
}

/** Morning: high priority & longer tasks first. Night: lighter tasks first so study lands later. */
function orderTasksForChronotype(
  tasks: Task[],
  preference: "morning" | "night",
): Task[] {
  const tagged = tasks.map((t, i) => ({ t, i }));
  if (preference === "morning") {
    tagged.sort((a, b) => {
      if (b.t.priority !== a.t.priority) return b.t.priority - a.t.priority;
      if (b.t.duration !== a.t.duration) return b.t.duration - a.t.duration;
      return a.i - b.i;
    });
  } else {
    tagged.sort((a, b) => {
      if (a.t.priority !== b.t.priority) return a.t.priority - b.t.priority;
      if (a.t.duration !== b.t.duration) return a.t.duration - b.t.duration;
      return a.i - b.i;
    });
  }
  return tagged.map((x) => x.t);
}

/** Spread deadline hints so the engine tie-breaker spaces same-priority work. */
function spreadDeadlines(
  tasks: Task[],
  windowStart: number,
  windowEnd: number,
): Task[] {
  const n = tasks.length;
  if (n === 0) return tasks;
  const span = Math.max(windowEnd - windowStart, n * 30);
  return tasks.map((t, i) => ({
    ...t,
    deadline: windowStart + Math.round((span * (i + 1)) / (n + 1)),
  }));
}

function runSmartBuilder(args: {
  tasks: Task[];
  preference: "morning" | "night";
  fixedEvents: FixedEvent[];
}): { blocks: ConvexBlock[]; unscheduled: Task[] } {
  const profile = dayProfile(args.preference);
  const ordered = orderTasksForChronotype(args.tasks, args.preference);
  const withDeadlines = spreadDeadlines(
    ordered,
    profile.freeSlot.start,
    profile.freeSlot.end,
  );

  const input: SmartScheduleInput = {
    tasks: withDeadlines,
    freeSlots: mergeTimeSlots([profile.freeSlot]),
    fixedEvents: args.fixedEvents,
    noWorkAfter: profile.noWorkAfter,
    maxContinuousWork: profile.maxContinuousWork,
    breakDuration: profile.breakDuration,
    bufferBetweenTasks: profile.bufferBetweenTasks,
    preference: args.preference,
  };

  const { schedule, unscheduled } = generateSmartSchedule(input);
  const blocks = engineBlocksAndFixedToConvex(schedule, args.fixedEvents);
  return { blocks, unscheduled };
}

/** Preview parser + layout without writing the database. */
export const parseScheduleInput = action({
  args: {
    inputText: v.string(),
    date: v.string(),
    preference: v.union(v.literal("morning"), v.literal("night")),
  },
  handler: async (_ctx, { inputText, date, preference }) => {
    const parsed = parseNaturalLanguage(inputText);
    const pref = parsed.preference ?? preference;
    const { blocks, unscheduled } = runSmartBuilder({
      tasks: parsed.tasks,
      preference: pref,
      fixedEvents: parsed.fixedEvents,
    });
    return {
      date,
      blocks,
      unscheduled: unscheduled.map((t) => ({
        title: t.name,
        duration: t.duration,
        priority: t.priority,
      })),
    };
  },
});

export const generateAISchedule = action({
  args: {
    userId: v.id("users"),
    inputText: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.get, { userId: args.userId });
    if (!user) throw new Error("User not found");

    const trimmed = args.inputText.trim();
    if (!trimmed) {
      throw new Error("Describe your day in the text box first.");
    }

    const parsed = parseNaturalLanguage(trimmed);
    const pref = parsed.preference ?? user.preference;

    if (parsed.tasks.length === 0 && parsed.fixedEvents.length === 0) {
      throw new Error(
        "Could not extract any tasks or fixed times — try listing items separated by commas.",
      );
    }

    const { blocks, unscheduled } = runSmartBuilder({
      tasks: parsed.tasks,
      preference: pref,
      fixedEvents: parsed.fixedEvents,
    });

    await ctx.runMutation(api.schedules.replaceBlocks, {
      userId: args.userId,
      date: args.date,
      blocks,
    });

    return {
      date: args.date,
      blocks,
      unscheduled: unscheduled.map((t) => ({
        title: t.name,
        duration: t.duration,
        priority: t.priority,
      })),
    };
  },
});

export const generateScheduleFromTasks = action({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, { userId, date }) => {
    const user = await ctx.runQuery(api.users.get, { userId });
    if (!user) throw new Error("User not found");
    const tasks = await ctx.runQuery(api.tasks.listForUser, { userId });
    if (!tasks.length) {
      throw new Error("Add at least one task first");
    }

    const engineTasks: Task[] = tasks.map((t) => ({
      name: t.title,
      duration: t.duration,
      priority: t.priority,
    }));

    const { blocks, unscheduled } = runSmartBuilder({
      tasks: engineTasks,
      preference: user.preference,
      fixedEvents: [],
    });

    await ctx.runMutation(api.schedules.replaceBlocks, {
      userId,
      date,
      blocks,
    });
    return {
      date,
      blocks,
      unscheduled: unscheduled.map((t) => ({
        title: t.name,
        duration: t.duration,
        priority: t.priority,
      })),
    };
  },
});
