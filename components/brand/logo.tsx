import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text =
    size === "sm"
      ? "text-base"
      : size === "lg"
        ? "text-2xl sm:text-3xl"
        : "text-lg";
  return (
    <Link
      href="/dashboard"
      className={cn(
        "group inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 transition-transform duration-200 group-hover:scale-[1.02]",
          size === "lg" && "h-11 w-11 rounded-2xl",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 6v6l4 2" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <span
        className={cn(
          text,
          "bg-gradient-to-r from-slate-900 via-indigo-900 to-violet-800 bg-clip-text text-transparent",
        )}
      >
        Chronosync
      </span>
    </Link>
  );
}
