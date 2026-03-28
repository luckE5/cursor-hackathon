import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { syncMeetingToSchedules } from "./meetings";
import { notifyNewMeetingRequest } from "./utils/email";

const timeSlot = v.object({
  date: v.string(),
  startTime: v.string(),
  endTime: v.string(),
});

export const sendRequest = mutation({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    requestedTime: timeSlot,
  },
  handler: async (ctx, args) => {
    if (args.fromUserId === args.toUserId) {
      throw new Error("Cannot request time from yourself");
    }
    const id = await ctx.db.insert("requests", {
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      requestedTime: args.requestedTime,
      status: "pending",
    });
    const fromUser = await ctx.db.get(args.fromUserId);
    const toUser = await ctx.db.get(args.toUserId);
    if (fromUser && toUser) {
      notifyNewMeetingRequest(ctx, {
        fromUser,
        toUser,
        slot: args.requestedTime,
      });
    }
    return id;
  },
});

export const respondToRequest = mutation({
  args: {
    requestId: v.id("requests"),
    actorUserId: v.id("users"),
    action: v.union(
      v.literal("accept"),
      v.literal("reject"),
      v.literal("suggest"),
    ),
    optionalNewTime: v.optional(timeSlot),
  },
  handler: async (ctx, { requestId, actorUserId, action, optionalNewTime }) => {
    const req = await ctx.db.get(requestId);
    if (!req) throw new Error("Request not found");
    if (req.toUserId !== actorUserId) {
      throw new Error("Only the recipient can respond to this request");
    }
    if (req.status !== "pending") {
      throw new Error("Request is no longer pending");
    }

    if (action === "reject") {
      await ctx.db.patch(requestId, { status: "rejected" });
      return { status: "rejected" as const };
    }

    if (action === "suggest") {
      if (!optionalNewTime) {
        throw new Error("suggest requires optionalNewTime");
      }
      await ctx.db.patch(requestId, {
        suggestedAlternative: optionalNewTime,
      });
      return { status: "pending" as const, suggestedAlternative: optionalNewTime };
    }

    // accept — recipient agrees to the requester's originally requested slot.
    const finalTime = req.requestedTime;
    await ctx.db.patch(requestId, { status: "accepted" });
    await syncMeetingToSchedules(
      ctx,
      {
        requestId,
        fromUserId: req.fromUserId,
        toUserId: req.toUserId,
        time: finalTime,
        label: "Meeting",
      },
      { kind: "directAccept" },
    );
    return { status: "accepted" as const, time: finalTime };
  },
});

/** Requester accepts a counter-proposal from the receiver. */
export const acceptSuggestedTime = mutation({
  args: {
    requestId: v.id("requests"),
    actorUserId: v.id("users"),
  },
  handler: async (ctx, { requestId, actorUserId }) => {
    const req = await ctx.db.get(requestId);
    if (!req) throw new Error("Request not found");
    if (req.fromUserId !== actorUserId) {
      throw new Error("Only the requester can confirm a suggested time");
    }
    if (!req.suggestedAlternative) {
      throw new Error("No suggested time to accept");
    }
    if (req.status !== "pending") {
      throw new Error("Request is no longer pending");
    }
    const finalTime = req.suggestedAlternative;
    await ctx.db.patch(requestId, {
      status: "accepted",
      requestedTime: finalTime,
      suggestedAlternative: undefined,
    });
    await syncMeetingToSchedules(
      ctx,
      {
        requestId,
        fromUserId: req.fromUserId,
        toUserId: req.toUserId,
        time: finalTime,
        label: "Meeting",
      },
      { kind: "suggestedConfirm" },
    );
    return { status: "accepted" as const, time: finalTime };
  },
});

export const listIncoming = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("requests")
      .withIndex("by_to_user", (q) => q.eq("toUserId", userId))
      .collect();
  },
});

export const listOutgoing = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("requests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", userId))
      .collect();
  },
});
