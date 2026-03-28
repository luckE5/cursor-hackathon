import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { timeToMinutes } from "./lib/time";
import { formatMeetingEmail, sendEmail } from "./utils/email";

const timeSlotValidator = v.object({
  date: v.string(),
  startTime: v.string(),
  endTime: v.string(),
});

export async function syncMeetingToSchedules(
  ctx: MutationCtx,
  args: {
    requestId: Id<"requests">;
    fromUserId: Id<"users">;
    toUserId: Id<"users">;
    time: { date: string; startTime: string; endTime: string };
    label?: string;
    description?: string;
    meetingLink?: string;
  },
  emailNotify?: { kind: "directAccept" | "suggestedConfirm" },
) {
  const { time, fromUserId, toUserId, requestId, label, description, meetingLink } =
    args;
  const participants = [fromUserId, toUserId];
  const meetingBlock = {
    startTime: time.startTime,
    endTime: time.endTime,
    type: "meeting" as const,
    label: label ?? "Meeting",
    ...(description !== undefined && description.trim()
      ? { description: description.trim() }
      : {}),
    ...(meetingLink !== undefined && meetingLink.trim()
      ? { meetingLink: meetingLink.trim() }
      : {}),
  };

  await ctx.db.insert("meetings", {
    participants,
    time,
    createdFromRequestId: requestId,
    title: label ?? "Meeting",
    ...(description !== undefined && description.trim()
      ? { description: description.trim() }
      : {}),
    ...(meetingLink !== undefined && meetingLink.trim()
      ? { meetingLink: meetingLink.trim() }
      : {}),
  });

  for (const userId of participants) {
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

  if (emailNotify) {
    const fromUser = await ctx.db.get(fromUserId);
    const toUser = await ctx.db.get(toUserId);
    if (fromUser && toUser) {
      const title = label ?? "Meeting";
      const desc = description?.trim();
      const link = meetingLink?.trim();
      if (emailNotify.kind === "directAccept") {
        const { text, html } = formatMeetingEmail({
          title,
          date: time.date,
          startTime: time.startTime,
          endTime: time.endTime,
          description: desc,
          meetingLink: link,
        });
        sendEmail(ctx, {
          to: fromUser.email,
          subject: "Your meeting request was accepted",
          text,
          html,
        });
        sendEmail(ctx, {
          to: toUser.email,
          subject: "You have a new meeting scheduled",
          text,
          html,
        });
      } else {
        const forRequester = formatMeetingEmail({
          title,
          date: time.date,
          startTime: time.startTime,
          endTime: time.endTime,
          description: desc,
          meetingLink: link,
          extraLine:
            "You confirmed the suggested time. It's been added to both calendars.",
        });
        sendEmail(ctx, {
          to: fromUser.email,
          subject: "Meeting confirmed",
          text: forRequester.text,
          html: forRequester.html,
        });
        const forRecipient = formatMeetingEmail({
          title,
          date: time.date,
          startTime: time.startTime,
          endTime: time.endTime,
          description: desc,
          meetingLink: link,
          extraLine:
            "The requester confirmed your suggested time. It's on your calendar.",
        });
        sendEmail(ctx, {
          to: toUser.email,
          subject: "You have a new meeting scheduled",
          text: forRecipient.text,
          html: forRecipient.html,
        });
      }
    }
  }
}

export const createMeetingFromRequest = mutation({
  args: {
    requestId: v.id("requests"),
    time: v.optional(timeSlotValidator),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
  },
  handler: async (ctx, { requestId, time: timeOverride, label, description, meetingLink }) => {
    const req = await ctx.db.get(requestId);
    if (!req) throw new Error("Request not found");
    if (req.status !== "accepted") {
      throw new Error("Request must be accepted first");
    }

    const existing = await ctx.db.query("meetings").collect();
    const dup = existing.find((m) => m.createdFromRequestId === requestId);
    if (dup) return dup._id;

    const time =
      timeOverride ??
      (req.suggestedAlternative
        ? req.suggestedAlternative
        : req.requestedTime);

    await syncMeetingToSchedules(
      ctx,
      {
        requestId,
        fromUserId: req.fromUserId,
        toUserId: req.toUserId,
        time,
        label,
        description,
        meetingLink,
      },
      { kind: "directAccept" },
    );
    const created = await ctx.db.query("meetings").collect();
    const meeting = created.find((m) => m.createdFromRequestId === requestId);
    return meeting!._id;
  },
});
