import type { CalBlock } from "@/lib/schedule-cal";

/** Soft gradient fills: blue tasks, green free, purple meetings; yellow for pending / locked. */
export const calendarTypeClass: Record<CalBlock["type"], string> = {
  task:
    "border-l-[3px] border-sky-400/90 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-900/25",
  free:
    "border-l-[3px] border-emerald-400/90 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-700 text-white shadow-lg shadow-emerald-900/20",
  meeting:
    "border-l-[3px] border-violet-400/90 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-700 text-white shadow-lg shadow-violet-900/25",
};

export function calendarBlockVisualClass(b: CalBlock): string {
  if (b.label === "—") {
    return "border-l-[3px] border-slate-300/80 bg-gradient-to-br from-slate-200/90 to-slate-300/80 text-slate-800 shadow-md shadow-slate-500/15";
  }
  if (b.label === "Break") {
    return "border-l-[3px] border-teal-400/90 bg-gradient-to-br from-teal-300 via-cyan-400 to-emerald-500 text-teal-950 shadow-md shadow-teal-900/15";
  }
  if (b.type === "meeting" && b.label?.startsWith("🔒")) {
    return "border-l-[3px] border-amber-400/90 bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 text-amber-950 shadow-lg shadow-amber-900/20";
  }
  return calendarTypeClass[b.type];
}
