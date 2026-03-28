import type { CalBlock } from "@/lib/schedule-cal";
import { timeToMin } from "@/lib/schedule-cal";

/** Matches org manager assign window (convex/organizations WORK_START / WORK_END). */
export const TEAM_HEATMAP_WORK_START_MIN = 9 * 60;
export const TEAM_HEATMAP_WORK_END_MIN = 18 * 60;
export const TEAM_HEATMAP_SLOT_MINUTES = 30;

export type HeatmapMember = { userId: string; name: string };

export type HeatmapCell = {
  scheduleExists: boolean;
  blocks: CalBlock[];
};

export type OrganizationHeatmapPayload = {
  members: HeatmapMember[];
  schedulesByDate: Record<string, Record<string, HeatmapCell>>;
};

export type HeatSlot = {
  slotStartMin: number;
  slotEndMin: number;
  freeCount: number;
  totalMembers: number;
  ratio: number;
};

function isBusyBlock(b: CalBlock): boolean {
  return b.type === "meeting" || b.type === "task";
}

function slotOverlapsBusy(
  slotStart: number,
  slotEnd: number,
  blocks: CalBlock[],
): boolean {
  for (const b of blocks) {
    if (!isBusyBlock(b)) continue;
    const bs = timeToMin(b.startTime);
    const be = timeToMin(b.endTime);
    if (slotStart < be && slotEnd > bs) return true;
  }
  return false;
}

/** Missing schedule or overlapping meeting/task → not free. */
export function isMemberFreeInSlot(
  scheduleExists: boolean,
  blocks: CalBlock[],
  slotStart: number,
  slotEnd: number,
): boolean {
  if (!scheduleExists) return false;
  return !slotOverlapsBusy(slotStart, slotEnd, blocks);
}

export function computeDayHeatSlots(
  date: string,
  members: HeatmapMember[],
  schedulesByDate: Record<string, Record<string, HeatmapCell>>,
): HeatSlot[] {
  const total = members.length;
  if (total === 0) return [];
  const dayMap = schedulesByDate[date] ?? {};
  const slots: HeatSlot[] = [];
  for (
    let m = TEAM_HEATMAP_WORK_START_MIN;
    m < TEAM_HEATMAP_WORK_END_MIN;
    m += TEAM_HEATMAP_SLOT_MINUTES
  ) {
    const slotEnd = m + TEAM_HEATMAP_SLOT_MINUTES;
    let freeCount = 0;
    for (const mem of members) {
      const cell = dayMap[mem.userId];
      if (!cell) continue;
      if (isMemberFreeInSlot(cell.scheduleExists, cell.blocks, m, slotEnd)) {
        freeCount++;
      }
    }
    slots.push({
      slotStartMin: m,
      slotEndMin: slotEnd,
      freeCount,
      totalMembers: total,
      ratio: freeCount / total,
    });
  }
  return slots;
}

export function heatLevel(
  ratio: number,
): "high" | "medium" | "low" {
  if (ratio > 0.7) return "high";
  if (ratio >= 0.4) return "medium";
  return "low";
}
