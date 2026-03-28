/** Convex getSchedule may return this when the viewer cannot see the target user. */
export function isScheduleAccessDenied(
  data: unknown,
): data is { accessDenied: true } {
  return (
    data !== null &&
    typeof data === "object" &&
    "accessDenied" in data &&
    (data as { accessDenied?: boolean }).accessDenied === true
  );
}

/** Safe blocks for calendar UI; never leaks data when access is denied. */
export function scheduleQueryBlocks(data: unknown): {
  blocks: Array<{
    startTime: string;
    endTime: string;
    type: "task" | "free" | "meeting";
    label?: string;
  }>;
  denied: boolean;
} {
  if (data === undefined) {
    return { blocks: [], denied: false };
  }
  if (isScheduleAccessDenied(data)) {
    return { blocks: [], denied: true };
  }
  const doc = data as {
    blocks?: Array<{
      startTime: string;
      endTime: string;
      type: "task" | "free" | "meeting";
      label?: string;
      description?: string;
      meetingLink?: string;
    }>;
  } | null;
  return { blocks: doc?.blocks ?? [], denied: false };
}
