import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const timeSlot = v.object({
  date: v.string(),
  startTime: v.string(),
  endTime: v.string(),
});

const scheduleBlock = v.object({
  startTime: v.string(),
  endTime: v.string(),
  type: v.union(v.literal("task"), v.literal("free"), v.literal("meeting")),
  label: v.optional(v.string()),
  description: v.optional(v.string()),
  meetingLink: v.optional(v.string()),
});

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    preference: v.union(v.literal("morning"), v.literal("night")),
    mode: v.optional(v.union(v.literal("social"), v.literal("work"))),
    /** Explicit `false` = show mode onboarding; omit on legacy users (treated as done). */
    modeOnboardingDone: v.optional(v.boolean()),
    /** PBKDF2-style storage: random salt + SHA-256 hash (see convex/lib/password.ts). */
    passwordSalt: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    /** Convex file storage id for profile picture. */
    avatarStorageId: v.optional(v.id("_storage")),
  }).index("by_email", ["email"]),

  schedules: defineTable({
    userId: v.id("users"),
    date: v.string(),
    blocks: v.array(scheduleBlock),
  }).index("by_user_date", ["userId", "date"]),

  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    duration: v.number(),
    priority: v.number(),
  }).index("by_user", ["userId"]),

  requests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    requestedTime: timeSlot,
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    suggestedAlternative: v.optional(timeSlot),
  })
    .index("by_to_user", ["toUserId"])
    .index("by_from_user", ["fromUserId"]),

  meetings: defineTable({
    participants: v.array(v.id("users")),
    time: timeSlot,
    createdFromRequestId: v.optional(v.id("requests")),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
    /** Set when a “starting soon” reminder email was queued/sent (cron). */
    reminderEmailSentAt: v.optional(v.number()),
  }),

  organizations: defineTable({
    name: v.string(),
  }),

  organizationJoinRequests: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
    ),
  })
    .index("by_org_status", ["organizationId", "status"])
    .index("by_user_org", ["userId", "organizationId"])
    .index("by_user", ["userId"]),

  organizationInvites: defineTable({
    organizationId: v.id("organizations"),
    code: v.string(),
    role: v.union(v.literal("member"), v.literal("manager")),
    createdBy: v.id("users"),
    expiresAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_org", ["organizationId"]),

  memberships: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    role: v.union(v.literal("member"), v.literal("manager")),
  })
    .index("by_org", ["organizationId"])
    .index("by_user_org", ["userId", "organizationId"])
    .index("by_user", ["userId"]),

  /** Canonical pair (userMin < userMax) for simple friend graph. */
  friendships: defineTable({
    userMin: v.id("users"),
    userMax: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted")),
    requestedBy: v.id("users"),
  })
    .index("by_userMin", ["userMin"])
    .index("by_userMax", ["userMax"])
    .index("by_pair", ["userMin", "userMax"]),
});
