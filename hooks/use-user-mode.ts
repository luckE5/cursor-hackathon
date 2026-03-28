"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/session-provider";

export type AppMode = "social" | "work";

export function useUserMode() {
  const { userId } = useSession();
  const user = useQuery(api.users.get, userId ? { userId } : "skip");

  const mode: AppMode = user?.mode ?? "social";
  const needsModeOnboarding = user?.modeOnboardingDone === false;

  return {
    user,
    mode,
    needsModeOnboarding,
    ready: user !== undefined,
  };
}
