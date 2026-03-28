"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GuestPrompt } from "@/components/guest-prompt";
import { PageHeader } from "@/components/layout/page-header";
import { useSession } from "@/components/session-provider";
import { useUserMode } from "@/hooks/use-user-mode";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function statusLabel(
  row: {
    status: "pending" | "accepted";
    peerId: Id<"users">;
    requestedBy: Id<"users">;
  },
  me: Id<"users">,
) {
  if (row.status === "accepted")
    return { text: "Connected", tone: "success" as const };
  if (row.requestedBy === me)
    return { text: "Request sent", tone: "pending" as const };
  return { text: "Wants to connect", tone: "action" as const };
}

export default function FriendsPage() {
  const { userId } = useSession();
  const { mode, ready: modeReady } = useUserMode();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(t);
  }, [search]);

  const allPeers = useQuery(
    api.users.listPublicPeers,
    userId ? { viewerId: userId } : "skip",
  );
  const searchPeers = useQuery(
    api.users.searchPublicPeers,
    userId && debouncedSearch
      ? { viewerId: userId, query: debouncedSearch }
      : "skip",
  );
  const friendships = useQuery(
    api.friendships.listForUser,
    userId ? { userId } : "skip",
  );
  const sendFriendRequest = useMutation(api.friendships.sendFriendRequest);
  const acceptFriendRequest = useMutation(api.friendships.acceptFriendRequest);
  const removeFriendship = useMutation(api.friendships.removeFriendship);
  const [busyPeer, setBusyPeer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connect(peerId: Id<"users">) {
    if (!userId) return;
    setBusyPeer(peerId);
    setError(null);
    try {
      await sendFriendRequest({ fromUserId: userId, toUserId: peerId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect");
    } finally {
      setBusyPeer(null);
    }
  }

  async function accept(peerId: Id<"users">) {
    if (!userId) return;
    setBusyPeer(peerId);
    setError(null);
    try {
      await acceptFriendRequest({ userId, friendUserId: peerId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept");
    } finally {
      setBusyPeer(null);
    }
  }

  async function remove(peerId: Id<"users">) {
    if (!userId) return;
    setBusyPeer(peerId);
    setError(null);
    try {
      await removeFriendship({ userId, peerId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusyPeer(null);
    }
  }

  const peers = useMemo(
    () => (debouncedSearch ? (searchPeers ?? []) : (allPeers ?? [])),
    [debouncedSearch, searchPeers, allPeers],
  );
  const peersLoading = debouncedSearch
    ? searchPeers === undefined
    : allPeers === undefined;

  const friendshipByPeer = useMemo(
    () => new Map(friendships?.map((f) => [f.peerId, f]) ?? []),
    [friendships],
  );

  const { connected, discover } = useMemo(() => {
    const connectedList = peers.filter((u) => {
      const link = friendshipByPeer.get(u._id);
      return link?.status === "accepted";
    });
    const discoverList = peers.filter((u) => {
      const link = friendshipByPeer.get(u._id);
      return link?.status !== "accepted";
    });
    return { connected: connectedList, discover: discoverList };
  }, [peers, friendshipByPeer]);

  if (!userId) {
    return (
      <GuestPrompt description="Sign in to connect with teammates and open shared scheduling." />
    );
  }

  if (modeReady && mode === "work") {
    return (
      <div className="space-y-8 pb-4 animate-fade-in-up">
        <PageHeader
          eyebrow="People"
          title="Friends"
          description="Connect with people for shared availability and requests."
        />
        <Card className="border-slate-200/90">
          <CardHeader>
            <CardTitle>Available in Social mode</CardTitle>
            <CardDescription>
              Work mode focuses on organization tools. Friends and social
              discovery stay available when you use ChronoSync personally — or
              after you leave all workspaces, your mode returns to Social
              automatically.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/org">Organization</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/shared">Shared calendar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profile">Profile</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  function UserRow({
    u,
    meId,
  }: {
    u: (typeof peers)[number];
    meId: Id<"users">;
  }) {
    const link = friendshipByPeer.get(u._id);
    const status = link
      ? statusLabel(link, meId)
      : { text: "Not connected", tone: "neutral" as const };

    return (
      <Card className="overflow-hidden rounded-2xl border-slate-200/90 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start gap-4">
            <UserAvatar name={u.name} size="lg" imageUrl={u.avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{u.name}</CardTitle>
                <span
                  className={
                    status.tone === "success"
                      ? "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900"
                      : status.tone === "pending"
                        ? "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900"
                        : status.tone === "action"
                          ? "rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-900"
                          : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
                  }
                >
                  {status.text}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          {!link ? (
            <Button
              size="sm"
              disabled={busyPeer === u._id}
              onClick={() => void connect(u._id)}
            >
              Add friend
            </Button>
          ) : null}
          {link?.status === "pending" && link.requestedBy !== meId ? (
            <Button
              size="sm"
              disabled={busyPeer === u._id}
              onClick={() => void accept(u._id)}
            >
              Accept request
            </Button>
          ) : null}
          {link?.status === "accepted" ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busyPeer === u._id}
              onClick={() => void remove(u._id)}
            >
              Remove
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/shared?peer=${u._id}`}>Calendar & requests</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/planner">Planner</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-8 pb-4 animate-fade-in-up">
      <PageHeader
        eyebrow="Network"
        title="Friends"
        description="Connect with people, then open the shared calendar to request time by dragging on the grid."
      />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}

      <div className="relative max-w-xl">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className={cn(
            "h-11 rounded-full border-slate-200 bg-white pl-10 pr-4 shadow-sm",
            "focus-visible:ring-2 focus-visible:ring-indigo-500/25",
          )}
          aria-label="Search people"
        />
      </div>

      {peersLoading ? (
        <p className="text-sm text-slate-500">Loading directory…</p>
      ) : peers.length === 0 ? (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-14 text-center text-sm text-slate-500">
            Create another profile with “Switch user” to see people here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Friends · {connected.length}
            </h2>
            {connected.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                {debouncedSearch
                  ? "No friends match your search."
                  : "No connections yet — invite someone from Discover below."}
              </p>
            ) : (
              <div className="grid gap-4">
                {connected.map((u) => (
                  <UserRow key={u._id} u={u} meId={userId} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Discover · {discover.length}
            </h2>
            {discover.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                {debouncedSearch
                  ? "No other people match your search."
                  : "Everyone is already a friend or pending."}
              </p>
            ) : (
              <div className="grid gap-4">
                {discover.map((u) => (
                  <UserRow key={u._id} u={u} meId={userId} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
