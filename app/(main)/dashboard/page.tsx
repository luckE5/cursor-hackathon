"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/layout/page-header";
import { useSession } from "@/components/session-provider";
import { ScheduleBlockDetailDialog } from "@/components/schedule/schedule-block-detail-dialog";
import { VerticalDayTimeline } from "@/components/schedule/vertical-day-timeline";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { todayISODate } from "@/lib/date";
import type { CalBlock } from "@/lib/schedule-cal";
import { scheduleQueryBlocks } from "@/lib/schedule-access";
import { selectTriggerClassName } from "@/lib/ui-classes";

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function DashboardPage() {
  const { userId } = useSession();
  const date = todayISODate();

  const schedule = useQuery(
    api.schedules.getSchedule,
    userId ? { userId, date, viewerId: userId } : "skip",
  );
  const user = useQuery(api.users.get, userId ? { userId } : "skip");
  const createSchedule = useMutation(api.schedules.createSchedule);
  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState("Focus block");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [blockType, setBlockType] = useState<"task" | "free" | "meeting">(
    "task",
  );
  const [replaceDay, setReplaceDay] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [meetDetail, setMeetDetail] = useState<CalBlock | null>(null);

  const { blocks } = scheduleQueryBlocks(schedule);

  const legend = useMemo(
    () => (
      <div className="flex flex-wrap gap-3 text-xs font-semibold">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-gradient-to-r from-sky-500/15 to-indigo-500/12 px-3 py-1.5 text-slate-700 shadow-sm backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 shadow-sm shadow-sky-500/50" />
          Task / work
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-gradient-to-r from-emerald-500/15 to-teal-500/12 px-3 py-1.5 text-slate-700 shadow-sm backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 shadow-sm shadow-emerald-500/50" />
          Free
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/12 px-3 py-1.5 text-slate-700 shadow-sm backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-sm shadow-violet-500/50" />
          Meeting
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-400/20 to-yellow-400/15 px-3 py-1.5 text-amber-950/80 shadow-sm backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-500/40" />
          Pending / buffer
        </span>
      </div>
    ),
    [],
  );

  async function submitBlock() {
    if (!userId) return;
    if (timeToMin(startTime) >= timeToMin(endTime)) {
      setAddErr("End time must be after start time.");
      return;
    }
    setAddBusy(true);
    setAddErr(null);
    try {
      const nextBlock = {
        startTime,
        endTime,
        type: blockType,
        label: label.trim() || undefined,
      };
      const merged = replaceDay
        ? [nextBlock]
        : [...blocks, nextBlock].sort(
            (a, b) => timeToMin(a.startTime) - timeToMin(b.startTime),
          );
      await createSchedule({ userId, date, blocks: merged });
      setAddOpen(false);
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : "Could not save block");
    } finally {
      setAddBusy(false);
    }
  }

  if (!userId) return null;

  return (
    <div className="space-y-8 pb-4 animate-fade-in-up">
      <PageHeader
        eyebrow={`Today · ${date}`}
        title={
          user === undefined
            ? "Dashboard"
            : user
              ? `Hi, ${user.name}`
              : "Your dashboard"
        }
        description={
          user === undefined
            ? "Loading your profile…"
            : "Request time and accept meetings from Shared — your planner stays in sync."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">Add block</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add time block</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Start</Label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End</Label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select
                      className={selectTriggerClassName()}
                      value={blockType}
                      onChange={(e) =>
                        setBlockType(e.target.value as typeof blockType)
                      }
                    >
                      <option value="task">Task / work</option>
                      <option value="free">Free</option>
                      <option value="meeting">Meeting</option>
                    </select>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                      checked={replaceDay}
                      onChange={(e) => setReplaceDay(e.target.checked)}
                    />
                    Replace entire day (otherwise append)
                  </label>
                  {addErr ? (
                    <p className="text-sm font-medium text-red-600">{addErr}</p>
                  ) : null}
                  <Button
                    className="w-full"
                    disabled={addBusy}
                    onClick={() => void submitBlock()}
                  >
                    {addBusy ? "Saving…" : "Save block"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button asChild variant="secondary">
              <Link href="/planner">Open planner</Link>
            </Button>
            <Button asChild>
              <Link href="/shared">Shared calendar</Link>
            </Button>
          </div>
        }
      />

      <div className="animate-float-slow rounded-[1.25rem] border border-white/50 bg-white/35 px-5 py-4 shadow-lg shadow-indigo-500/10 backdrop-blur-xl [animation-duration:7s]">
        {legend}
      </div>

      <Card className="animate-float-slow [animation-duration:9s]">
        <CardHeader>
          <CardTitle>Your day</CardTitle>
          <CardDescription>
            Vertical timeline — task (blue), free (green), meeting (violet).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schedule === undefined ? (
            <div className="space-y-4 py-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : (
            <VerticalDayTimeline
              blocks={blocks}
              emptyLabel="Nothing on the calendar yet — add a block or open the planner."
              onBlockClick={(b) => setMeetDetail(b as CalBlock)}
            />
          )}
        </CardContent>
      </Card>

      <ScheduleBlockDetailDialog
        open={!!meetDetail}
        onOpenChange={(o) => !o && setMeetDetail(null)}
        block={meetDetail}
      />
    </div>
  );
}
