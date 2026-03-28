"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ModeOnboardingOverlay } from "@/components/mode-onboarding-overlay";
import { useSession } from "@/components/session-provider";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function ParallaxBackdrop() {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const y = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
      document.documentElement.style.setProperty("--px", x.toFixed(4));
      document.documentElement.style.setProperty("--py", y.toFixed(4));
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="premium-parallax-orb absolute -left-[12%] -top-[18%] h-[min(52vh,460px)] w-[min(72vw,540px)] rounded-full bg-gradient-to-br from-sky-300/50 via-indigo-300/40 to-violet-400/35 blur-3xl" />
      <div className="premium-parallax-orb-slow absolute -right-[8%] top-[32%] h-[min(48vh,420px)] w-[min(65vw,480px)] rounded-full bg-gradient-to-bl from-purple-300/45 via-fuchsia-200/35 to-cyan-200/30 blur-3xl" />
      <div className="premium-parallax-orb absolute bottom-[-12%] left-[22%] h-[min(42vh,380px)] w-[min(55vw,440px)] rounded-full bg-gradient-to-tr from-blue-200/40 via-indigo-200/30 to-transparent blur-3xl" />
    </div>
  );
}

function AppLoadingState({ label }: { label: string }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <ParallaxBackdrop />
      <div className="w-full max-w-sm space-y-4 rounded-[1.35rem] border border-white/45 bg-white/40 p-8 shadow-[0_24px_80px_-24px_rgba(99,102,241,0.35)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-[60%] max-w-[140px]" />
            <Skeleton className="h-2.5 w-full max-w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="mx-auto h-3 w-24" />
        <p className="text-center text-sm font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { userId, ready } = useSession();
  const router = useRouter();
  const me = useQuery(api.users.get, userId ? { userId } : "skip");
  const showModeOnboarding =
    userId && me !== undefined && me?.modeOnboardingDone === false;

  useEffect(() => {
    if (ready && !userId) {
      router.replace("/");
    }
  }, [ready, userId, router]);

  if (!ready) {
    return <AppLoadingState label="Loading…" />;
  }

  if (!userId) {
    return <AppLoadingState label="Redirecting…" />;
  }

  return (
    <div className="relative min-h-screen">
      <ParallaxBackdrop />
      {showModeOnboarding ? <ModeOnboardingOverlay /> : null}
      <Sidebar />
      <div className="md:pl-[calc(1.25rem+15rem+1.5rem)]">
        <main
          className={cn(
            "min-h-screen px-4 pb-28 pt-7 sm:px-6 sm:pb-24 sm:pt-8 lg:px-10 lg:pb-12",
            "animate-in fade-in duration-300",
          )}
        >
          <div className="mx-auto max-w-7xl section-reveal">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
