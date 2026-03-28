import { v } from "convex/values";
import { generateSalt, hashPassword } from "./lib/password";
import { withoutEmail } from "./lib/publicUser";
import { docWithAvatarUrl, userWithAvatarUrl } from "./lib/userAvatar";
import { mutation, query } from "./_generated/server";

/** Email + password signup — returns new user id for session storage. */
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim() || "Member";
    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");
    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      throw new Error("An account with this email already exists");
    }
    const salt = generateSalt();
    const passwordHash = await hashPassword(args.password, salt);
    return await ctx.db.insert("users", {
      name,
      email,
      preference: "morning",
      mode: "social",
      modeOnboardingDone: false,
      passwordSalt: salt,
      passwordHash,
    });
  },
});

/** Verify email + password; returns user id for local session. */
export const authenticateUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const normalized = email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (!user?.passwordHash || !user.passwordSalt) {
      throw new Error("Invalid email or password");
    }
    const h = await hashPassword(password, user.passwordSalt);
    if (h !== user.passwordHash) {
      throw new Error("Invalid email or password");
    }
    return user._id;
  },
});

export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    preference: v.union(v.literal("morning"), v.literal("night")),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        preference: args.preference,
      });
      return existing._id;
    }
    return await ctx.db.insert("users", {
      name: args.name,
      email,
      preference: args.preference,
      mode: "social",
      modeOnboardingDone: false,
    });
  },
});

export const completeModeOnboarding = mutation({
  args: {
    userId: v.id("users"),
    intent: v.union(
      v.literal("student"),
      v.literal("social"),
      v.literal("work"),
    ),
  },
  handler: async (ctx, { userId, intent }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let mode: "social" | "work" = intent === "work" ? "work" : "social";
    if (memberships.length > 0) {
      mode = "work";
    }

    await ctx.db.patch(userId, {
      mode,
      modeOnboardingDone: true,
    });
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return await userWithAvatarUrl(ctx, user);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .unique();
  },
});

/** @deprecated Prefer listPublicPeers — this includes the viewer and omits emails. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const rows = await Promise.all(users.map((u) => docWithAvatarUrl(ctx, u)));
    return rows.map((r) => withoutEmail(r));
  },
});

/** Other users visible in directory / pickers — no email field. */
export const listPublicPeers = query({
  args: { viewerId: v.id("users") },
  handler: async (ctx, { viewerId }) => {
    const users = await ctx.db.query("users").collect();
    const others = users.filter((u) => u._id !== viewerId);
    const rows = await Promise.all(others.map((u) => docWithAvatarUrl(ctx, u)));
    return rows.map((r) => withoutEmail(r));
  },
});

/**
 * Server-side name + email match; response never includes email addresses.
 */
export const searchPublicPeers = query({
  args: { viewerId: v.id("users"), query: v.string() },
  handler: async (ctx, { viewerId, query: raw }) => {
    const q = raw.trim().toLowerCase();
    const users = await ctx.db.query("users").collect();
    const others = users.filter((u) => u._id !== viewerId);
    if (!q) return [];
    const matched = others.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
    const rows = await Promise.all(matched.map((u) => docWithAvatarUrl(ctx, u)));
    return rows.map((r) => withoutEmail(r));
  },
});

/**
 * Permanently removes the user and related rows (schedules, tasks, requests,
 * friendships, org memberships, etc.). Meetings: drops user from participants or deletes if sole participant.
 */
export const deleteAccount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId);
    }

    const schedules = await ctx.db
      .query("schedules")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    for (const s of schedules) await ctx.db.delete(s._id);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const t of tasks) await ctx.db.delete(t._id);

    const reqOut = await ctx.db
      .query("requests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", userId))
      .collect();
    for (const r of reqOut) await ctx.db.delete(r._id);
    const reqIn = await ctx.db
      .query("requests")
      .withIndex("by_to_user", (q) => q.eq("toUserId", userId))
      .collect();
    for (const r of reqIn) await ctx.db.delete(r._id);

    const meetings = await ctx.db.query("meetings").collect();
    for (const m of meetings) {
      if (!m.participants.includes(userId)) continue;
      if (m.participants.length <= 1) {
        await ctx.db.delete(m._id);
      } else {
        await ctx.db.patch(m._id, {
          participants: m.participants.filter((id) => id !== userId),
        });
      }
    }

    const joinReqs = await ctx.db
      .query("organizationJoinRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const j of joinReqs) await ctx.db.delete(j._id);

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const m of memberships) await ctx.db.delete(m._id);

    const fMin = await ctx.db
      .query("friendships")
      .withIndex("by_userMin", (q) => q.eq("userMin", userId))
      .collect();
    const fMax = await ctx.db
      .query("friendships")
      .withIndex("by_userMax", (q) => q.eq("userMax", userId))
      .collect();
    const seen = new Set<string>();
    for (const f of [...fMin, ...fMax]) {
      if (seen.has(f._id)) continue;
      seen.add(f._id);
      await ctx.db.delete(f._id);
    }

    const invites = await ctx.db.query("organizationInvites").collect();
    for (const inv of invites) {
      if (inv.createdBy === userId) await ctx.db.delete(inv._id);
    }

    await ctx.db.delete(userId);
    return { ok: true as const };
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    preference: v.optional(
      v.union(v.literal("morning"), v.literal("night")),
    ),
  },
  handler: async (ctx, { userId, name, email, preference }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const patch: {
      name?: string;
      email?: string;
      preference?: "morning" | "night";
    } = {};
    if (name !== undefined) patch.name = name;
    if (preference !== undefined) patch.preference = preference;
    if (email !== undefined) {
      const normalized = email.trim().toLowerCase();
      patch.email = normalized;
      const taken = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", normalized))
        .unique();
      if (taken && taken._id !== userId) {
        throw new Error("Email already in use");
      }
    }
    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(userId, patch);
  },
});

/** Returns a short-lived URL to POST the raw image bytes (Content-Type required). */
export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const setUserAvatar = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { userId, storageId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const meta = await ctx.storage.getMetadata(storageId);
    if (!meta) throw new Error("Upload not found");
    const ct = meta.contentType ?? "";
    if (!ct.startsWith("image/")) {
      await ctx.storage.delete(storageId);
      throw new Error("File must be an image");
    }
    if (user.avatarStorageId && user.avatarStorageId !== storageId) {
      await ctx.storage.delete(user.avatarStorageId);
    }
    await ctx.db.patch(userId, { avatarStorageId: storageId });
  },
});

export const clearUserAvatar = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId);
    }
    await ctx.db.patch(userId, { avatarStorageId: undefined });
  },
});
