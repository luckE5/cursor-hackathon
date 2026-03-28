"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/** Seven parallel Convex subscriptions for Mon–Sun ISO dates. */
export function useWeekSchedules(
  userId: Id<"users"> | null,
  viewerId: Id<"users"> | null,
  dates: string[],
) {
  const d = dates.length === 7 ? dates : ["", "", "", "", "", "", ""];
  const q0 = useQuery(
    api.schedules.getSchedule,
    userId && viewerId && d[0]
      ? { userId, date: d[0], viewerId }
      : "skip",
  );
  const q1 = useQuery(
    api.schedules.getSchedule,
    userId && viewerId && d[1]
      ? { userId, date: d[1], viewerId }
      : "skip",
  );
  const q2 = useQuery(
    api.schedules.getSchedule,
    userId && viewerId && d[2]
      ? { userId, date: d[2], viewerId }
      : "skip",
  );
  const q3 = useQuery(
    api.schedules.getSchedule,
    userId && viewerId && d[3]
      ? { userId, date: d[3], viewerId }
      : "skip",
  );
  const q4 = useQuery(
    api.schedules.getSchedule,
    userId && viewerId && d[4]
      ? { userId, date: d[4], viewerId }
      : "skip",
  );
  const q5 = useQuery(
    api.schedules.getSchedule,
    userId && viewerId && d[5]
      ? { userId, date: d[5], viewerId }
      : "skip",
  );
  const q6 = useQuery(
    api.schedules.getSchedule,
    userId && viewerId && d[6]
      ? { userId, date: d[6], viewerId }
      : "skip",
  );
  return [q0, q1, q2, q3, q4, q5, q6] as const;
}
