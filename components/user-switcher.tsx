"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSession } from "@/components/session-provider";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function UserSwitcher() {
  const { userId, setUserId } = useSession();
  /** Full directory without emails — includes current user for disabled row in dialog. */
  const users = useQuery(api.users.listAll);
  const me = useQuery(api.users.get, userId ? { userId } : "skip");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!userId) return null;

  function pick(id: Id<"users">) {
    setUserId(id);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-white/45 bg-white/35 p-3 shadow-inner shadow-white/20 backdrop-blur-md">
      <div className="mb-3 flex items-center gap-3">
        <UserAvatar
          name={me?.name ?? "You"}
          size="md"
          imageUrl={me?.avatarUrl}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {me === undefined ? "…" : me?.name ?? "Signed in"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {me?.email ?? "Local session"}
          </p>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full text-xs">
            Switch user
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch user (demo)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Jump to another Convex profile on this device.
          </p>
          <ul className="max-h-64 space-y-1 overflow-y-auto py-2">
            {users?.map((u) => (
              <li key={u._id}>
                <button
                  type="button"
                  disabled={u._id === userId}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200",
                    "hover:bg-white/55 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50",
                    u._id === userId &&
                      "bg-gradient-to-r from-indigo-500/12 to-violet-500/10 shadow-sm",
                  )}
                  onClick={() => pick(u._id)}
                >
                  <UserAvatar name={u.name} size="sm" imageUrl={u.avatarUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900">
                      {u.name}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
