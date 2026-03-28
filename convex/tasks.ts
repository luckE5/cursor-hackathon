import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createTask = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    duration: v.number(),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", args);
  },
});

export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const removeTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    await ctx.db.delete(taskId);
  },
});
