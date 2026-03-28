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
import { calendarTypeClass } from "@/lib/calendar-block-classes";
import {
  conflictSegments,
  mutualFreeSegments,
  peerBusyOverlapsRange,
} from "@/lib/shared-schedule-view";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

type PendingRow = {
  _id: Id<"requests">;
  fromUserId: Id<"users">;
  toUserId: Id<"users">;
  requestedTime: { date: string; startTime: string; endTime: string };
};

function segmentStyle(startTime: string, endTime: string) {
  const s = timeToMin(startTime);
  const e = timeToMin(endTime);
  return {
    top: `${minutesToTopPct(s)}%`,
    height: `${durationToHeightPct(s, e)}%`,
  };
}

export function SharedWeeklyCalendar({
  weekDates,
  meId,
  peerId,
  meName,
  peerName,
  blocksMe,
  blocksPeer,
  dayLoadingEach,
  pendingRequests,
  onSendRequest,
  onRespondRequest,
}: {
  weekDates: string[];
  meId: Id<"users">;
  peerId: Id<"users">;
  meName: string;
  peerName: string;
  blocksMe: Record<string, CalBlock[]>;
  blocksPeer: Record<string, CalBlock[]>;
  dayLoadingEach: boolean[];
  pendingRequests: PendingRow[];
  onSendRequest: (args: {
    date: string;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
  onRespondRequest: (
    requestId: Id<"requests">,
    action: "accept" | "reject",
  ) => Promise<void>;
}) {
  const [requestModal, setRequestModal] = useState<{
    date: string;
    startMin: number;
    endMin: number;
  } | null>(null);
  const [pendingModal, setPendingModal] = useState<PendingRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  const pendingForDate = useCallback(
    (date: string) =>
      pendingRequests.filter((p) => p.requestedTime.date === date),
    [pendingRequests],
  );

  const openRequestFromDrag = useCallback(
    (date: string, startMin: number, endMin: number) => {
      let a = Math.min(startMin, endMin);
      let b = Math.max(startMin, endMin);
      if (b - a < SNAP_MINUTES) b = Math.min(DAY_END_MIN, a + SLOT_MINUTES);
      if (b <= a) return;
      setRequestModal({ date, startMin: a, endMin: b });
    },
    [],
  );

  const onGridPointerDown = (
    e: React.PointerEvent,
    date: string,
    colEl: HTMLDivElement,
  ) => {
    if ((e.target as HTMLElement).closest("[data-cal-block]")) return;
    if ((e.target as HTMLElement).closest("[data-pending-req]")) return;
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
  };

  const onGridPointerMove = (
    e: React.PointerEvent,
    date: string,
    colEl: HTMLDivElement,
  ) => {
    const d = dragRef.current;
    if (!d || d.date !== date || d.pointerId !== e.pointerId) return;
    d.moved = true;
    const rect = colEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const endMin = snapMin(yToMinutes(y, rect.height));
    setDragPreview({ date, startMin: d.startMin, endMin });
  };

  const onGridPointerUp = (
    e: React.PointerEvent,
    date: string,
    colEl: HTMLDivElement,
  ) => {
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
      openRequestFromDrag(date, startMin, slotEnd);
      return;
    }
    if (endMin > startMin) openRequestFromDrag(date, startMin, endMin);
  };

  async function confirmRequest() {
    if (!requestModal) return;
    setBusy(true);
    setErr(null);
    try {
      const { date, startMin, endMin } = requestModal;
      await onSendRequest({
        date,
        startTime: minToTime(clampDay(startMin)),
        endTime: minToTime(clampDay(endMin)),
      });
      setRequestModal(null);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Could not send request");
    } finally {
      setBusy(false);
    }
  }

  async function respond(action: "accept" | "reject") {
    if (!pendingModal) return;
    setBusy(true);
    setErr(null);
    try {
      await onRespondRequest(pendingModal._id, action);
      setPendingModal(null);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const dayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = todayISODate();

  const peerConflictWarning =
    requestModal &&
    peerBusyOverlapsRange(
      blocksPeer[requestModal.date] ?? [],
      Math.min(requestModal.startMin, requestModal.endMin),
      Math.max(requestModal.startMin, requestModal.endMin),
    );

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/50 bg-white/40 shadow-[0_24px_70px_-28px_rgba(79,70,229,0.22)] backdrop-blur-xl backdrop-saturate-150">
      {err ? (
        <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {err}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <div className="flex min-w-[800px]" style={{ minHeight: GRID_HEIGHT_PX + 48 }}>
          <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-white/40 bg-white/35 pt-10 backdrop-blur-md">
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
            const bm = blocksMe[date] ?? [];
            const bp = blocksPeer[date] ?? [];
            const loading = dayLoadingEach[di];
            const mutual = mutualFreeSegments(bm, bp);
            const conflicts = conflictSegments(bm, bp);
            const pending = pendingForDate(date);
            const layoutM = layoutOverlappingBlocks(bm);
            const layoutP = layoutOverlappingBlocks(bp);
            const dObj = parseISODate(date);

            return (
              <div
                key={date}
                className="relative min-w-0 flex-1 border-r border-white/35 transition-colors duration-200 last:border-r-0 hover:bg-indigo-500/[0.04]"
              >
                <div className="flex w-full flex-col border-b border-white/40 px-1 py-2 text-center">
                  <span className="text-[11px] font-semibold uppercase text-slate-500">
                    {dayShort[di]}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold tabular-nums",
                      date === today && "text-blue-600",
                    )}
                  >
                    {format(dObj, "d")}
                  </span>
                </div>

                <div
                  className="relative border-t border-white/35 bg-[linear-gradient(to_bottom,transparent_0,transparent_calc(100%-1px),rgba(148,163,184,0.35)_calc(100%-1px))] bg-[length:100%_32px]"
                  style={{ height: GRID_HEIGHT_PX }}
                >
                  {loading ? (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/30 text-xs font-semibold text-slate-500 backdrop-blur-[2px]">
                      Loading…
                    </div>
                  ) : null}

                  <div
                    className="absolute inset-0 z-[1]"
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
                    {mutual.map((seg, i) => (
                      <div
                        key={`m-${i}`}
                        className="pointer-events-none absolute right-1 left-1 z-[2] rounded-md bg-emerald-400/25 ring-1 ring-emerald-500/40"
                        style={segmentStyle(seg.startTime, seg.endTime)}
                      />
                    ))}
                    {conflicts.map((seg, i) => (
                      <div
                        key={`c-${i}`}
                        className="pointer-events-none absolute right-1 left-1 z-[3] rounded-md bg-red-500/30 ring-1 ring-red-600/50"
                        style={segmentStyle(seg.startTime, seg.endTime)}
                      />
                    ))}

                    <div className="absolute inset-0 z-[4] flex">
                      <div className="relative w-1/2 border-r border-white/40">
                        <div className="absolute inset-x-0 top-0 px-0.5 text-center text-[9px] font-bold text-blue-700">
                          {meName}
                        </div>
                        <div className="absolute inset-x-0 top-4 bottom-0">
                          {bm.map((b, index) => (
                            <div
                              key={`m-${index}-${b.startTime}`}
                              data-cal-block
                              className={cn(
                                "absolute z-[5] overflow-hidden rounded-lg px-1 py-0.5 text-[9px] font-semibold leading-tight shadow-md transition-all duration-200 hover:-translate-y-px hover:shadow-lg",
                                calendarTypeClass[b.type],
                              )}
                              style={blockStyle(b, layoutM, index)}
                            >
                              <div className="truncate">{b.label || b.type}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="relative w-1/2">
                        <div className="absolute inset-x-0 top-0 px-0.5 text-center text-[9px] font-bold text-violet-800">
                          {peerName}
                        </div>
                        <div className="absolute inset-x-0 top-4 bottom-0">
                          {bp.map((b, index) => (
                            <div
                              key={`p-${index}-${b.startTime}`}
                              data-cal-block
                              className={cn(
                                "absolute z-[5] overflow-hidden rounded-lg px-1 py-0.5 text-[9px] font-semibold leading-tight shadow-md transition-all duration-200 hover:-translate-y-px hover:shadow-lg",
                                calendarTypeClass[b.type],
                              )}
                              style={blockStyle(b, layoutP, index)}
                            >
                              <div className="truncate">{b.label || b.type}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {pending.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        data-pending-req
                        className="absolute right-2 left-2 z-[8] cursor-pointer rounded-lg border-2 border-yellow-500/60 bg-yellow-300/50 text-left shadow-md backdrop-blur-[1px] transition hover:bg-yellow-300/65"
                        style={segmentStyle(
                          p.requestedTime.startTime,
                          p.requestedTime.endTime,
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingModal(p);
                        }}
                      >
                        <div className="px-2 py-1 text-[10px] font-bold text-yellow-950">
                          Pending request
                        </div>
                      </button>
                    ))}

                    {dragPreview && dragPreview.date === date ? (
                      <div
                        className="pointer-events-none absolute right-2 left-2 z-[7] rounded-lg border-2 border-dashed border-blue-400 bg-blue-200/35"
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
        open={!!requestModal}
        onOpenChange={(o) => {
          if (!o) {
            setRequestModal(null);
            setErr(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request this time?</DialogTitle>
          </DialogHeader>
          {requestModal ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {requestModal.date}{" "}
                <span className="font-semibold text-slate-900">
                  {minToTime(clampDay(Math.min(requestModal.startMin, requestModal.endMin)))}{" "}
                  –{" "}
                  {minToTime(clampDay(Math.max(requestModal.startMin, requestModal.endMin)))}
                </span>
              </p>
              {peerConflictWarning ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  They look busy during this window. You can still send the request.
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  className="rounded-lg"
                  disabled={busy}
                  onClick={() => void confirmRequest()}
                >
                  Request
                </Button>
                <Button
                  variant="secondary"
                  className="rounded-lg"
                  onClick={() => setRequestModal(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingModal}
        onOpenChange={(o) => {
          if (!o) {
            setPendingModal(null);
            setErr(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meeting request</DialogTitle>
          </DialogHeader>
          {pendingModal ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {pendingModal.requestedTime.date}{" "}
                {pendingModal.requestedTime.startTime}–
                {pendingModal.requestedTime.endTime}
              </p>
              {pendingModal.toUserId === meId &&
              pendingModal.fromUserId === peerId ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="rounded-lg"
                    disabled={busy}
                    onClick={() => void respond("accept")}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-lg"
                    disabled={busy}
                    onClick={() => void respond("reject")}
                  >
                    Reject
                  </Button>
                </div>
              ) : pendingModal.fromUserId === meId ? (
                <p className="text-sm text-slate-500">
                  Waiting for {peerName} to respond.
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  This request involves another participant.
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
