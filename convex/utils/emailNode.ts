"use node";

import nodemailer from "nodemailer";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

/**
 * Sends mail via Nodemailer. Never throws — failures are logged only.
 * Env: EMAIL_USER, EMAIL_PASS (required). Optional: SMTP_HOST, SMTP_PORT, SMTP_SECURE.
 */
export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    text: v.string(),
    html: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    try {
      const user = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASS;
      if (!user || !pass) {
        console.error(
          "[email] EMAIL_USER or EMAIL_PASS is not set; skipping send to",
          args.to,
        );
        return null;
      }

      const host = process.env.SMTP_HOST;
      const transporter = host
        ? nodemailer.createTransport({
            host,
            port: Number(process.env.SMTP_PORT ?? "587"),
            secure: process.env.SMTP_SECURE === "true",
            auth: { user, pass },
          })
        : nodemailer.createTransport({
            service: "gmail",
            auth: { user, pass },
          });

      await transporter.sendMail({
        from: `"Chronosync" <${user}>`,
        to: args.to,
        subject: args.subject,
        text: args.text,
        html: args.html ?? args.text.replace(/\n/g, "<br/>"),
      });
    } catch (e) {
      console.error("[email] sendEmail failed:", e);
    }
    return null;
  },
});
