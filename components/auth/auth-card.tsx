"use client";

import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/session-provider";
import { AuthPushButton } from "@/components/auth/auth-push-button";
import { AuthTabs, type AuthTab } from "@/components/auth/auth-tabs";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { makeLocalUserEmail } from "@/lib/derive-email";
import { cn } from "@/lib/utils";

export function AuthCard({
  initialTab,
  onTabChange,
}: {
  initialTab: AuthTab;
  onTabChange?: (tab: AuthTab) => void;
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const register = useMutation(api.users.register);
  const { setUserId } = useSession();
  const router = useRouter();
  const [socialBusy, setSocialBusy] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  const syncTab = useCallback(
    (next: AuthTab) => {
      setTab(next);
      onTabChange?.(next);
    },
    [onTabChange],
  );

  async function continueSocial(
    mode: "google" | "apple",
    displayName: string,
  ) {
    setSocialBusy(true);
    setSocialError(null);
    try {
      const email = makeLocalUserEmail(displayName);
      const id = await register({
        name: displayName,
        email,
        preference: "morning",
      });
      setUserId(id);
      router.replace("/dashboard");
    } catch (err) {
      setSocialError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSocialBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-500",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.75rem]",
          "border border-white/60 bg-white/42 shadow-[0_28px_90px_-24px_rgba(79,70,229,0.55),0_0_0_1px_rgba(255,255,255,0.55)_inset]",
          "backdrop-blur-2xl backdrop-saturate-150",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
          "before:bg-gradient-to-br before:from-white/50 before:via-transparent before:to-indigo-400/15",
          "before:opacity-90",
          "ring-1 ring-indigo-200/35",
        )}
      >
        <div className="relative z-[1] px-7 pb-9 pt-8 sm:px-9 sm:pb-10 sm:pt-9">
          <div className="text-center">
            <Link
              href="/"
              className="inline-block bg-gradient-to-r from-violet-700 via-indigo-600 to-sky-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-[2.65rem]"
            >
              Chronosync
            </Link>
            <p className="mt-2 text-base font-medium text-slate-600 sm:text-lg">
              {tab === "login"
                ? "Welcome back — sign in to continue"
                : "Create your account in seconds"}
            </p>
          </div>

          <div className="mt-7">
            <AuthTabs value={tab} onChange={syncTab} />
          </div>

          <div className="mt-8" role="tabpanel">
            {tab === "login" ? <LoginForm /> : <SignupForm />}
          </div>

          <div className="relative mt-8">
            <div
              className="absolute inset-x-0 top-1/2 flex items-center"
              aria-hidden
            >
              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300/80 to-transparent" />
            </div>
            <p className="relative mx-auto w-max bg-white/55 px-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm">
              Or continue with
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {socialError ? (
              <p
                className="rounded-xl border border-amber-200/90 bg-amber-50/95 px-3 py-2 text-center text-sm font-medium text-amber-900"
                role="alert"
              >
                {socialError}
              </p>
            ) : null}
            <AuthPushButton
              type="button"
              variant="socialLight"
              disabled={socialBusy}
              className="flex items-center justify-center gap-2"
              onClick={() =>
                void continueSocial("google", "Google user")
              }
            >
              <span className="text-lg" aria-hidden>
                G
              </span>
              Continue with Google
            </AuthPushButton>
            <AuthPushButton
              type="button"
              variant="socialDark"
              disabled={socialBusy}
              className="flex items-center justify-center gap-2"
              onClick={() => void continueSocial("apple", "Apple user")}
            >
              <span aria-hidden></span>
              Continue with Apple
            </AuthPushButton>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            Social sign-in uses the same demo profile flow as before — a unique
            local email is generated. Password accounts use your real email.
          </p>
          <p className="mt-3 text-center text-xs">
            <Link
              href="/"
              className="font-semibold text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-violet-700"
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
