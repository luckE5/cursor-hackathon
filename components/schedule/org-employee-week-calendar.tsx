"use client";

import { format, parseISODate } from "@/lib/week-dates";
import { todayISODate } from "@/lib/date";
import {
  type CalBlock,
  DAY_END_MIN,
  DAY_RANGE_MIN,
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
import {
  type OrganizationHeatmapPayload,
  computeDayHeatSlots,
  heatLevel,
} from "@/lib/team-heatmap";
import { ScheduleBlockDetailDialog } from "@/components/schedule/schedule-block-detail-dialog";
import { calendarTypeClass } from "@/lib/calendar-block-classes";
import { anyBusyOverlapsRange } from "@/lib/shared-schedule-view";
import { meetingBlockIcon, scheduleBlockTooltip } from "@/lib/block-details";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GRID_HEIGHT_PX = SLOT_COUNT * 32;
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

export function OrgEmployeeWeekCalendar({
  weekDates,
  employeeName,
  employeeId,
  blocksByDate,
  dayLoadingEach,
  isManager,
  managerBlocksByDate,
  onAssignMeeting,
  onAssignBlock,
  teamHeatmap,
}: {
  weekDates: string[];
  employeeName: string;
  employeeId: Id<"users">;
  blocksByDate: Record<string, CalBlock[]>;
  dayLoadingEach: boolean[];
  isManager: boolean;
  managerBlocksByDate: Record<string, CalBlock[]>;
  onAssignMeeting: (args: {
    date: string;
    startTime: string;
    endTime: string;
    force: boolean;
    label?: string;
    description?: string;
    meetingLink?: string;
  }) => Promise<void>;
  onAssignBlock: (args: {
    date: string;
    startTime: string;
    endTime: string;
    force: boolean;
  }) => Promise<void>;
  /** Manager-only: team-wide availability overlay (Convex-subscribed data). */
  teamHeatmap?: OrganizationHeatmapPayload;
}) {
  const [modal, setModal] = useState<{
    date: string;
    startMin: number;
    endMin: number;
  } | null>(null);
  const [mode, setMode] = useState<"meeting" | "block" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [force, setForce] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("Team meeting");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [meetingLinkField, setMeetingLinkField] = useState("");
  const [detailTarget, setDetailTarget] = useState<{
    block: CalBlock;
  } | null>(null);

  const [dragPreview, setDragPreview] = useState<{
    date: string;
    startMin: number;
    endMin: number;
  } | null>(null);
  const dragRef = useRef<{
    date: string;
    colEl: HTMLDivElement;
    startMin: number;
    pointerId: number;
    moved: boolean;
  } | null>(null);

  const employeeConflict =
    modal &&
    anyBusyOverlapsRange(
      blocksByDate[modal.date] ?? [],
      Math.min(modal.startMin, modal.endMin),
      Math.max(modal.startMin, modal.endMin),
    );
  const managerConflict =
    modal &&
    mode === "meeting" &&
    anyBusyOverlapsRange(
      managerBlocksByDate[modal.date] ?? [],
      Math.min(modal.startMin, modal.endMin),
      Math.max(modal.startMin, modal.endMin),
    );
  const hasConflict = !!(employeeConflict || managerConflict);

  const [heatPicker, setHeatPicker] = useState<{
    date: string;
    slotStartMin: number;
    slotEndMin: number;
    freeCount: number;
    totalMembers: number;
  } | null>(null);

  const heatSlotsByDate = useMemo(() => {
    if (!isManager || !teamHeatmap?.members.length) return {} as Record<string, ReturnType<typeof computeDayHeatSlots>>;
    const out: Record<string, ReturnType<typeof computeDayHeatSlots>> = {};
    for (const d of weekDates) {
      out[d] = computeDayHeatSlots(d, teamHeatmap.members, teamHeatmap.schedulesByDate);
    }
    return out;
  }, [isManager, teamHeatmap, weekDates]);

  function openModal(
    date: string,
    startMin: number,
    endMin: number,
    presetMode: "meeting" | "block" | null = null,
  ) {
    let a = Math.min(startMin, endMin);
    let b = Math.max(startMin, endMin);
    if (b - a < SNAP_MINUTES) b = Math.min(DAY_END_MIN, a + SLOT_MINUTES);
    if (b <= a) return;
    setModal({ date, startMin: a, endMin: b });
    setMode(presetMode);
    setForce(false);
    setErr(null);
    setMeetingTitle("Team meeting");
    setMeetingDescription("");
    setMeetingLinkField("");
  }

  function onGridPointerDown(
    e: React.PointerEvent,
    date: string,
    colEl: HTMLDivElement,
  ) {
    if (!isManager) return;
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
  }

  function onGridPointerMove(
    e: React.PointerEvent,
    date: string,
    colEl: HTMLDivElement,
  ) {
    const d = dragRef.current;
    if (!d || d.date !== date || d.pointerId !== e.pointerId) return;
    d.moved = true;
    const rect = colEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const endMin = snapMin(yToMinutes(y, rect.height));
    setDragPreview({ date, startMin: d.startMin, endMin });
  }

  function onGridPointerUp(
    e: React.PointerEvent,
    date: string,
    colEl: HTMLDivElement,
  ) {
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
    if (!isManager) return;
    if (!d.moved) {
      const slotEnd = Math.min(DAY_END_MIN, startMin + SLOT_MINUTES);
      openModal(date, startMin, slotEnd);
      return;
    }
    if (endMin > startMin) openModal(date, startMin, endMin);
  }

  async function runAssign() {
    if (!modal || !mode) return;
    if (hasConflict && !force) {
      setErr("This slot conflicts with existing busy time. Enable override or pick another time.");
      return;
    }
    const startTime = minToTime(
      clampDay(Math.min(modal.startMin, modal.endMin)),
    );
    const endTime = minToTime(
      clampDay(Math.max(modal.startMin, modal.endMin)),
    );
    setBusy(true);
    setErr(null);
    try {
      if (mode === "meeting") {
        await onAssignMeeting({
          date: modal.date,
          startTime,
          endTime,
          force,
          label: meetingTitle.trim() || "Team meeting",
          description: meetingDescription.trim() || undefined,
          meetingLink: meetingLinkField.trim() || undefined,
        });
      } else {
        await onAssignBlock({
          date: modal.date,
          startTime,
          endTime,
          force,
        });
      }
      setModal(null);
      setMode(null);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Assignment failed");
    } finally {
      setBusy(false);
    }
  }

  const dayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = todayISODate();

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/50 bg-white/40 shadow-[0_24px_70px_-28px_rgba(79,70,229,0.22)] backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/40 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">
          {employeeName}
          {!isManager ? (
            <span className="ml-2 font-normal text-slate-500">(view only)</span>
          ) : null}
        </p>
        {!isManager ? (
          <Button size="sm" variant="secondary" className="rounded-lg" asChild>
            <Link href={`/shared?peer=${employeeId}`}>
              Open shared calendar
            </Link>
          </Button>
        ) : (
          <div className="flex max-w-xl flex-col items-end gap-2 text-right sm:items-end">
            <p className="text-xs text-slate-500">
              Drag an empty slot to assign meeting or block time.
            </p>
            {teamHeatmap && teamHeatmap.members.length > 0 ? (
              <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-sm bg-emerald-400/70 ring-1 ring-emerald-600/25"
                    aria-hidden
                  />
                  Team heat · mostly free (&gt;70%)
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-sm bg-amber-400/70 ring-1 ring-amber-600/25"
                    aria-hidden
                  />
                  Partial (40–70%)
                </span>
                <span className="text-slate-400">9:00–18:00 · tap highlight for counts</span>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {err ? (
        <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {err}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <div className="flex min-w-[720px]" style={{ minHeight: GRID_HEIGHT_PX + 40 }}>
          <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-white/40 bg-white/35 pt-8 backdrop-blur-md">
            {TIME_LABELS.map((t) => (
              <div
                key={t}
                className="text-[10px] font-medium text-slate-400"
                style={{ height: GRID_HEIGHT_PX / TIME_LABELS.length }}
              >
                {t}
              </div>
            ))}
          </div>
          {weekDates.map((date, di) => {
            const blocks = blocksByDate[date] ?? [];
            const layout = layoutOverlappingBlocks(blocks);
            const loading = dayLoadingEach[di];
            const dObj = parseISODate(date);

            return (
              <div
                key={date}
                className="relative min-w-0 flex-1 border-r border-white/35 transition-colors duration-200 last:border-r-0 hover:bg-indigo-500/[0.04]"
              >
                <div className="border-b border-white/40 py-2 text-center">
                  <span className="text-[11px] font-semibold uppercase text-slate-500">
                    {dayShort[di]}
                  </span>
                  <div
                    className={cn(
                      "text-lg font-bold",
                      date === today && "text-blue-600",
                    )}
                  >
                    {format(dObj, "d")}
                  </div>
                </div>
                <div
                  className="relative border-t border-white/35 bg-[linear-gradient(to_bottom,transparent_0,transparent_calc(100%-1px),rgba(148,163,184,0.35)_calc(100%-1px))] bg-[length:100%_32px]"
                  style={{ height: GRID_HEIGHT_PX }}
                >
                  {loading ? (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/30 text-xs font-semibold text-slate-500 backdrop-blur-[2px]">
                      Loading…
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "absolute inset-0",
                      isManager && "cursor-crosshair",
                    )}
                    onPointerDown={(e) =>
                      onGridPointerDown(e, date, e.currentTarget)
                    }
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
                    {isManager &&
                    teamHeatmap &&
                    teamHeatmap.members.length > 0 &&
                    heatSlotsByDate[date] ? (
                      <div className="pointer-events-none absolute inset-0 z-[4]">
                        {heatSlotsByDate[date].map((slot) => {
                          const lvl = heatLevel(slot.ratio);
                          if (lvl === "low") return null;
                          return (
                            <button
                              key={`heat-${date}-${slot.slotStartMin}`}
                              type="button"
                              title={`${slot.freeCount}/${slot.totalMembers} available`}
                              className={cn(
                                "absolute inset-x-1 rounded-md border transition hover:brightness-110",
                                lvl === "high" &&
                                  "border-emerald-500/30 bg-emerald-400/26 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
                                lvl === "medium" &&
                                  "border-amber-500/25 bg-amber-400/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]",
                                "pointer-events-auto cursor-pointer",
                              )}
                              style={{
                                top: `${minutesToTopPct(slot.slotStartMin)}%`,
                                height: `${durationToHeightPct(slot.slotStartMin, slot.slotEndMin)}%`,
                              }}
                              onPointerDownCapture={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setHeatPicker({
                                  date,
                                  slotStartMin: slot.slotStartMin,
                                  slotEndMin: slot.slotEndMin,
                                  freeCount: slot.freeCount,
                                  totalMembers: slot.totalMembers,
                                });
                              }}
                            />
                          );
                        })}
                      </div>
                    ) : null}
                    {blocks.map((b, index) => (
                      <button
                        key={`${index}-${b.startTime}`}
                        type="button"
                        data-cal-block
                        title={scheduleBlockTooltip(b)}
                        className={cn(
                          "absolute z-[5] cursor-pointer overflow-hidden rounded-xl border-0 px-1 py-0.5 text-left text-[9px] font-semibold shadow-md ring-0 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 hover:-translate-y-px hover:shadow-lg",
                          calendarTypeClass[b.type],
                        )}
                        style={blockStyle(b, layout, index)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setDetailTarget({ block: b })}
                      >
                        <span className="flex items-center gap-0.5">
                          {meetingBlockIcon(b) ? (
                            <span className="shrink-0 text-[10px]">
                              {meetingBlockIcon(b)}
                            </span>
                          ) : null}
                          <span className="truncate">{b.label || b.type}</span>
                        </span>
                      </button>
                    ))}
                    {dragPreview && dragPreview.date === date && isManager ? (
                      <div
                        className="pointer-events-none absolute inset-x-1 z-[6] rounded-lg border-2 border-dashed border-violet-400 bg-violet-200/30"
                        style={{
                          top: `${minutesToTopPct(Math.min(dragPreview.startMin, dragPreview.endMin))}%`,
                          height: `${durationToHeightPct(
                            Math.min(dragPreview.startMin, dragPreview.endMin),
                            Math.max(dragPreview.startMin, dragPreview.endMin),
                          )}%`,
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog
        open={!!modal}
        onOpenChange={(o) => {
          if (!o) {
            setModal(null);
            setMode(null);
            setErr(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign time</DialogTitle>
          </DialogHeader>
          {modal ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {modal.date}{" "}
                <span className="font-semibold">
                  {minToTime(clampDay(Math.min(modal.startMin, modal.endMin)))} –{" "}
                  {minToTime(clampDay(Math.max(modal.startMin, modal.endMin)))}
                </span>
              </p>
              {!mode ? (
                <div className="flex flex-col gap-2">
                  <Button
                    className="rounded-lg"
                    onClick={() => setMode("meeting")}
                  >
                    Assign meeting
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-lg"
                    onClick={() => setMode("block")}
                  >
                    Block time
                  </Button>
                </div>
              ) : (
                <>
                  {mode === "meeting" ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={meetingTitle}
                          onChange={(e) => setMeetingTitle(e.target.value)}
                          placeholder="Meeting title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={meetingDescription}
                          onChange={(e) => setMeetingDescription(e.target.value)}
                          placeholder="Agenda or notes"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Meeting link</Label>
                        <Input
                          value={meetingLinkField}
                          onChange={(e) => setMeetingLinkField(e.target.value)}
                          placeholder="https://…"
                        />
                      </div>
                    </div>
                  ) : null}
                  {hasConflict ? (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-red-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={force}
                        onChange={(e) => setForce(e.target.checked)}
                      />
                      Manager override (assign despite conflict)
                    </label>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      className="rounded-lg"
                      disabled={busy || (hasConflict && !force)}
                      onClick={() => void runAssign()}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="secondary"
                      className="rounded-lg"
                      onClick={() => setMode(null)}
                    >
                      Back
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ScheduleBlockDetailDialog
        open={!!detailTarget}
        onOpenChange={(o) => !o && setDetailTarget(null)}
        block={detailTarget?.block ?? null}
      />

      <Dialog
        open={!!heatPicker}
        onOpenChange={(o) => !o && setHeatPicker(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Team availability</DialogTitle>
          </DialogHeader>
          {heatPicker ? (
            <div className="space-y-4">
              <p className="text-lg font-semibold text-slate-900">
                {heatPicker.freeCount} out of {heatPicker.totalMembers} members
                available
              </p>
              <p className="text-sm text-slate-600">
                {heatPicker.date}{" "}
                <span className="font-semibold text-slate-800">
                  {minToTime(clampDay(heatPicker.slotStartMin))} –{" "}
                  {minToTime(clampDay(heatPicker.slotEndMin))}
                </span>
                <span className="block pt-1 text-xs text-slate-500">
                  Based on 9:00–18:00 working hours. Members without a schedule
                  for this day count as unavailable.
                </span>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="rounded-lg"
                  onClick={() => {
                    const h = heatPicker;
                    setHeatPicker(null);
                    openModal(h.date, h.slotStartMin, h.slotEndMin, "meeting");
                  }}
                >
                  Schedule meeting
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-lg"
                  onClick={() => {
                    const h = heatPicker;
                    setHeatPicker(null);
                    openModal(h.date, h.slotStartMin, h.slotEndMin, "block");
                  }}
                >
                  Assign task
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
