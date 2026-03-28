import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { withoutEmail } from "./lib/publicUser";
import { userWithAvatarUrl } from "./lib/userAvatar";
import { mutation, query } from "./_generated/server";

function canonicalPair(
  a: Id<"users">,
  b: Id<"users">,
): [Id<"users">, Id<"users">] {
  return a < b ? [a, b] : [b, a];
}

export const sendFriendRequest = mutation({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
  },
  handler: async (ctx, { fromUserId, toUserId }) => {
    if (fromUserId === toUserId) {
      throw new Error("Cannot friend yourself");
    }
    const [userMin, userMax] = canonicalPair(fromUserId, toUserId);
    const existing = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) => q.eq("userMin", userMin).eq("userMax", userMax))
      .unique();
    if (existing) {
      if (existing.status === "accepted") {
        throw new Error("Already friends");
      }
      if (existing.requestedBy === fromUserId) {
        throw new Error("Request already sent");
      }
      await ctx.db.patch(existing._id, { status: "accepted" });
      return existing._id;
    }
    return await ctx.db.insert("friendships", {
      userMin,
      userMax,
      status: "pending",
      requestedBy: fromUserId,
    });
  },
});

export const acceptFriendRequest = mutation({
  args: {
    userId: v.id("users"),
    friendUserId: v.id("users"),
  },
  handler: async (ctx, { userId, friendUserId }) => {
    const [userMin, userMax] = canonicalPair(userId, friendUserId);
    const row = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) => q.eq("userMin", userMin).eq("userMax", userMax))
      .unique();
    if (!row) throw new Error("No request found");
    if (row.status !== "pending") throw new Error("Not pending");
    if (row.requestedBy === userId) {
      throw new Error("Cannot accept your own request");
    }
    await ctx.db.patch(row._id, { status: "accepted" });
    return row._id;
  },
});

export const removeFriendship = mutation({
  args: {
    userId: v.id("users"),
    peerId: v.id("users"),
  },
  handler: async (ctx, { userId, peerId }) => {
    const [userMin, userMax] = canonicalPair(userId, peerId);
    const row = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) => q.eq("userMin", userMin).eq("userMax", userMax))
      .unique();
    if (row) await ctx.db.delete(row._id);
  },
});

export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const asMin = await ctx.db
      .query("friendships")
      .withIndex("by_userMin", (q) => q.eq("userMin", userId))
      .collect();
    const asMax = await ctx.db
      .query("friendships")
      .withIndex("by_userMax", (q) => q.eq("userMax", userId))
      .collect();
    const merged = [...asMin, ...asMax];
    const out = await Promise.all(
      merged.map(async (f) => {
        const peerId = f.userMin === userId ? f.userMax : f.userMin;
        const peerDoc = await ctx.db.get(peerId);
        const peerFull = await userWithAvatarUrl(ctx, peerDoc);
        const peer = peerFull ? withoutEmail(peerFull) : null;
        return {
          ...f,
          peerId,
          peer,
          direction:
            f.requestedBy === userId ? ("outgoing" as const) : ("incoming" as const),
        };
      }),
    );
    return out.sort((a, b) => (a.peer?.name ?? "").localeCompare(b.peer?.name ?? ""));
  },
});
