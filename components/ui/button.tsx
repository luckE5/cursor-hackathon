import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-[length:200%_100%] text-white shadow-lg shadow-indigo-500/30 hover:bg-[position:100%_0] hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/35 active:scale-[0.97]",
        secondary:
          "border border-white/55 bg-white/45 text-slate-800 shadow-md shadow-slate-400/10 backdrop-blur-md hover:border-white/75 hover:bg-white/65 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
        outline:
          "border border-white/60 bg-white/30 text-slate-800 shadow-sm backdrop-blur-md hover:border-indigo-300/80 hover:bg-white/50 hover:shadow-md active:scale-[0.98]",
        ghost:
          "text-slate-600 hover:bg-white/40 hover:text-slate-900 hover:backdrop-blur-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
