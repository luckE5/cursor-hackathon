"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isScheduleAccessDenied } from "@/lib/schedule-access";

/** Fourteen parallel subscriptions: user A × 7 days + user B × 7 days. */
export function useTwoUserWeekSchedules(
  userA: Id<"users"> | null,
  userB: Id<"users"> | null,
  viewerId: Id<"users"> | null,
  dates: string[],
) {
  const d = dates.length === 7 ? dates : ["", "", "", "", "", "", ""];
  const a = userA;
  const b = userB;
  const v = viewerId;

  const a0 = useQuery(
    api.schedules.getSchedule,
    a && v && d[0] ? { userId: a, date: d[0], viewerId: v } : "skip",
  );
  const a1 = useQuery(
    api.schedules.getSchedule,
    a && v && d[1] ? { userId: a, date: d[1], viewerId: v } : "skip",
  );
  const a2 = useQuery(
    api.schedules.getSchedule,
    a && v && d[2] ? { userId: a, date: d[2], viewerId: v } : "skip",
  );
  const a3 = useQuery(
    api.schedules.getSchedule,
    a && v && d[3] ? { userId: a, date: d[3], viewerId: v } : "skip",
  );
  const a4 = useQuery(
    api.schedules.getSchedule,
    a && v && d[4] ? { userId: a, date: d[4], viewerId: v } : "skip",
  );
  const a5 = useQuery(
    api.schedules.getSchedule,
    a && v && d[5] ? { userId: a, date: d[5], viewerId: v } : "skip",
  );
  const a6 = useQuery(
    api.schedules.getSchedule,
    a && v && d[6] ? { userId: a, date: d[6], viewerId: v } : "skip",
  );

  const b0 = useQuery(
    api.schedules.getSchedule,
    b && v && d[0] ? { userId: b, date: d[0], viewerId: v } : "skip",
  );
  const b1 = useQuery(
    api.schedules.getSchedule,
    b && v && d[1] ? { userId: b, date: d[1], viewerId: v } : "skip",
  );
  const b2 = useQuery(
    api.schedules.getSchedule,
    b && v && d[2] ? { userId: b, date: d[2], viewerId: v } : "skip",
  );
  const b3 = useQuery(
    api.schedules.getSchedule,
    b && v && d[3] ? { userId: b, date: d[3], viewerId: v } : "skip",
  );
  const b4 = useQuery(
    api.schedules.getSchedule,
    b && v && d[4] ? { userId: b, date: d[4], viewerId: v } : "skip",
  );
  const b5 = useQuery(
    api.schedules.getSchedule,
    b && v && d[5] ? { userId: b, date: d[5], viewerId: v } : "skip",
  );
  const b6 = useQuery(
    api.schedules.getSchedule,
    b && v && d[6] ? { userId: b, date: d[6], viewerId: v } : "skip",
  );

  const blocksA = [a0, a1, a2, a3, a4, a5, a6] as const;
  const blocksB = [b0, b1, b2, b3, b4, b5, b6] as const;

  const loadingA = blocksA.map((x) => x === undefined);
  const loadingB = blocksB.map((x) => x === undefined);

  const peerAccessDenied =
    !!userB &&
    !!viewerId &&
    [b0, b1, b2, b3, b4, b5, b6].some(
      (x) => x !== undefined && isScheduleAccessDenied(x),
    );

  return { blocksA, blocksB, loadingA, loadingB, peerAccessDenied };
}
