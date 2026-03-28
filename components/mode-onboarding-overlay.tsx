"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const options = [
  {
    intent: "student" as const,
    emoji: "🎓",
    title: "Student / Personal",
    body: "Classes, study blocks, and personal time — optimized for you.",
  },
  {
    intent: "social" as const,
    emoji: "👥",
    title: "Social / Friends",
    body: "Coordinate with friends, shared availability, and requests.",
  },
  {
    intent: "work" as const,
    emoji: "🏢",
    title: "Work / Organization",
    body: "Team schedules, workspaces, and manager-assigned meetings.",
  },
];

export function ModeOnboardingOverlay() {
  const { userId } = useSession();
  const complete = useMutation(api.users.completeModeOnboarding);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(
    intent: (typeof options)[number]["intent"],
  ) {
    if (!userId) return;
    setPending(true);
    setErr(null);
    try {
      await complete({ userId, intent });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 px-4 py-10 backdrop-blur-md">
      <div
        className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-[1.5rem] border border-white/50 bg-white/55 p-6 shadow-[0_32px_90px_-24px_rgba(79,70,229,0.45)] backdrop-blur-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mode-onboard-title"
      >
        <h2
          id="mode-onboard-title"
          className="text-center text-2xl font-bold tracking-tight text-slate-900"
        >
          How do you want to use ChronoSync?
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          You can change this later; joining a workspace always enables work
          features.
        </p>
        {err ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-800">
            {err}
          </p>
        ) : null}
        <ul className="mt-6 space-y-3">
          {options.map((o) => (
            <li key={o.intent}>
              <button
                type="button"
                disabled={pending}
                onClick={() => void pick(o.intent)}
                className={cn(
                  "flex w-full flex-col items-start gap-1 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-left transition-all",
                  "hover:border-indigo-300 hover:bg-white hover:shadow-md",
                  "disabled:pointer-events-none disabled:opacity-60",
                )}
              >
                <span className="text-lg font-semibold text-slate-900">
                  {o.emoji} {o.title}
                </span>
                <span className="text-sm text-slate-600">{o.body}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-xs text-slate-500">
          Student &amp; Social use personal mode. Work opens organization tools.
        </p>
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => void pick("social")}
          >
            Skip (Social)
          </Button>
        </div>
      </div>
    </div>
  );
}
