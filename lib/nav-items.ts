import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  GitBranch,
  LayoutDashboard,
  UserCircle,
  Users,
} from "lucide-react";
import type { AppMode } from "@/hooks/use-user-mode";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function sidebarItemsForMode(mode: AppMode): NavItem[] {
  const dashboard: NavItem = {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  };
  const planner: NavItem = {
    href: "/planner",
    label: "Planner",
    icon: CalendarDays,
  };
  const shared: NavItem = {
    href: "/shared",
    label: "Shared",
    icon: GitBranch,
  };
  const friends: NavItem = {
    href: "/friends",
    label: "Friends",
    icon: Users,
  };
  const org: NavItem = {
    href: "/org",
    label: "Organization",
    icon: Building2,
  };
  const profile: NavItem = {
    href: "/profile",
    label: "Profile",
    icon: UserCircle,
  };

  if (mode === "social") {
    return [dashboard, planner, friends, shared, profile];
  }
  return [dashboard, planner, org, shared, profile];
}

/** Bottom bar: first four primary destinations. */
export function mobilePrimaryForMode(mode: AppMode): NavItem[] {
  const dashboard: NavItem = {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
  };
  const planner: NavItem = {
    href: "/planner",
    label: "Plan",
    icon: CalendarDays,
  };
  const shared: NavItem = {
    href: "/shared",
    label: "Shared",
    icon: GitBranch,
  };
  const friends: NavItem = {
    href: "/friends",
    label: "Friends",
    icon: Users,
  };
  const org: NavItem = {
    href: "/org",
    label: "Org",
    icon: Building2,
  };

  if (mode === "social") {
    return [dashboard, planner, shared, friends];
  }
  return [dashboard, planner, shared, org];
}

export function mobileMoreForMode(mode: AppMode): NavItem[] {
  const profile: NavItem = {
    href: "/profile",
    label: "Profile",
    icon: UserCircle,
  };
  if (mode === "social") {
    return [profile];
  }
  return [profile];
}
