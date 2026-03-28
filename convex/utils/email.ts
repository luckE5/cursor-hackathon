import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";

const LOCAL_EMAIL_SUFFIX = "@users.chronosync.local";

export function isDeliverableEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e.includes("@")) return false;
  if (e.endsWith(LOCAL_EMAIL_SUFFIX)) return false;
  return true;
}

function siteBaseUrl(): string {
  return (process.env.SITE_URL ?? process.env.APP_URL ?? "").replace(/\/$/, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Queue a transactional email (Node/Nodemailer). Ignored if address is not deliverable.
 * Failures in the action are logged only and never affect the caller.
 */
export function sendEmail(
  ctx: MutationCtx,
  args: { to: string; subject: string; text: string; html?: string },
): void {
  if (!isDeliverableEmail(args.to)) return;
  void ctx.scheduler.runAfter(0, internal.utils.emailNode.sendEmail, {
    to: args.to.trim(),
    subject: args.subject,
    text: args.text,
    ...(args.html !== undefined ? { html: args.html } : {}),
  });
}

export function formatMeetingEmail(args: {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  meetingLink?: string;
  extraLine?: string;
}): { text: string; html: string } {
  const base = siteBaseUrl();
  const lines = [
    args.extraLine,
    `Title: ${args.title}`,
    `When: ${args.date} · ${args.startTime} – ${args.endTime}`,
    args.description ? `Details: ${args.description}` : null,
    args.meetingLink ? `Link: ${args.meetingLink}` : null,
    base ? `Open app: ${base}/dashboard` : null,
  ].filter(Boolean) as string[];

  const text = lines.join("\n");

  const html = `
    <p>${args.extraLine ? `${escapeHtml(args.extraLine)}<br/><br/>` : ""}</p>
    <p><strong>Title:</strong> ${escapeHtml(args.title)}</p>
    <p><strong>When:</strong> ${escapeHtml(args.date)} · ${escapeHtml(args.startTime)} – ${escapeHtml(args.endTime)}</p>
    ${args.description ? `<p><strong>Details:</strong> ${escapeHtml(args.description)}</p>` : ""}
    ${args.meetingLink ? `<p><strong>Link:</strong> <a href="${escapeHtml(args.meetingLink)}">${escapeHtml(args.meetingLink)}</a></p>` : ""}
    ${base ? `<p><a href="${escapeHtml(base)}/dashboard">Open Chronosync</a></p>` : ""}
  `.trim();

  return { text, html };
}

/** Civil date + time interpreted in UTC for reminder windows (cron). */
export function meetingStartUtcMs(time: {
  date: string;
  startTime: string;
}): number {
  const [Y, M, D] = time.date.split("-").map(Number);
  const [h, m] = time.startTime.split(":").map(Number);
  return Date.UTC(Y, M - 1, D, h, m, 0, 0);
}

export function notifyNewMeetingRequest(
  ctx: MutationCtx,
  args: {
    toUser: Doc<"users">;
    fromUser: Doc<"users">;
    slot: { date: string; startTime: string; endTime: string };
  },
): void {
  const { toUser, fromUser, slot } = args;
  const subject = "New meeting request";
  const text = [
    `${fromUser.name} sent you a meeting request.`,
    `When: ${slot.date} · ${slot.startTime} – ${slot.endTime}`,
    siteBaseUrl() ? `Open app: ${siteBaseUrl()}/shared` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p><strong>${escapeHtml(fromUser.name)}</strong> sent you a meeting request.</p>
    <p><strong>When:</strong> ${escapeHtml(slot.date)} · ${escapeHtml(slot.startTime)} – ${escapeHtml(slot.endTime)}</p>
    ${siteBaseUrl() ? `<p><a href="${escapeHtml(siteBaseUrl())}/shared">View in Chronosync</a></p>` : ""}
  `.trim();

  sendEmail(ctx, { to: toUser.email, subject, text, html });
}
