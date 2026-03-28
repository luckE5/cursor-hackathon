"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserMode } from "@/hooks/use-user-mode";
import { mobileMoreForMode, mobilePrimaryForMode } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const { mode, ready } = useUserMode();
  const effectiveMode = ready ? mode : "social";
  const primary = mobilePrimaryForMode(effectiveMode);
  const more = mobileMoreForMode(effectiveMode);

  const moreActive = more.some((i) => pathname === i.href);

  return (
    <nav
      className={cn(
        "fixed bottom-4 left-1/2 z-50 w-[min(100%-1.5rem,28rem)] -translate-x-1/2 rounded-[1.25rem]",
        "border border-white/50 bg-white/45 px-2 py-2 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.35)] backdrop-blur-2xl backdrop-saturate-150",
        "pb-[max(0.35rem,env(safe-area-inset-bottom))] md:hidden",
      )}
      aria-label="Mobile"
    >
      <div className="flex items-end justify-around gap-0.5">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-all duration-200 active:scale-95",
                active
                  ? "text-indigo-600 drop-shadow-[0_0_12px_rgba(99,102,241,0.45)]"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-105")} />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-slate-500 transition-all duration-200 hover:text-slate-800 active:scale-95",
                moreActive &&
                  "text-indigo-600 drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]",
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-semibold">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="mb-3 w-48">
            {more.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
