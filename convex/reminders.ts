import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  formatMeetingEmail,
  isDeliverableEmail,
  meetingStartUtcMs,
  sendEmail,
} from "./utils/email";

/**
 * Cron: remind participants ~1h before start (35–100 min window, run every 15–20 min).
 * Past meetings get reminderEmailSentAt = 1 so they are not scanned forever.
 */
export const tickMeetingReminders = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const meetings = await ctx.db.query("meetings").collect();

    for (const m of meetings) {
      if (m.reminderEmailSentAt !== undefined) continue;

      const start = meetingStartUtcMs(m.time);

      if (start < now) {
        await ctx.db.patch(m._id, { reminderEmailSentAt: 1 });
        continue;
      }

      const msUntil = start - now;
      if (msUntil < 35 * 60 * 1000 || msUntil > 100 * 60 * 1000) {
        continue;
      }

      const title = m.title ?? "Meeting";
      const desc = m.description?.trim();
      const link = m.meetingLink?.trim();
      const { text, html } = formatMeetingEmail({
        title,
        date: m.time.date,
        startTime: m.time.startTime,
        endTime: m.time.endTime,
        description: desc,
        meetingLink: link,
        extraLine: "Reminder: your meeting is coming up soon.",
      });

      for (const uid of m.participants) {
        const u = await ctx.db.get(uid);
        if (!u || !isDeliverableEmail(u.email)) continue;
        sendEmail(ctx, {
          to: u.email,
          subject: "Reminder: meeting starting soon",
          text,
          html,
        });
      }

      await ctx.db.patch(m._id, { reminderEmailSentAt: Date.now() });
    }

    return null;
  },
});
