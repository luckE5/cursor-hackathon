"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import styles from "./auth.module.css";

export type AuthPushVariant =
  | "primary"
  | "socialLight"
  | "socialDark"
  | "tabActive"
  | "tabInactive";

const variantClass: Record<AuthPushVariant, string> = {
  primary: cn(
    "border border-indigo-400/40 bg-gradient-to-b from-indigo-500 via-violet-600 to-indigo-700 text-white",
    "shadow-[0_6px_0_rgb(55,48,163),0_10px_28px_rgba(79,70,229,0.45)]",
    "hover:shadow-[0_9px_0_rgb(55,48,163),0_16px_40px_rgba(99,102,241,0.55)]",
    "active:shadow-[0_2px_0_rgb(55,48,163),0_4px_14px_rgba(79,70,229,0.35)]",
  ),
  socialLight: cn(
    "border border-white/70 bg-gradient-to-b from-white to-slate-100/95 text-slate-800",
    "shadow-[0_5px_0_rgb(203,213,225),0_8px_22px_rgba(15,23,42,0.12)]",
    "hover:shadow-[0_8px_0_rgb(203,213,225),0_14px_28px_rgba(15,23,42,0.14)]",
    "active:shadow-[0_2px_0_rgb(203,213,225),0_4px_12px_rgba(15,23,42,0.1)]",
  ),
  socialDark: cn(
    "border border-slate-800 bg-gradient-to-b from-slate-800 to-slate-950 text-white",
    "shadow-[0_6px_0_rgb(15,23,42),0_10px_28px_rgba(0,0,0,0.35)]",
    "hover:shadow-[0_9px_0_rgb(15,23,42),0_16px_36px_rgba(0,0,0,0.4)]",
    "active:shadow-[0_2px_0_rgb(15,23,42),0_4px_14px_rgba(0,0,0,0.28)]",
  ),
  tabActive: cn(
    "border border-indigo-400/50 bg-gradient-to-b from-white/95 to-indigo-50/90 text-indigo-950",
    "shadow-[0_4px_0_rgb(165,180,252),0_8px_20px_rgba(99,102,241,0.25)]",
    "hover:shadow-[0_6px_0_rgb(165,180,252),0_12px_26px_rgba(99,102,241,0.32)]",
    "active:shadow-[0_1px_0_rgb(165,180,252),0_3px_10px_rgba(99,102,241,0.2)]",
  ),
  tabInactive: cn(
    "border border-white/40 bg-white/25 text-slate-600",
    "shadow-[0_3px_0_rgba(148,163,184,0.45),0_6px_16px_rgba(15,23,42,0.06)]",
    "hover:border-indigo-200/60 hover:bg-white/45 hover:text-slate-900",
    "hover:shadow-[0_5px_0_rgba(148,163,184,0.4),0_10px_22px_rgba(99,102,241,0.12)]",
    "active:shadow-[0_1px_0_rgba(148,163,184,0.5),0_3px_8px_rgba(15,23,42,0.08)]",
  ),
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AuthPushVariant;
};

export const AuthPushButton = forwardRef<HTMLButtonElement, Props>(
  function AuthPushButton(
    { className, variant = "primary", type = "button", disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          styles.authBtn3d,
          "relative z-0 w-full overflow-hidden rounded-2xl px-4 py-3.5 text-[15px] font-bold tracking-tight",
          "disabled:pointer-events-none disabled:opacity-55 disabled:grayscale-[0.2]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          variantClass[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
