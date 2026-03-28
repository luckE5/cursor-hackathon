"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { addWeeks, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { GuestPrompt } from "@/components/guest-prompt";
import { PageHeader } from "@/components/layout/page-header";
import { useSession } from "@/components/session-provider";
import { WeeklyCalendar } from "@/components/schedule/weekly-calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWeekSchedules } from "@/hooks/use-week-schedules";
import { scheduleQueryBlocks } from "@/lib/schedule-access";
import { todayISODate } from "@/lib/date";
import type { CalBlock } from "@/lib/schedule-cal";
import { getWeekIsoDates, weekRangeLabel } from "@/lib/week-dates";

type UnscheduledItem = {
  title: string;
  duration: number;
  priority: number;
};

export default function PlannerPage() {
  const { userId } = useSession();
  const [weekAnchor, setWeekAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selectedDate, setSelectedDate] = useState(todayISODate);

  const weekDates = useMemo(
    () => getWeekIsoDates(weekAnchor),
    [weekAnchor],
  );

  const weekResults = useWeekSchedules(userId, userId, weekDates);

  useEffect(() => {
    if (!weekDates.includes(selectedDate)) {
      setSelectedDate(weekDates[0]);
    }
  }, [weekDates, selectedDate]);

  const blocksByDate = useMemo(() => {
    const out: Record<string, CalBlock[]> = {};
    weekDates.forEach((d, i) => {
      const { blocks } = scheduleQueryBlocks(weekResults[i]);
      out[d] = blocks as CalBlock[];
    });
    return out;
  }, [weekDates, weekResults]);

  const dayLoading = weekDates.map((_, i) => weekResults[i] === undefined);

  const profile = useQuery(api.users.get, userId ? { userId } : "skip");

  const generateAISchedule = useAction(api.ai.generateAISchedule);
  const replaceBlocks = useMutation(api.schedules.replaceBlocks);
  const updateProfile = useMutation(api.users.updateProfile);

  const onReplaceDay = useCallback(
    async (date: string, blocks: CalBlock[]) => {
      if (!userId) return;
      await replaceBlocks({ userId, date, blocks });
    },
    [userId, replaceBlocks],
  );

  const [text, setText] = useState(
    "DSA, gym, classes 10-2, want to study at night, also revision and project",
  );
  const [aiPref, setAiPref] = useState<"morning" | "night">("morning");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [unscheduled, setUnscheduled] = useState<UnscheduledItem[]>([]);

  useEffect(() => {
    if (profile?.preference) setAiPref(profile.preference);
  }, [profile?.preference]);

  async function runAI() {
    if (!userId) return;
    setAiLoading(true);
    setAiErr(null);
    try {
      await updateProfile({ userId, preference: aiPref });
      const res = await generateAISchedule({
        userId,
        inputText: text,
        date: selectedDate,
      });
      setUnscheduled(
        Array.isArray(res.unscheduled)
          ? (res.unscheduled as UnscheduledItem[])
          : [],
      );
    } catch (e) {
      setAiErr(e instanceof Error ? e.message : "Generation failed");
      setUnscheduled([]);
    } finally {
      setAiLoading(false);
    }
  }

  function goToday() {
    const t = new Date();
    setWeekAnchor(startOfWeek(t, { weekStartsOn: 1 }));
    setSelectedDate(todayISODate());
  }

  const totalBlocksToday = blocksByDate[selectedDate]?.length ?? 0;

  if (!userId) {
    return (
      <GuestPrompt description="Sign in to generate and edit your schedule." />
    );
  }

  return (
    <div className="space-y-6 pb-4 animate-fade-in-up">
      <PageHeader
        eyebrow="Smart planner"
        title="Calendar-first day builder"
        description="Click or drag on the grid to add blocks, drag to move, resize from the bottom edge. Describe your day in plain language and generate — everything lands on the calendar."
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg"
            aria-label="Previous week"
            onClick={() => setWeekAnchor((w) => addWeeks(w, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg"
            aria-label="Next week"
            onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="min-w-0 px-2">
            <p className="text-sm font-bold text-slate-900">
              {weekRangeLabel(weekAnchor)}
            </p>
            <p className="text-xs text-slate-500">
              AI targets{" "}
              <span className="font-semibold text-slate-700">{selectedDate}</span>
            </p>
          </div>
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

      <WeeklyCalendar
        weekDates={weekDates}
        blocksByDate={blocksByDate}
        dayLoading={dayLoading}
        onReplaceDay={onReplaceDay}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {totalBlocksToday === 0 && !dayLoading[weekDates.indexOf(selectedDate)] ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-center text-sm text-slate-600">
          No blocks on this day yet — drag on the grid or use{" "}
          <span className="font-semibold">Generate with AI</span> below.
        </p>
      ) : null}

      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Generate with AI
          </CardTitle>
          <CardDescription>
            Internal parser extracts every task, honors fixed times (e.g. classes
            10–2), packs the day between 08:00–23:00 with breaks and buffers.
            Anything that does not fit stays listed as overflow — nothing is
            silently dropped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nl-day">Describe your day</Label>
            <Textarea
              id="nl-day"
              className="min-h-[120px] text-[15px] leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. DSA, gym, classes 10-2, study at night, revision, project…"
            />
          </div>
          <div className="space-y-2">
            <Label>Chronotype (used when your text does not say)</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={aiPref === "morning" ? "default" : "outline"}
                className="flex-1 rounded-lg"
                onClick={() => setAiPref("morning")}
              >
                Morning
              </Button>
              <Button
                type="button"
                size="sm"
                variant={aiPref === "night" ? "default" : "outline"}
                className="flex-1 rounded-lg"
                onClick={() => setAiPref("night")}
              >
                Night owl
              </Button>
            </div>
          </div>
          {aiErr ? (
            <p className="text-sm font-medium text-red-600">{aiErr}</p>
          ) : null}
          {unscheduled.length > 0 ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3">
              <p className="text-sm font-semibold text-amber-950">
                Could not fit in the day ({unscheduled.length})
              </p>
              <p className="mt-1 text-xs text-amber-900/90">
                Drag a longer window on the calendar or shorten tasks, then run
                generate again — or place these manually on the grid.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {unscheduled.map((u) => (
                  <li
                    key={`${u.title}-${u.duration}`}
                    className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-950"
                  >
                    {u.title}{" "}
                    <span className="text-amber-700">
                      ({u.duration}m · P{u.priority})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button
            className="w-full rounded-xl sm:w-auto"
            onClick={() => void runAI()}
            disabled={aiLoading}
          >
            {aiLoading
              ? "Generating…"
              : `Generate for ${selectedDate}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
