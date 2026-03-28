import { minToTime, timeToMin, type CalBlock } from "@/lib/schedule-cal";

function busy(blocks: CalBlock[]) {
  return blocks.filter((b) => b.type !== "free");
}

function free(blocks: CalBlock[]) {
  return blocks.filter((b) => b.type === "free");
}

/** Busy overlap regions between two users (red highlights). */
export function conflictSegments(
  blocksA: CalBlock[],
  blocksB: CalBlock[],
): { startTime: string; endTime: string }[] {
  const out: { startTime: string; endTime: string }[] = [];
  for (const ba of busy(blocksA)) {
    const sa = timeToMin(ba.startTime);
    const ea = timeToMin(ba.endTime);
    for (const bb of busy(blocksB)) {
      const sb = timeToMin(bb.startTime);
      const eb = timeToMin(bb.endTime);
      if (sa < eb && sb < ea) {
        const s = Math.max(sa, sb);
        const e = Math.min(ea, eb);
        if (s < e) {
          out.push({ startTime: minToTime(s), endTime: minToTime(e) });
        }
      }
    }
  }
  return out;
}

/** Mutual free overlap (green highlights). */
export function mutualFreeSegments(
  blocksA: CalBlock[],
  blocksB: CalBlock[],
): { startTime: string; endTime: string }[] {
  const out: { startTime: string; endTime: string }[] = [];
  for (const fa of free(blocksA)) {
    const s1 = timeToMin(fa.startTime);
    const e1 = timeToMin(fa.endTime);
    for (const fb of free(blocksB)) {
      const s2 = timeToMin(fb.startTime);
      const e2 = timeToMin(fb.endTime);
      const s = Math.max(s1, s2);
      const e = Math.min(e1, e2);
      if (s < e) {
        out.push({ startTime: minToTime(s), endTime: minToTime(e) });
      }
    }
  }
  return out;
}

export function peerBusyOverlapsRange(
  peerBlocks: CalBlock[],
  startMin: number,
  endMin: number,
): boolean {
  for (const b of busy(peerBlocks)) {
    const s = timeToMin(b.startTime);
    const e = timeToMin(b.endTime);
    if (s < endMin && startMin < e) return true;
  }
  return false;
}

export function selfBusyOverlapsRange(
  blocks: CalBlock[],
  startMin: number,
  endMin: number,
): boolean {
  return peerBusyOverlapsRange(blocks, startMin, endMin);
}

/** Manager: employee busy overlap for assign slot. */
export function anyBusyOverlapsRange(
  blocks: CalBlock[],
  startMin: number,
  endMin: number,
): boolean {
  for (const b of busy(blocks)) {
    const s = timeToMin(b.startTime);
    const e = timeToMin(b.endTime);
    if (s < endMin && startMin < e) return true;
  }
  return false;
}
