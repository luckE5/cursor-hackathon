import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { withoutEmail } from "./lib/publicUser";
import { userWithAvatarUrl } from "./lib/userAvatar";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { timeToMinutes } from "./lib/time";
import { formatMeetingEmail, sendEmail } from "./utils/email";

async function syncUserModeFromMemberships(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const user = await ctx.db.get(userId);
  if (!user) return;
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const nextMode = memberships.length > 0 ? ("work" as const) : ("social" as const);
  if (user.mode !== nextMode) {
    await ctx.db.patch(userId, { mode: nextMode });
  }
}

const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomInviteCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return s;
}

/** Default org working window for manager-assigned blocks (local same-day semantics). */
const WORK_START = "09:00";
const WORK_END = "18:00";

export const createOrganization = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db.insert("organizations", { name });
  },
});

export const addMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("member"), v.literal("manager")),
  },
  handler: async (ctx, args) => {
    const dup = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId),
      )
      .unique();
    if (dup) {
      await ctx.db.patch(dup._id, { role: args.role });
      await syncUserModeFromMemberships(ctx, args.userId);
      return dup._id;
    }
    const id = await ctx.db.insert("memberships", args);
    await syncUserModeFromMemberships(ctx, args.userId);
    return id;
  },
});

/** All members’ schedules for a week — for manager team availability heatmap (Convex subscription). */
export const getOrganizationWeekHeatmapData = query({
  args: {
    organizationId: v.id("organizations"),
    weekDates: v.array(v.string()),
  },
  handler: async (ctx, { organizationId, weekDates }) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          userId: m.userId,
          name: user?.name ?? "Member",
        };
      }),
    );

    const schedulesByDate: Record<
      string,
      Record<string, { scheduleExists: boolean; blocks: unknown[] }>
    > = {};

    for (const date of weekDates) {
      schedulesByDate[date] = {};
      for (const m of members) {
        const sched = await ctx.db
          .query("schedules")
          .withIndex("by_user_date", (q) =>
            q.eq("userId", m.userId).eq("date", date),
          )
          .unique();
        schedulesByDate[date][m.userId] = {
          scheduleExists: sched !== null,
          blocks: sched?.blocks ?? [],
        };
      }
    }

    return { members, schedulesByDate };
  },
});

export const getMembers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
    const users = await Promise.all(
      memberships.map(async (m) => {
        const userDoc = await ctx.db.get(m.userId);
        const userFull = await userWithAvatarUrl(ctx, userDoc);
        const user = userFull ? withoutEmail(userFull) : null;
        return { ...m, user };
      }),
    );
    return users;
  },
});

export const getOrganizationSchedules = query({
  args: {
    organizationId: v.id("organizations"),
    date: v.string(),
  },
  handler: async (ctx, { organizationId, date }) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
    const out = await Promise.all(
      memberships.map(async (m) => {
        const sched = await ctx.db
          .query("schedules")
          .withIndex("by_user_date", (q) =>
            q.eq("userId", m.userId).eq("date", date),
          )
          .unique();
        const userDoc = await ctx.db.get(m.userId);
        const user = userDoc ? withoutEmail(userDoc) : null;
        return {
          membership: m,
          user,
          schedule: sched ?? null,
          workingHours: { start: WORK_START, end: WORK_END },
        };
      }),
    );
    return out;
  },
});

export const assignMeeting = mutation({
  args: {
    managerId: v.id("users"),
    organizationId: v.id("organizations"),
    userIds: v.array(v.id("users")),
    time: v.object({
      date: v.string(),
      startTime: v.string(),
      endTime: v.string(),
    }),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { managerId, organizationId, userIds, time, label, description, meetingLink } =
      args;
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", managerId).eq("organizationId", organizationId),
      )
      .unique();
    if (!membership || membership.role !== "manager") {
      throw new Error("Only a workspace manager can assign meetings");
    }

    const ws = timeToMinutes(WORK_START);
    const we = timeToMinutes(WORK_END);
    const ts = timeToMinutes(time.startTime);
    const te = timeToMinutes(time.endTime);
    if (ts < ws || te > we || ts >= te) {
      throw new Error(
        `Meeting must fall within working hours ${WORK_START}–${WORK_END}`,
      );
    }

    for (const uid of userIds) {
      const m = await ctx.db
        .query("memberships")
        .withIndex("by_user_org", (q) =>
          q.eq("userId", uid).eq("organizationId", organizationId),
        )
        .unique();
      if (!m) {
        throw new Error(`User ${uid} is not in this organization`);
      }
    }

    const meetingBlock = {
      startTime: time.startTime,
      endTime: time.endTime,
      type: "meeting" as const,
      label: label ?? "Team meeting",
      ...(description !== undefined && description.trim()
        ? { description: description.trim() }
        : {}),
      ...(meetingLink !== undefined && meetingLink.trim()
        ? { meetingLink: meetingLink.trim() }
        : {}),
    };

    for (const userId of userIds) {
      const existing = await ctx.db
        .query("schedules")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", userId).eq("date", time.date),
        )
        .unique();
      const merged = [...(existing?.blocks ?? []), meetingBlock].sort(
        (a, b) =>
          timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
      );
      if (existing) {
        await ctx.db.patch(existing._id, { blocks: merged });
      } else {
        await ctx.db.insert("schedules", {
          userId,
          date: time.date,
          blocks: merged,
        });
      }
    }

    await ctx.db.insert("meetings", {
      participants: userIds,
      time,
      title: label ?? "Team meeting",
      ...(description !== undefined && description.trim()
        ? { description: description.trim() }
        : {}),
      ...(meetingLink !== undefined && meetingLink.trim()
        ? { meetingLink: meetingLink.trim() }
        : {}),
    });

    const manager = await ctx.db.get(managerId);
    const title = label ?? "Team meeting";
    const desc = description?.trim();
    const link = meetingLink?.trim();
    for (const userId of userIds) {
      const u = await ctx.db.get(userId);
      if (!u) continue;
      const { text, html } = formatMeetingEmail({
        title,
        date: time.date,
        startTime: time.startTime,
        endTime: time.endTime,
        description: desc,
        meetingLink: link,
        extraLine: manager
          ? `Your manager ${manager.name} scheduled a meeting for you.`
          : "A new meeting was added to your calendar.",
      });
      sendEmail(ctx, {
        to: u.email,
        subject: "You have a new meeting scheduled",
        text,
        html,
      });
    }

    return true;
  },
});

/** Manager-only: add a non-meeting “blocked” segment (stored as task). */
export const assignBlockedTime = mutation({
  args: {
    managerId: v.id("users"),
    organizationId: v.id("organizations"),
    userIds: v.array(v.id("users")),
    time: v.object({
      date: v.string(),
      startTime: v.string(),
      endTime: v.string(),
    }),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { managerId, organizationId, userIds, time, label } = args;
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", managerId).eq("organizationId", organizationId),
      )
      .unique();
    if (!membership || membership.role !== "manager") {
      throw new Error("Only a workspace manager can block time");
    }

    const ws = timeToMinutes(WORK_START);
    const we = timeToMinutes(WORK_END);
    const ts = timeToMinutes(time.startTime);
    const te = timeToMinutes(time.endTime);
    if (ts < ws || te > we || ts >= te) {
      throw new Error(
        `Blocked time must fall within working hours ${WORK_START}–${WORK_END}`,
      );
    }

    for (const uid of userIds) {
      const m = await ctx.db
        .query("memberships")
        .withIndex("by_user_org", (q) =>
          q.eq("userId", uid).eq("organizationId", organizationId),
        )
        .unique();
      if (!m) {
        throw new Error(`User ${uid} is not in this organization`);
      }
    }

    const block = {
      startTime: time.startTime,
      endTime: time.endTime,
      type: "task" as const,
      label: label ?? "Unavailable (blocked)",
    };

    for (const userId of userIds) {
      const existing = await ctx.db
        .query("schedules")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", userId).eq("date", time.date),
        )
        .unique();
      const merged = [...(existing?.blocks ?? []), block].sort(
        (a, b) =>
          timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
      );
      if (existing) {
        await ctx.db.patch(existing._id, { blocks: merged });
      } else {
        await ctx.db.insert("schedules", {
          userId,
          date: time.date,
          blocks: merged,
        });
      }
    }

    return true;
  },
});

export const listMyOrganizations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const mine = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const out = [];
    for (const m of mine) {
      const organization = await ctx.db.get(m.organizationId);
      if (organization) out.push({ membership: m, organization });
    }
    return out;
  },
});

export const searchOrganizations = query({
  args: { query: v.string() },
  handler: async (ctx, { query: q }) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const all = await ctx.db.query("organizations").collect();
    return all
      .filter((o) => o.name.toLowerCase().includes(needle))
      .slice(0, 25);
  },
});

export const requestToJoinOrganization = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { userId, organizationId }) => {
    const member = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", userId).eq("organizationId", organizationId),
      )
      .unique();
    if (member) {
      throw new Error("You are already a member of this workspace");
    }
    const pending = await ctx.db
      .query("organizationJoinRequests")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", userId).eq("organizationId", organizationId),
      )
      .unique();
    if (pending) {
      if (pending.status === "pending") {
        throw new Error("You already have a pending request");
      }
      await ctx.db.patch(pending._id, { status: "pending" });
      return pending._id;
    }
    return await ctx.db.insert("organizationJoinRequests", {
      organizationId,
      userId,
      status: "pending",
    });
  },
});

export const listPendingJoinRequestsForOrg = query({
  args: {
    managerId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { managerId, organizationId }) => {
    const m = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", managerId).eq("organizationId", organizationId),
      )
      .unique();
    if (!m || m.role !== "manager") {
      return [];
    }
    const rows = await ctx.db
      .query("organizationJoinRequests")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", organizationId).eq("status", "pending"),
      )
      .collect();
    const out = [];
    for (const r of rows) {
      const userDoc = await ctx.db.get(r.userId);
      const userFull = await userWithAvatarUrl(ctx, userDoc);
      const user = userFull ? withoutEmail(userFull) : null;
      out.push({ ...r, user });
    }
    return out;
  },
});

export const listMyJoinRequests = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const mine = await ctx.db
      .query("organizationJoinRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const out = [];
    for (const r of mine) {
      const org = await ctx.db.get(r.organizationId);
      out.push({ ...r, organization: org });
    }
    return out.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const respondToJoinRequest = mutation({
  args: {
    managerId: v.id("users"),
    requestId: v.id("organizationJoinRequests"),
    decision: v.union(v.literal("accept"), v.literal("reject")),
  },
  handler: async (ctx, { managerId, requestId, decision }) => {
    const req = await ctx.db.get(requestId);
    if (!req || req.status !== "pending") {
      throw new Error("Request not found or already handled");
    }
    const m = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", managerId).eq("organizationId", req.organizationId),
      )
      .unique();
    if (!m || m.role !== "manager") {
      throw new Error("Only managers can respond to join requests");
    }
    if (decision === "reject") {
      await ctx.db.patch(requestId, { status: "rejected" });
      return { ok: true as const };
    }
    await ctx.db.patch(requestId, { status: "accepted" });
    const dup = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", req.userId).eq("organizationId", req.organizationId),
      )
      .unique();
    if (!dup) {
      await ctx.db.insert("memberships", {
        userId: req.userId,
        organizationId: req.organizationId,
        role: "member",
      });
    }
    await syncUserModeFromMemberships(ctx, req.userId);
    return { ok: true as const };
  },
});

export const removeMember = mutation({
  args: {
    managerId: v.id("users"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, { managerId, organizationId, userId }) => {
    const mgr = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", managerId).eq("organizationId", organizationId),
      )
      .unique();
    if (!mgr || mgr.role !== "manager") {
      throw new Error("Only managers can remove members");
    }
    const target = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", userId).eq("organizationId", organizationId),
      )
      .unique();
    if (!target) throw new Error("User is not in this workspace");
    await ctx.db.delete(target._id);
    await syncUserModeFromMemberships(ctx, userId);
    return true;
  },
});

export const createInviteLink = mutation({
  args: {
    managerId: v.id("users"),
    organizationId: v.id("organizations"),
    role: v.union(v.literal("member"), v.literal("manager")),
    expiresInMs: v.optional(v.number()),
  },
  handler: async (ctx, { managerId, organizationId, role, expiresInMs }) => {
    const m = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", managerId).eq("organizationId", organizationId),
      )
      .unique();
    if (!m || m.role !== "manager") {
      throw new Error("Only managers can create invites");
    }
    let code = randomInviteCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await ctx.db
        .query("organizationInvites")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!existing) break;
      code = randomInviteCode();
    }
    const expiresAt =
      expiresInMs !== undefined
        ? Date.now() + Math.min(expiresInMs, 1000 * 60 * 60 * 24 * 30)
        : undefined;
    await ctx.db.insert("organizationInvites", {
      organizationId,
      code: code.toUpperCase(),
      role,
      createdBy: managerId,
      expiresAt,
    });
    return { code: code.toUpperCase() };
  },
});

export const leaveOrganization = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { userId, organizationId }) => {
    const m = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", userId).eq("organizationId", organizationId),
      )
      .unique();
    if (!m) throw new Error("You are not in this workspace");
    await ctx.db.delete(m._id);
    await syncUserModeFromMemberships(ctx, userId);
    return true;
  },
});

export const joinWithInviteCode = mutation({
  args: {
    userId: v.id("users"),
    code: v.string(),
  },
  handler: async (ctx, { userId, code }) => {
    const normalized = code.trim().toUpperCase();
    const inv = await ctx.db
      .query("organizationInvites")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .unique();
    if (!inv) throw new Error("Invalid invite code");
    if (inv.expiresAt !== undefined && Date.now() > inv.expiresAt) {
      await ctx.db.delete(inv._id);
      throw new Error("This invite has expired");
    }
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", userId).eq("organizationId", inv.organizationId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(inv._id);
      throw new Error("You are already in this workspace");
    }
    await ctx.db.insert("memberships", {
      userId,
      organizationId: inv.organizationId,
      role: inv.role,
    });
    await ctx.db.delete(inv._id);
    await syncUserModeFromMemberships(ctx, userId);
    return { organizationId: inv.organizationId };
  },
});
