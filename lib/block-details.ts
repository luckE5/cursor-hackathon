import type { CalBlock } from "@/lib/schedule-cal";

export function scheduleBlockTooltip(b: CalBlock): string {
  const title = b.label?.trim() || b.type;
  const bits = [title, b.startTime, b.endTime];
  if (b.description?.trim()) bits.push(b.description.trim().slice(0, 100));
  if (b.meetingLink?.trim()) bits.push("Link available");
  return bits.join(" · ");
}

export function meetingBlockIcon(b: CalBlock): string {
  if (b.type !== "meeting") return "";
  if (b.label?.startsWith("🔒")) return "🔒";
  return "📅";
}
