"use client";

import { AuthPushButton } from "@/components/auth/auth-push-button";
import { cn } from "@/lib/utils";

export type AuthTab = "login" | "signup";

export function AuthTabs({
  value,
  onChange,
  className,
}: {
  value: AuthTab;
  onChange: (tab: AuthTab) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 rounded-2xl border border-white/45 bg-white/20 p-1.5 shadow-inner shadow-white/30 backdrop-blur-md",
        className,
      )}
      role="tablist"
      aria-label="Sign in or create account"
    >
      <AuthPushButton
        type="button"
        variant={value === "login" ? "tabActive" : "tabInactive"}
        className="!py-3 text-sm"
        onClick={() => onChange("login")}
        role="tab"
        aria-selected={value === "login"}
      >
        Log in
      </AuthPushButton>
      <AuthPushButton
        type="button"
        variant={value === "signup" ? "tabActive" : "tabInactive"}
        className="!py-3 text-sm"
        onClick={() => onChange("signup")}
        role="tab"
        aria-selected={value === "signup"}
      >
        Sign up
      </AuthPushButton>
    </div>
  );
}
