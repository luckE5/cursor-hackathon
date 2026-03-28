"use client";

import { useMutation, useQuery } from "convex/react";
import { addWeeks, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GuestPrompt } from "@/components/guest-prompt";
import { PageHeader } from "@/components/layout/page-header";
import { SharedWeeklyCalendar } from "@/components/schedule/shared-weekly-calendar";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTwoUserWeekSchedules } from "@/hooks/use-two-user-week-schedules";
import { scheduleQueryBlocks } from "@/lib/schedule-access";
import type { CalBlock } from "@/lib/schedule-cal";
import { getWeekIsoDates, weekRangeLabel } from "@/lib/week-dates";
import { selectTriggerClassName } from "@/lib/ui-classes";

function SharedScheduleContent() {
  const { userId: me } = useSession();
  const search = useSearchParams();
  const [peer, setPeer] = useState<Id<"users"> | "">("");
  const [weekAnchor, setWeekAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  useEffect(() => {
    const p = search.get("peer");
    if (p) setPeer(p as Id<"users">);
  }, [search]);

  const weekDates = useMemo(
    () => getWeekIsoDates(weekAnchor),
    [weekAnchor],
  );

  const { blocksA, blocksB, loadingA, loadingB, peerAccessDenied } =
    useTwoUserWeekSchedules(
      me,
      peer ? (peer as Id<"users">) : null,
      me,
      weekDates,
    );

  const meProfile = useQuery(api.users.get, me ? { userId: me } : "skip");
  const peerDirectory = useQuery(
    api.users.listPublicPeers,
    me ? { viewerId: me } : "skip",
  );
  const incoming = useQuery(
    api.requests.listIncoming,
    me ? { userId: me } : "skip",
  );
  const outgoing = useQuery(
    api.requests.listOutgoing,
    me ? { userId: me } : "skip",
  );

  const sendRequest = useMutation(api.requests.sendRequest);
  const respondToRequest = useMutation(api.requests.respondToRequest);

  const blocksMe = useMemo(() => {
    const out: Record<string, CalBlock[]> = {};
    weekDates.forEach((d, i) => {
      const { blocks } = scheduleQueryBlocks(blocksA[i]);
      out[d] = blocks as CalBlock[];
    });
    return out;
  }, [weekDates, blocksA]);

  const blocksPeer = useMemo(() => {
    const out: Record<string, CalBlock[]> = {};
    weekDates.forEach((d, i) => {
      const { blocks } = scheduleQueryBlocks(blocksB[i]);
      out[d] = blocks as CalBlock[];
    });
    return out;
  }, [weekDates, blocksB]);

  const dayLoadingEach = weekDates.map(
    (_, i) => loadingA[i] || loadingB[i],
  );

  const peerCalendarLoading = loadingB.some(Boolean);

  const pendingBetween = useMemo(() => {
    if (!me || !peer) return [];
    const all = [...(incoming ?? []), ...(outgoing ?? [])];
    const map = new Map<string, (typeof all)[number]>();
    for (const r of all) {
      if (r.status !== "pending") continue;
      const pair =
        (r.fromUserId === me && r.toUserId === peer) ||
        (r.fromUserId === peer && r.toUserId === me);
      if (pair) map.set(r._id, r);
    }
    return [...map.values()];
  }, [incoming, outgoing, me, peer]);

  async function onSendRequest(args: {
    date: string;
    startTime: string;
    endTime: string;
  }) {
    if (!me || !peer) return;
    await sendRequest({
      fromUserId: me,
      toUserId: peer as Id<"users">,
      requestedTime: {
        date: args.date,
        startTime: args.startTime,
        endTime: args.endTime,
      },
    });
  }

  async function onRespondRequest(
    requestId: Id<"requests">,
    action: "accept" | "reject",
  ) {
    if (!me) return;
    await respondToRequest({
      requestId,
      actorUserId: me,
      action,
    });
  }

  function goToday() {
    setWeekAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }

  if (!me) {
    return (
      <GuestPrompt description="Sign in to compare calendars and request time together." />
    );
  }

  const meName = meProfile?.name ?? "You";
  const peerName =
    peerDirectory?.find((u) => u._id === peer)?.name ?? "Teammate";

  return (
    <div className="space-y-8 pb-4 animate-fade-in-up">
      <PageHeader
        eyebrow="Shared"
        title="Interactive calendar"
        description="Drag on the grid to request time. Green: mutual free · Red: busy overlap · Yellow: pending request. Accept or reject from the yellow block."
      />

      <Card>
        <CardHeader>
          <CardTitle>Teammate</CardTitle>
          <CardDescription>
            Pick someone to compare. Employees can open any org member from
            Organization, or a friend here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-lg space-y-2">
            <Label htmlFor="peer">Person</Label>
            <select
              id="peer"
              className={selectTriggerClassName()}
              value={peer}
              onChange={(e) => setPeer(e.target.value as Id<"users"> | "")}
            >
              <option value="">Choose…</option>
              {peerDirectory?.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-600">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Mutual free
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              Busy overlap
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              Pending request
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
              Meeting
            </li>
          </ul>
        </CardContent>
      </Card>

      {peer ? (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg"
                aria-label="Previous week"
                onClick={() => setWeekAnchor((w) => addWeeks(w, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg"
                aria-label="Next week"
                onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <p className="px-2 text-sm font-bold text-slate-900">
                {weekRangeLabel(weekAnchor)}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="rounded-lg"
              onClick={goToday}
            >
              Today
            </Button>
          </div>

          {peerCalendarLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-sm font-medium text-slate-500 shadow-sm">
              Loading calendars…
            </div>
          ) : peerAccessDenied ? (
            <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white shadow-md">
              <CardContent className="space-y-4 py-12 text-center">
                <p className="text-lg font-semibold text-slate-900">
                  Connect with this user to view their schedule
                </p>
                <p className="mx-auto max-w-md text-sm text-slate-600">
                  Add them as a friend or join the same organization to compare
                  availability and send time requests.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <Button asChild className="rounded-full">
                    <Link href="/friends">Friends</Link>
                  </Button>
                  <Button asChild variant="secondary" className="rounded-full">
                    <Link href="/org">Organization</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <SharedWeeklyCalendar
              weekDates={weekDates}
              meId={me}
              peerId={peer as Id<"users">}
              meName={meName}
              peerName={peerName}
              blocksMe={blocksMe}
              blocksPeer={blocksPeer}
              dayLoadingEach={dayLoadingEach}
              pendingRequests={pendingBetween}
              onSendRequest={onSendRequest}
              onRespondRequest={onRespondRequest}
            />
          )}

          <p className="text-center text-sm text-slate-500">
            Need your personal week?{" "}
            <Link href="/planner" className="font-medium text-blue-600 hover:underline">
              Open planner
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}

export default function SharedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <SharedScheduleContent />
    </Suspense>
  );
}
