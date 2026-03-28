import { cn } from "@/lib/utils";
import { initialsFromName } from "@/lib/initials";

const GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-sky-500 to-indigo-600",
  "from-fuchsia-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
] as const;

function gradientForSeed(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export function UserAvatar({
  name,
  imageUrl,
  size = "md",
  className,
}: {
  name: string;
  /** Resolved Convex storage URL; when set, shows photo instead of initials. */
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text =
    size === "sm" ? "text-[10px]" : size === "lg" ? "text-lg" : "text-xs";
  const box =
    size === "sm"
      ? "h-9 w-9"
      : size === "lg"
        ? "h-14 w-14 rounded-2xl"
        : "h-11 w-11";
  const g = gradientForSeed(name || "?");

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded blob URLs from Convex
      <img
        src={imageUrl}
        alt=""
        className={cn(
          "shrink-0 rounded-full object-cover shadow-md shadow-slate-900/10",
          box,
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-md shadow-slate-900/10",
        box,
        text,
        g,
        className,
      )}
      aria-hidden
    >
      {initialsFromName(name)}
    </div>
  );
}
