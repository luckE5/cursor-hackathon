"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { UserSwitcher } from "@/components/user-switcher";
import { useUserMode } from "@/hooks/use-user-mode";
import { sidebarItemsForMode } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { mode, ready } = useUserMode();
  const effectiveMode = ready ? mode : "social";
  const items = sidebarItemsForMode(effectiveMode);

  return (
    <aside
      className={cn(
        "fixed left-5 top-5 z-40 hidden h-[calc(100vh-2.5rem)] w-60 flex-col overflow-hidden rounded-[1.35rem]",
        "border border-white/50 bg-white/45 py-6 pl-4 pr-3 shadow-[0_20px_60px_-20px_rgba(79,70,229,0.28),0_0_0_1px_rgba(255,255,255,0.4)_inset]",
        "backdrop-blur-2xl backdrop-saturate-150 md:flex",
      )}
    >
      <div className="px-2 pb-7">
        <Logo />
        <p className="mt-3 px-1 text-xs leading-relaxed text-slate-500">
          {effectiveMode === "work"
            ? "Team coordination & schedules."
            : "Coordinate time with clarity."}
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-1 pb-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                "hover:scale-[1.02] hover:bg-white/55 hover:text-slate-900 hover:shadow-md hover:shadow-indigo-500/10",
                active
                  ? "bg-gradient-to-r from-indigo-500/15 via-violet-500/12 to-fuchsia-500/10 text-indigo-950 shadow-[0_0_0_1px_rgba(99,102,241,0.25),0_8px_24px_-8px_rgba(99,102,241,0.45)]"
                  : "text-slate-600",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
                  active
                    ? "text-indigo-600 drop-shadow-[0_0_8px_rgba(99,102,241,0.55)]"
                    : "text-slate-400 group-hover:text-indigo-500",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/40 pt-4">
        <UserSwitcher />
      </div>
    </aside>
  );
}
