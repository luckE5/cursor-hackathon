"use client";

import { cn } from "@/lib/utils";

type Block = {
  startTime: string;
  endTime: string;
  type: "task" | "free" | "meeting";
  label?: string;
};

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const DAY_START = 6 * 60;
const DAY_END = 23 * 60;
const RANGE = DAY_END - DAY_START;

const typeStyles: Record<
  Block["type"],
  { bar: string; text: string }
> = {
  task: {
    bar: "bg-blue-500/95 dark:bg-blue-600",
    text: "text-white",
  },
  free: {
    bar: "bg-emerald-500/90 dark:bg-emerald-600",
    text: "text-white dark:text-emerald-50",
  },
  meeting: {
    bar: "bg-violet-600/95 dark:bg-violet-700",
    text: "text-white",
  },
};

export function DayTimeline({
  blocks,
  title,
  userId,
  highlightRanges,
}: {
  blocks: Block[];
  title: string;
  userId?: string;
  highlightRanges?: {
    kind: "overlap" | "conflict" | "request";
    startTime: string;
    endTime: string;
  }[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {userId ? (
          <span className="truncate font-mono text-[10px] text-slate-400">
            {userId.slice(0, 8)}…
          </span>
        ) : null}
      </div>
      <div className="relative h-16 w-full overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/80 shadow-inner shadow-slate-200/30">
        <div className="absolute inset-x-0 bottom-0 top-0">
          {blocks.map((b, i) => {
            const s = Math.max(toMin(b.startTime), DAY_START);
            const e = Math.min(toMin(b.endTime), DAY_END);
            if (e <= s) return null;
            const left = ((s - DAY_START) / RANGE) * 100;
            const width = ((e - s) / RANGE) * 100;
            const st = typeStyles[b.type];
            return (
              <div
                key={`${b.startTime}-${i}`}
                title={`${b.label ?? b.type} · ${b.startTime}–${b.endTime}`}
                className={cn(
                  "absolute top-1 bottom-1 flex min-w-[2px] items-center justify-center overflow-hidden rounded-md px-0.5 text-[10px] font-medium shadow-sm",
                  st.bar,
                  st.text,
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
              >
                <span className="truncate">{b.label ?? b.type}</span>
              </div>
            );
          })}
          {highlightRanges?.map((h, i) => {
            const s = Math.max(toMin(h.startTime), DAY_START);
            const e = Math.min(toMin(h.endTime), DAY_END);
            if (e <= s) return null;
            const left = ((s - DAY_START) / RANGE) * 100;
            const width = ((e - s) / RANGE) * 100;
            const band =
              h.kind === "overlap"
                ? "bg-emerald-400/45 ring-2 ring-emerald-500/70"
                : h.kind === "conflict"
                  ? "bg-red-500/40 ring-2 ring-red-600/80"
                  : "bg-yellow-400/45 ring-2 ring-yellow-500/70";
            return (
              <div
                key={`hl-${i}`}
                className={cn(
                  "pointer-events-none absolute top-0 bottom-0 rounded-md",
                  band,
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })}
        </div>
      </div>
      <div className="flex justify-between text-[10px] font-medium text-slate-400">
        <span>06:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}
