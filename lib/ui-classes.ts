import { cn } from "@/lib/utils";

/** Shared native select styling for consistency across pages. */
export function selectTriggerClassName(className?: string) {
  return cn(
    "flex h-11 w-full cursor-pointer rounded-xl border border-white/55 bg-white/45 px-3.5 text-sm text-slate-800 shadow-md shadow-indigo-500/5 backdrop-blur-md transition-all duration-200",
    "hover:border-indigo-300/60 hover:bg-white/55 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400/70",
    "disabled:cursor-not-allowed disabled:opacity-50",
    className,
  );
}
