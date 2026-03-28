import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-white/55 bg-white/45 px-3.5 py-2 text-sm text-slate-900 shadow-inner shadow-white/20 backdrop-blur-md transition-all duration-200 placeholder:text-slate-400",
          "focus-visible:border-indigo-400/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
