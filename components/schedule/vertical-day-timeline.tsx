"use client";

import { meetingBlockIcon, scheduleBlockTooltip } from "@/lib/block-details";
import type { CalBlock } from "@/lib/schedule-cal";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScheduleBlockVM = {
  startTime: string;
  endTime: string;
  type: "task" | "free" | "meeting";
  label?: string;
  description?: string;
  meetingLink?: string;
};

const typeStyle: Record<
  ScheduleBlockVM["type"],
  { dot: string; bar: string; badge: string; label: string }
> = {
  task: {
    dot: "bg-gradient-to-br from-sky-400 to-indigo-600 shadow-lg shadow-sky-500/40",
    bar: "border-l-[3px] border-sky-500/90 bg-gradient-to-br from-sky-500/12 via-blue-500/10 to-indigo-600/12 backdrop-blur-sm",
    badge:
      "bg-gradient-to-r from-sky-500/90 to-indigo-600/90 text-white shadow-md shadow-sky-500/25",
    label: "text-slate-900",
  },
  free: {
    dot: "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/35",
    bar: "border-l-[3px] border-emerald-500/90 bg-gradient-to-br from-emerald-500/12 via-teal-500/10 to-cyan-600/12 backdrop-blur-sm",
    badge:
      "bg-gradient-to-r from-emerald-500/90 to-teal-600/90 text-white shadow-md shadow-emerald-500/20",
    label: "text-slate-900",
  },
  meeting: {
    dot: "bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/40",
    bar: "border-l-[3px] border-violet-500/90 bg-gradient-to-br from-violet-500/12 via-purple-600/10 to-fuchsia-600/12 backdrop-blur-sm",
    badge:
      "bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white shadow-md shadow-violet-500/25",
    label: "text-slate-900",
  },
};

function sortBlocks(blocks: ScheduleBlockVM[]) {
  return [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function VerticalDayTimeline({
  blocks,
  emptyLabel = "No blocks scheduled for this day.",
  onBlockClick,
}: {
  blocks: ScheduleBlockVM[];
  emptyLabel?: string;
  onBlockClick?: (block: ScheduleBlockVM) => void;
}) {
  const sorted = sortBlocks(blocks);

  if (!sorted.length) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-white/60 bg-white/30 px-6 py-14 text-center shadow-inner shadow-white/20 backdrop-blur-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 ring-1 ring-indigo-500/20">
          <CalendarDays className="h-7 w-7 opacity-90" aria-hidden />
        </div>
        <p className="text-sm font-medium text-slate-600">{emptyLabel}</p>
        <p className="mt-2 text-xs text-slate-500">
          No tasks yet — start by generating your day or adding a block.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute bottom-2 left-[9px] top-3 w-px bg-gradient-to-b from-indigo-300/50 via-violet-300/40 to-transparent" />
      <ul className="space-y-5">
        {sorted.map((b, i) => {
          const st = typeStyle[b.type];
          const interactive =
            b.type === "meeting" && typeof onBlockClick === "function";
          const card = (
            <div
              className={cn(
                "min-w-0 flex-1 rounded-2xl border border-white/50 px-5 py-4 shadow-md shadow-indigo-500/5 transition-all duration-200 ease-out",
                st.bar,
                interactive &&
                  "hover:-translate-y-0.5 hover:border-white/70 hover:shadow-lg hover:shadow-indigo-500/15",
              )}
              title={scheduleBlockTooltip(b)}
            >
              <div className="flex flex-wrap items-center gap-2">
                {meetingBlockIcon(b as CalBlock) ? (
                  <span className="text-sm" aria-hidden>
                    {meetingBlockIcon(b as CalBlock)}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    st.badge,
                  )}
                >
                  {b.type}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {b.startTime} – {b.endTime}
                </span>
              </div>
              <p
                className={cn(
                  "mt-2 text-[15px] font-semibold leading-snug tracking-tight",
                  st.label,
                )}
              >
                {b.label ??
                  (b.type === "free" ? "Free time" : "Untitled block")}
              </p>
            </div>
          );

          return (
            <li
              key={`${b.startTime}-${b.endTime}-${i}`}
              className="relative flex gap-5 pl-0.5"
            >
              {interactive ? (
                <button
                  type="button"
                  className="flex w-full gap-5 text-left"
                  onClick={() => onBlockClick!(b)}
                >
                  <div
                    className={cn(
                      "relative z-[1] mt-2 h-3.5 w-3.5 shrink-0 rounded-full ring-[6px] ring-white/80",
                      st.dot,
                    )}
                  />
                  {card}
                </button>
              ) : (
                <div className="flex w-full gap-5">
                  <div
                    className={cn(
                      "relative z-[1] mt-2 h-3.5 w-3.5 shrink-0 rounded-full ring-[6px] ring-white/80",
                      st.dot,
                    )}
                  />
                  {card}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
