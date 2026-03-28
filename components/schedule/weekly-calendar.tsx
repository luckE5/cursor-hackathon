"use client";

import { format, parseISODate } from "@/lib/week-dates";
import { todayISODate } from "@/lib/date";
import {
  type CalBlock,
  DAY_END_MIN,
  DAY_RANGE_MIN,
  DAY_START_MIN,
  SLOT_COUNT,
  SLOT_MINUTES,
  SNAP_MINUTES,
  clampDay,
  durationToHeightPct,
  layoutOverlappingBlocks,
  minToTime,
  minutesToTopPct,
  snapMin,
  timeToMin,
  yToMinutes,
} from "@/lib/schedule-cal";
import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectTriggerClassName } from "@/lib/ui-classes";
import { meetingBlockIcon, scheduleBlockTooltip } from "@/lib/block-details";
import { calendarBlockVisualClass } from "@/lib/calendar-block-classes";
import { ScheduleBlockDetailDialog } from "@/components/schedule/schedule-block-detail-dialog";
import { Skeleton } from "@/components/ui/skeleton";

const SLOT_HEIGHT_PX = 32;
const GRID_HEIGHT_PX = SLOT_COUNT * SLOT_HEIGHT_PX;
const TIME_LABELS = ["8 AM", "11 AM", "2 PM", "5 PM", "8 PM", "11 PM"];

function blockStyle(
  b: CalBlock,
  layout: Map<number, { col: number; cols: number }>,
  index: number,
) {
  const s = timeToMin(b.startTime);
  const e = timeToMin(b.endTime);
  const top = minutesToTopPct(s);
  const h = durationToHeightPct(s, e);
  const L = layout.get(index);
  const cols = L?.cols ?? 1;
  const col = L?.col ?? 0;
  const gap = 0.8;
  const w = (100 - gap * (cols - 1)) / cols;
  const left = col * (w + gap);
  return {
    top: `${top}%`,
    height: `${Math.max(h, 1.2)}%`,
    left: `${left}%`,
    width: `${w}%`,
  };
}

type BlockKind = "task" | "meeting" | "break" | "free";

function calBlockToBlockKind(b: CalBlock): BlockKind {
  if (b.type === "meeting") return "meeting";
  if (b.type === "free" && b.label === "Break") return "break";
  if (b.type === "free") return "free";
  return "task";
}

function blockKindToFields(
  kind: BlockKind,
  label: string,
  description: string,
  meetingLink: string,
): Pick<CalBlock, "type" | "label" | "description" | "meetingLink"> {
  if (kind === "meeting") {
    return {
      type: "meeting",
      label: label.trim() || undefined,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(meetingLink.trim() ? { meetingLink: meetingLink.trim() } : {}),
    };
  }
  if (kind === "break") {
    return { type: "free", label: "Break" };
  }
  if (kind === "free") {
    return { type: "free", label: label.trim() || undefined };
  }
  return { type: "task", label: label.trim() || undefined };
}

export function WeeklyCalendar({
  weekDates,
  blocksByDate,
  dayLoading,
  onReplaceDay,
  selectedDate,
  onSelectDate,
}: {
  weekDates: string[];
  blocksByDate: Record<string, CalBlock[]>;
  dayLoading: boolean[];
  onReplaceDay: (date: string, blocks: CalBlock[]) => Promise<void>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const [detailTarget, setDetailTarget] = useState<{
    date: string;
    block: CalBlock;
  } | null>(null);

  const [dialog, setDialog] = useState<
    | null
    | {
        date: string;
        mode: "create" | "edit";
        blockIndex?: number;
        startTime: string;
        endTime: string;
        blockKind: BlockKind;
        label: string;
        description: string;
        meetingLink: string;
      }
  >(null);

  const [dragPreview, setDragPreview] = useState<{
    date: string;
    startMin: number;
    endMin: number;
  } | null>(null);

  const [optimistic, setOptimistic] = useState<
    Record<string, CalBlock[] | undefined>
  >({});

  const dragRef = useRef<{
    date: string;
    colEl: HTMLDivElement;
    startMin: number;
    pointerId: number;
    moved: boolean;
  } | null>(null);

  const moveRef = useRef<{
    date: string;
    index: number;
    blocks: CalBlock[];
    startY: number;
    origStart: number;
    origEnd: number;
    pointerId: number;
    lastBlocks: CalBlock[];
    hasDragged: boolean;
  } | null>(null);

  const resizeRef = useRef<{
    date: string;
    index: number;
    blocks: CalBlock[];
    startY: number;
    origEnd: number;
    pointerId: number;
    lastBlocks: CalBlock[];
  } | null>(null);

  const blocksFor = useCallback(
    (date: string) => optimistic[date] ?? blocksByDate[date] ?? [],
    [optimistic, blocksByDate],
  );

  const openCreate = useCallback((date: string, startMin: number, endMin: number) => {
    const a = Math.min(startMin, endMin);
    const b = Math.max(startMin, endMin);
    const dur = Math.max(SLOT_MINUTES, b - a);
    const end = Math.min(DAY_END_MIN, a + dur);
    setDialog({
      date,
      mode: "create",
      startTime: minToTime(clampDay(a)),
      endTime: minToTime(clampDay(end)),
      blockKind: "task",
      label: "",
      description: "",
      meetingLink: "",
    });
  }, []);

  const onGridPointerDown = useCallback(
    (e: React.PointerEvent, date: string, colEl: HTMLDivElement) => {
      if ((e.target as HTMLElement).closest("[data-cal-block]")) return;
      const rect = colEl.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const startMin = snapMin(yToMinutes(y, rect.height));
      dragRef.current = {
        date,
        colEl,
        startMin,
        pointerId: e.pointerId,
        moved: false,
      };
      colEl.setPointerCapture(e.pointerId);
      setDragPreview({ date, startMin, endMin: startMin });
    },
    [],
  );

  const onGridPointerMove = useCallback(
    (e: React.PointerEvent, date: string, colEl: HTMLDivElement) => {
      const d = dragRef.current;
      if (!d || d.date !== date || d.pointerId !== e.pointerId) return;
      d.moved = true;
      const rect = colEl.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const endMin = snapMin(yToMinutes(y, rect.height));
      setDragPreview({
        date,
        startMin: d.startMin,
        endMin,
      });
    },
    [],
  );

  const onGridPointerUp = useCallback(
    (e: React.PointerEvent, date: string, colEl: HTMLDivElement) => {
      const d = dragRef.current;
      if (!d || d.date !== date || d.pointerId !== e.pointerId) return;
      try {
        colEl.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragRef.current = null;
      const rect = colEl.getBoundingClientRect();
      const y = e.clientY - rect.top;
      let endMin = snapMin(yToMinutes(y, rect.height));
      let startMin = d.startMin;
      if (endMin < startMin) [startMin, endMin] = [endMin, startMin];
      setDragPreview(null);

      if (!d.moved) {
        const slotEnd = Math.min(DAY_END_MIN, startMin + SLOT_MINUTES);
        openCreate(date, startMin, slotEnd);
        return;
      }
      if (endMin - startMin < SNAP_MINUTES) {
        endMin = Math.min(DAY_END_MIN, startMin + SLOT_MINUTES);
      }
      if (endMin > startMin) {
        openCreate(date, startMin, endMin);
      }
    },
    [openCreate],
  );

  const startMove = (
    e: React.PointerEvent,
    date: string,
    index: number,
    blocks: CalBlock[],
  ) => {
    e.stopPropagation();
    const b = blocks[index];
    moveRef.current = {
      date,
      index,
      blocks: [...blocks],
      startY: e.clientY,
      origStart: timeToMin(b.startTime),
      origEnd: timeToMin(b.endTime),
      pointerId: e.pointerId,
      lastBlocks: blocks,
      hasDragged: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMovePointerMove = (e: React.PointerEvent) => {
    const m = moveRef.current;
    if (!m || m.pointerId !== e.pointerId) return;
    m.hasDragged = true;
    const dy = e.clientY - m.startY;
    const deltaMin =
      Math.round(
        ((dy / GRID_HEIGHT_PX) * DAY_RANGE_MIN) / SNAP_MINUTES,
      ) * SNAP_MINUTES;
    const dur = m.origEnd - m.origStart;
    let ns = m.origStart + deltaMin;
    let ne = ns + dur;
    ns = clampDay(ns);
    ne = clampDay(ne);
    if (ne <= ns) ne = Math.min(DAY_END_MIN, ns + SLOT_MINUTES);
    const next = m.blocks.map((x, i) =>
      i === m.index
        ? { ...x, startTime: minToTime(ns), endTime: minToTime(ne) }
        : x,
    );
    m.lastBlocks = next;
    setOptimistic((o) => ({ ...o, [m.date]: next }));
  };

  const endMove = async (e: React.PointerEvent): Promise<boolean> => {
    const m = moveRef.current;
    if (!m || m.pointerId !== e.pointerId) return false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    moveRef.current = null;
    const dragged = m.hasDragged;
    if (dragged) {
      await onReplaceDay(m.date, m.lastBlocks);
    }
    setOptimistic((o) => {
      const n = { ...o };
      delete n[m.date];
      return n;
    });
    return dragged;
  };

  const startResize = (
    e: React.PointerEvent,
    date: string,
    index: number,
    blocks: CalBlock[],
  ) => {
    e.stopPropagation();
    resizeRef.current = {
      date,
      index,
      blocks: [...blocks],
      startY: e.clientY,
      origEnd: timeToMin(blocks[index].endTime),
      pointerId: e.pointerId,
      lastBlocks: blocks,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onResizePointerMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r || r.pointerId !== e.pointerId) return;
    const dy = e.clientY - r.startY;
    const deltaMin =
      Math.round(
        ((dy / GRID_HEIGHT_PX) * DAY_RANGE_MIN) / SNAP_MINUTES,
      ) * SNAP_MINUTES;
    const b = r.blocks[r.index];
    const start = timeToMin(b.startTime);
    let ne = clampDay(r.origEnd + deltaMin);
    if (ne <= start) ne = Math.min(DAY_END_MIN, start + SLOT_MINUTES);
    const next = r.blocks.map((x, i) =>
      i === r.index ? { ...x, endTime: minToTime(ne) } : x,
    );
    r.lastBlocks = next;
    setOptimistic((o) => ({ ...o, [r.date]: next }));
  };

  const endResize = async (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r || r.pointerId !== e.pointerId) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    resizeRef.current = null;
    await onReplaceDay(r.date, r.lastBlocks);
    setOptimistic((o) => {
      const n = { ...o };
      delete n[r.date];
      return n;
    });
  };

  async function saveDialog() {
    if (!dialog) return;
    const {
      date,
      mode,
      blockIndex,
      startTime,
      endTime,
      blockKind,
      label,
      description,
      meetingLink,
    } = dialog;
    const cur = [...(blocksByDate[date] ?? [])];
    let s = timeToMin(startTime);
    let en = timeToMin(endTime);
    if (en <= s) {
      [s, en] = [en, s];
      if (en <= s) en = Math.min(DAY_END_MIN, s + SLOT_MINUTES);
    }
    const fields = blockKindToFields(
      blockKind,
      label,
      description,
      meetingLink,
    );
    const nb: CalBlock = {
      startTime: minToTime(clampDay(s)),
      endTime: minToTime(clampDay(en)),
      ...fields,
    };
    if (mode === "create") {
      cur.push(nb);
    } else if (blockIndex !== undefined && blockIndex < cur.length) {
      cur[blockIndex] = nb;
    }
    cur.sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));
    await onReplaceDay(date, cur);
    setDialog(null);
  }

  async function deleteBlock() {
    if (!dialog || dialog.mode !== "edit" || dialog.blockIndex === undefined)
      return;
    const cur = [...(blocksByDate[dialog.date] ?? [])];
    cur.splice(dialog.blockIndex, 1);
    await onReplaceDay(dialog.date, cur);
    setDialog(null);
  }

  const dayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = todayISODate();

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/50 bg-white/40 shadow-[0_24px_70px_-28px_rgba(79,70,229,0.28)] backdrop-blur-xl backdrop-saturate-150">
      <div className="overflow-x-auto">
        <div
          className="flex min-w-[720px]"
          style={{ minHeight: GRID_HEIGHT_PX + 48 }}
        >
          <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-white/40 bg-white/35 pt-10 backdrop-blur-md">
            {TIME_LABELS.map((t) => (
              <div
                key={t}
                className="text-[10px] font-medium text-slate-400"
                style={{
                  height: GRID_HEIGHT_PX / TIME_LABELS.length,
                  paddingTop: 2,
                }}
              >
                {t}
              </div>
            ))}
          </div>

          {weekDates.map((date, di) => {
            const blocks = blocksFor(date);
            const layout = layoutOverlappingBlocks(blocks);
            const loading = dayLoading[di];
            const isSel = date === selectedDate;
            const dObj = parseISODate(date);

            return (
              <div
                key={date}
                className={cn(
                  "relative min-w-0 flex-1 border-r border-white/35 transition-colors duration-200 last:border-r-0 hover:bg-indigo-500/[0.05]",
                  isSel && "bg-indigo-500/[0.08]",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectDate(date)}
                  className={cn(
                    "flex w-full flex-col items-center border-b border-white/40 px-1 py-2.5 text-center transition-all duration-200 hover:bg-white/40",
                    isSel && "bg-white/55 shadow-[inset_0_-1px_0_0_rgba(99,102,241,0.15)]",
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {dayShort[di]}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold tabular-nums text-slate-900",
                      date === today && "text-blue-600",
                    )}
                  >
                    {format(dObj, "d")}
                  </span>
                </button>

                <div
                  className="relative border-t border-white/35 bg-[linear-gradient(to_bottom,transparent_0,transparent_calc(100%-1px),rgba(148,163,184,0.35)_calc(100%-1px))] bg-[length:100%_32px]"
                  style={{ height: GRID_HEIGHT_PX }}
                >
                  {loading ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/35 px-4 backdrop-blur-[2px]">
                      <div className="flex w-full max-w-[140px] flex-col gap-2">
                        <Skeleton className="h-2 w-full" />
                        <Skeleton className="h-2 w-[80%]" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Syncing day…
                      </p>
                    </div>
                  ) : null}

                  <div
                    className="absolute inset-0"
                    onPointerDown={(e) => {
                      const el = e.currentTarget;
                      onGridPointerDown(e, date, el);
                    }}
                    onPointerMove={(e) =>
                      onGridPointerMove(e, date, e.currentTarget)
                    }
                    onPointerUp={(e) =>
                      onGridPointerUp(e, date, e.currentTarget)
                    }
                    onPointerCancel={(e) => {
                      dragRef.current = null;
                      setDragPreview(null);
                      try {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    {dragPreview && dragPreview.date === date ? (
                      <div
                        className="pointer-events-none absolute z-[5] rounded-xl border-2 border-dashed border-indigo-400/90 bg-gradient-to-br from-sky-200/50 to-indigo-200/45 shadow-inner transition-all duration-200"
                        style={{
                          top: `${minutesToTopPct(Math.min(dragPreview.startMin, dragPreview.endMin))}%`,
                          height: `${durationToHeightPct(
                            Math.min(dragPreview.startMin, dragPreview.endMin),
                            Math.max(dragPreview.startMin, dragPreview.endMin),
                          )}%`,
                          left: "4%",
                          width: "92%",
                        }}
                      />
                    ) : null}

                    {blocks.map((b, index) => {
                      const st = blockStyle(b, layout, index);
                      return (
                        <div
                          key={`${date}-${index}-${b.startTime}`}
                          data-cal-block
                          className={cn(
                            "absolute z-[6] cursor-grab overflow-hidden rounded-xl px-1.5 py-1 text-left text-[10px] font-semibold leading-tight shadow-md",
                            "transition-all duration-200 ease-out will-change-transform",
                            "hover:z-[12] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/25 active:cursor-grabbing",
                            calendarBlockVisualClass(b),
                          )}
                          style={st}
                          title={scheduleBlockTooltip(b)}
                          onPointerDown={(e) => startMove(e, date, index, blocks)}
                          onPointerMove={onMovePointerMove}
                          onPointerUp={(e) => {
                            void (async () => {
                              const dragged = await endMove(e);
                              if (!dragged) {
                                if (b.type === "meeting") {
                                  setDetailTarget({ date, block: b });
                                } else {
                                  setDialog({
                                    date,
                                    mode: "edit",
                                    blockIndex: index,
                                    startTime: b.startTime,
                                    endTime: b.endTime,
                                    blockKind: calBlockToBlockKind(b),
                                    label: b.label ?? "",
                                    description: b.description ?? "",
                                    meetingLink: b.meetingLink ?? "",
                                  });
                                }
                              }
                            })();
                          }}
                          onPointerCancel={(e) => {
                            void endMove(e);
                          }}
                        >
                          <div className="flex items-start gap-0.5">
                            {meetingBlockIcon(b) ? (
                              <span className="shrink-0 text-[10px] leading-none opacity-95">
                                {meetingBlockIcon(b)}
                              </span>
                            ) : null}
                            <div className="min-w-0 flex-1 truncate">
                              {b.label || b.type}
                            </div>
                          </div>
                          <div className="opacity-90">
                            {b.startTime}–{b.endTime}
                          </div>
                          <div
                            className="absolute bottom-0 left-1 right-1 h-1.5 cursor-ns-resize rounded-b bg-white/25 hover:bg-white/50"
                            onPointerDown={(e) =>
                              startResize(e, date, index, blocks)
                            }
                            onPointerMove={onResizePointerMove}
                            onPointerUp={(e) => void endResize(e)}
                            onPointerCancel={(e) => void endResize(e)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ScheduleBlockDetailDialog
        open={!!detailTarget}
        onOpenChange={(o) => !o && setDetailTarget(null)}
        block={detailTarget?.block ?? null}
        onEdit={
          detailTarget
            ? () => {
                const { date, block } = detailTarget;
                const blocks = blocksFor(date);
                const blockIndex = blocks.findIndex(
                  (x) =>
                    x.startTime === block.startTime &&
                    x.endTime === block.endTime &&
                    x.type === block.type,
                );
                if (blockIndex >= 0) {
                  setDialog({
                    date,
                    mode: "edit",
                    blockIndex,
                    startTime: block.startTime,
                    endTime: block.endTime,
                    blockKind: calBlockToBlockKind(block),
                    label: block.label ?? "",
                    description: block.description ?? "",
                    meetingLink: block.meetingLink ?? "",
                  });
                }
                setDetailTarget(null);
              }
            : undefined
        }
      />

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "create" ? "New block" : "Edit block"}
            </DialogTitle>
          </DialogHeader>
          {dialog ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input
                    type="time"
                    value={dialog.startTime}
                    onChange={(e) =>
                      setDialog({ ...dialog, startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input
                    type="time"
                    value={dialog.endTime}
                    onChange={(e) =>
                      setDialog({ ...dialog, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className={selectTriggerClassName()}
                  value={dialog.blockKind}
                  onChange={(e) =>
                    setDialog({
                      ...dialog,
                      blockKind: e.target.value as BlockKind,
                    })
                  }
                >
                  <option value="task">Task</option>
                  <option value="meeting">Meeting</option>
                  <option value="break">Break</option>
                  <option value="free">Free time</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={dialog.label}
                  onChange={(e) =>
                    setDialog({ ...dialog, label: e.target.value })
                  }
                  placeholder={
                    dialog.blockKind === "break"
                      ? "Break (label optional)"
                      : "Optional"
                  }
                  disabled={dialog.blockKind === "break"}
                />
              </div>
              {dialog.blockKind === "meeting" ? (
                <>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={dialog.description}
                      onChange={(e) =>
                        setDialog({ ...dialog, description: e.target.value })
                      }
                      placeholder="Agenda, context…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meeting link</Label>
                    <Input
                      value={dialog.meetingLink}
                      onChange={(e) =>
                        setDialog({ ...dialog, meetingLink: e.target.value })
                      }
                      placeholder="https://…"
                    />
                  </div>
                </>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void saveDialog()}>Save</Button>
                {dialog.mode === "edit" ? (
                  <Button variant="secondary" onClick={() => void deleteBlock()}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
