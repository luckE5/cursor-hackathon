import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { minutesToTime, rangesOverlap, timeToMinutes } from "./lib/time";

function canonicalPair(
  a: Id<"users">,
  b: Id<"users">,
): [Id<"users">, Id<"users">] {
  return a < b ? [a, b] : [b, a];
}

async function hasAcceptedFriendship(
  ctx: QueryCtx,
  u1: Id<"users">,
  u2: Id<"users">,
): Promise<boolean> {
  const [userMin, userMax] = canonicalPair(u1, u2);
  const row = await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q) => q.eq("userMin", userMin).eq("userMax", userMax))
    .unique();
  return row?.status === "accepted";
}

/** True if both users share at least one organization membership. */
async function shareOrganization(
  ctx: QueryCtx,
  a: Id<"users">,
  b: Id<"users">,
): Promise<boolean> {
  const ma = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", a))
    .collect();
  const mb = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", b))
    .collect();
  const orgsA = new Set(ma.map((m) => m.organizationId));
  for (const m of mb) {
    if (orgsA.has(m.organizationId)) return true;
  }
  return false;
}

/** Viewer may load target user's schedule (self, accepted friend, or org teammate). */
export async function canViewOthersSchedule(
  ctx: QueryCtx,
  viewerId: Id<"users">,
  targetUserId: Id<"users">,
): Promise<boolean> {
  if (viewerId === targetUserId) return true;
  if (await hasAcceptedFriendship(ctx, viewerId, targetUserId)) return true;
  if (await shareOrganization(ctx, viewerId, targetUserId)) return true;
  return false;
}

const blockValidator = v.object({
  startTime: v.string(),
  endTime: v.string(),
  type: v.union(v.literal("task"), v.literal("free"), v.literal("meeting")),
  label: v.optional(v.string()),
  description: v.optional(v.string()),
  meetingLink: v.optional(v.string()),
});

export const createSchedule = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    blocks: v.array(blockValidator),
  },
  handler: async (ctx, { userId, date, blocks }) => {
    const existing = await ctx.db
      .query("schedules")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { blocks });
      return existing._id;
    }
    return await ctx.db.insert("schedules", { userId, date, blocks });
  },
});

/** Replaces blocks for a date (used after AI generation). */
export const replaceBlocks = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    blocks: v.array(blockValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("schedules")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { blocks: args.blocks });
      return existing._id;
    }
    return await ctx.db.insert("schedules", {
      userId: args.userId,
      date: args.date,
      blocks: args.blocks,
    });
  },
});

/** Append blocks and merge by time order (e.g. accepted meetings). */
export const appendBlocks = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    blocks: v.array(blockValidator),
  },
  handler: async (ctx, { userId, date, blocks }) => {
    const existing = await ctx.db
      .query("schedules")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();
    const merged = [...(existing?.blocks ?? []), ...blocks].sort(
      (a, b) =>
        timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
    );
    if (existing) {
      await ctx.db.patch(existing._id, { blocks: merged });
      return existing._id;
    }
    return await ctx.db.insert("schedules", { userId, date, blocks: merged });
  },
});

export const getSchedule = query({
  args: {
    /** Schedule owner whose day is being read. */
    userId: v.id("users"),
    date: v.string(),
    /** Caller (signed-in user). Must be allowed to see userId's schedule. */
    viewerId: v.id("users"),
  },
  handler: async (ctx, { userId, date, viewerId }) => {
    const allowed = await canViewOthersSchedule(ctx, viewerId, userId);
    if (!allowed) {
      return { accessDenied: true as const };
    }
    return await ctx.db
      .query("schedules")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();
  },
});

type Block = {
  startTime: string;
  endTime: string;
  type: "task" | "free" | "meeting";
  label?: string;
  description?: string;
  meetingLink?: string;
};

function mutualFreeSlots(a: Block[], b: Block[], date: string) {
  const freeA = a.filter((x) => x.type === "free");
  const freeB = b.filter((x) => x.type === "free");
  const out: { startTime: string; endTime: string; date: string }[] = [];
  for (const fa of freeA) {
    const s1 = timeToMinutes(fa.startTime);
    const e1 = timeToMinutes(fa.endTime);
    for (const fb of freeB) {
      const s2 = timeToMinutes(fb.startTime);
      const e2 = timeToMinutes(fb.endTime);
      const s = Math.max(s1, s2);
      const e = Math.min(e1, e2);
      if (s < e) {
        out.push({
          date,
          startTime: minutesToTime(s),
          endTime: minutesToTime(e),
        });
      }
    }
  }
  return out;
}

function conflictsBetween(a: Block[], b: Block[]) {
  const busyA = a.filter((x) => x.type !== "free");
  const busyB = b.filter((x) => x.type !== "free");
  const out: { userA: Block; userB: Block }[] = [];
  for (const ba of busyA) {
    const sa = timeToMinutes(ba.startTime);
    const ea = timeToMinutes(ba.endTime);
    for (const bb of busyB) {
      const sb = timeToMinutes(bb.startTime);
      const eb = timeToMinutes(bb.endTime);
      if (rangesOverlap(sa, ea, sb, eb)) {
        out.push({ userA: ba, userB: bb });
      }
    }
  }
  return out;
}

export const getSharedSchedule = query({
  args: {
    userA: v.id("users"),
    userB: v.id("users"),
    date: v.string(),
    /** Must be userA or userB — enforces per-side schedule visibility. */
    viewerId: v.id("users"),
  },
  handler: async (ctx, { userA, userB, date, viewerId }) => {
    if (viewerId !== userA && viewerId !== userB) {
      throw new Error("Invalid viewer for shared schedule");
    }

    const allowA = await canViewOthersSchedule(ctx, viewerId, userA);
    const allowB = await canViewOthersSchedule(ctx, viewerId, userB);

    const [schedA, schedB] = await Promise.all([
      allowA
        ? ctx.db
            .query("schedules")
            .withIndex("by_user_date", (q) =>
              q.eq("userId", userA).eq("date", date),
            )
            .unique()
        : Promise.resolve(null),
      allowB
        ? ctx.db
            .query("schedules")
            .withIndex("by_user_date", (q) =>
              q.eq("userId", userB).eq("date", date),
            )
            .unique()
        : Promise.resolve(null),
    ]);

    const blocksA = allowA ? (schedA?.blocks ?? []) : [];
    const blocksB = allowB ? (schedB?.blocks ?? []) : [];

    const pending = await ctx.db.query("requests").collect();
    const relevant = pending.filter(
      (r) =>
        r.status === "pending" &&
        r.requestedTime.date === date &&
        ((r.fromUserId === userA && r.toUserId === userB) ||
          (r.fromUserId === userB && r.toUserId === userA)),
    );

    return {
      scheduleA: allowA ? schedA : null,
      scheduleB: allowB ? schedB : null,
      accessDeniedA: !allowA,
      accessDeniedB: !allowB,
      overlapFree: mutualFreeSlots(blocksA, blocksB, date),
      conflicts: conflictsBetween(blocksA, blocksB),
      pendingRequests: relevant,
    };
  },
});

