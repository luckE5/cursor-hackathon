"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useSession } from "@/components/session-provider";
import { AuthCard } from "@/components/auth/auth-card";
import type { AuthTab } from "@/components/auth/auth-tabs";
import styles from "./auth.module.css";

const ThreeBackground = dynamic(
  () =>
    import("@/components/auth/three-background").then((m) => ({
      default: m.ThreeBackground,
    })),
  { ssr: false, loading: () => null },
);

export function AuthPageClient({ initialTab }: { initialTab: AuthTab }) {
  const { userId, ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready && userId) {
      router.replace("/dashboard");
    }
  }, [ready, userId, router]);

  const onTabChange = useCallback(
    (tab: AuthTab) => {
      const q = tab === "signup" ? "?tab=signup" : "";
      router.replace(`/login${q}`, { scroll: false });
    },
    [router],
  );

  if (!ready) {
    return (
      <div className={styles.authPageRoot}>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 shadow-lg shadow-indigo-500/30" />
          <p className="text-sm font-semibold text-slate-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (userId) {
    return (
      <div className={styles.authPageRoot}>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm font-medium text-slate-600">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authPageRoot}>
      <ThreeBackground />
      <div className={styles.authVignette} aria-hidden />
      <div
        className={`${styles.authContent} flex min-h-screen flex-col items-center justify-center px-4 py-14 sm:px-6 sm:py-16`}
      >
        <AuthCard initialTab={initialTab} onTabChange={onTabChange} />
      </div>
    </div>
  );
}
