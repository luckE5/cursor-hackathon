import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl ring-1 ring-white/35 skeleton-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
