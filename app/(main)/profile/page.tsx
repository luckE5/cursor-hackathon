"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GuestPrompt } from "@/components/guest-prompt";
import { PageHeader } from "@/components/layout/page-header";
import { VerticalDayTimeline } from "@/components/schedule/vertical-day-timeline";
import { useSession } from "@/components/session-provider";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";
import { useWeekSchedules } from "@/hooks/use-week-schedules";
import { scheduleQueryBlocks } from "@/lib/schedule-access";
import { todayISODate } from "@/lib/date";
import { timeToMin } from "@/lib/schedule-cal";
import { getWeekIsoDates } from "@/lib/week-dates";
import { selectTriggerClassName } from "@/lib/ui-classes";
function blockMinutes(
  type: "task" | "free" | "meeting",
  start: string,
  end: string,
) {
  if (type === "free") return 0;
  return Math.max(0, timeToMin(end) - timeToMin(start));
}

const DELETE_CONFIRM_PHRASE = "DELETE";

export default function ProfilePage() {
  const router = useRouter();
  const { userId, signOut } = useSession();
  const today = todayISODate();
  const weekDates = useMemo(
    () => getWeekIsoDates(new Date()),
    [],
  );
  const weekResults = useWeekSchedules(userId, userId, weekDates);

  const user = useQuery(api.users.get, userId ? { userId } : "skip");
  const todaySchedule = useQuery(
    api.schedules.getSchedule,
    userId ? { userId, date: today, viewerId: userId } : "skip",
  );
  const allUsers = useQuery(
    api.users.listPublicPeers,
    userId ? { viewerId: userId } : "skip",
  );
  const friendships = useQuery(
    api.friendships.listForUser,
    userId ? { userId } : "skip",
  );
  const incomingReq = useQuery(
    api.requests.listIncoming,
    userId ? { userId } : "skip",
  );
  const outgoingReq = useQuery(
    api.requests.listOutgoing,
    userId ? { userId } : "skip",
  );

  const updateProfile = useMutation(api.users.updateProfile);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const generateAvatarUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const setUserAvatar = useMutation(api.users.setUserAvatar);
  const clearUserAvatar = useMutation(api.users.clearUserAvatar);
  const sendFriendRequest = useMutation(api.friendships.sendFriendRequest);
  const acceptFriendRequest = useMutation(api.friendships.acceptFriendRequest);
  const removeFriendship = useMutation(api.friendships.removeFriendship);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [preference, setPreference] = useState<"morning" | "night">("morning");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addPeer, setAddPeer] = useState<Id<"users"> | "">("");
  const [addBusy, setAddBusy] = useState(false);
  const [connBusy, setConnBusy] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPreference(user.preference);
    }
  }, [user]);

  const stats = useMemo(() => {
    let taskMin = 0;
    let meetingBlocks = 0;
    for (let i = 0; i < 7; i++) {
      const { blocks } = scheduleQueryBlocks(weekResults[i]);
      for (const b of blocks) {
        if (b.type === "meeting") meetingBlocks += 1;
        taskMin += blockMinutes(b.type, b.startTime, b.endTime);
      }
    }
    const hours = Math.round((taskMin / 60) * 10) / 10;
    const handled =
      (incomingReq?.filter((r) => r.status !== "pending").length ?? 0) +
      (outgoingReq?.filter((r) => r.status !== "pending").length ?? 0);
    const productivity = Math.min(
      100,
      Math.round(35 + hours * 6 + meetingBlocks * 5 + handled * 2),
    );
    return { hours, meetingBlocks, handled, productivity };
  }, [weekResults, incomingReq, outgoingReq]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      await updateProfile({
        userId,
        name: name.trim(),
        email: email.trim(),
        preference,
      });
      setMsg("Profile saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function addFriendConnect() {
    if (!userId || !addPeer) return;
    setAddBusy(true);
    try {
      await sendFriendRequest({ fromUserId: userId, toUserId: addPeer });
      setAddOpen(false);
      setAddPeer("");
    } finally {
      setAddBusy(false);
    }
  }

  async function acceptF(peerId: Id<"users">) {
    if (!userId) return;
    setConnBusy(peerId);
    try {
      await acceptFriendRequest({ userId, friendUserId: peerId });
    } finally {
      setConnBusy(null);
    }
  }

  async function rejectF(peerId: Id<"users">) {
    if (!userId) return;
    setConnBusy(peerId);
    try {
      await removeFriendship({ userId, peerId });
    } finally {
      setConnBusy(null);
    }
  }

  async function uploadAvatarFile(file: File) {
    if (!userId) return;
    if (!file.type.startsWith("image/")) {
      setAvatarErr("Choose an image file (JPEG, PNG, WebP, etc.).");
      return;
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setAvatarErr("Image must be 5MB or smaller.");
      return;
    }
    setAvatarBusy(true);
    setAvatarErr(null);
    setMsg(null);
    try {
      const postUrl = await generateAvatarUploadUrl();
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Upload failed");
      }
      const json = (await res.json()) as { storageId: string };
      await setUserAvatar({
        userId,
        storageId: json.storageId as Id<"_storage">,
      });
      setMsg("Profile photo updated.");
    } catch (e) {
      setAvatarErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    if (!userId || !user?.avatarStorageId) return;
    setAvatarBusy(true);
    setAvatarErr(null);
    setMsg(null);
    try {
      await clearUserAvatar({ userId });
      setMsg("Profile photo removed.");
    } catch (e) {
      setAvatarErr(e instanceof Error ? e.message : "Could not remove photo");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function confirmDeleteAccount() {
    if (!userId) return;
    if (deleteConfirm.trim() !== DELETE_CONFIRM_PHRASE) return;
    setDeleteBusy(true);
    setDeleteErr(null);
    try {
      await deleteAccount({ userId });
      signOut();
      setDeleteOpen(false);
      setDeleteConfirm("");
      router.replace("/");
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : "Could not delete account");
    } finally {
      setDeleteBusy(false);
    }
  }

  const acceptedFriends =
    friendships?.filter((f) => f.status === "accepted") ?? [];
  const pendingFriend =
    friendships?.filter((f) => f.status === "pending") ?? [];
  const pendingIncoming = pendingFriend.filter((f) => f.direction === "incoming");
  const pendingOutgoing = pendingFriend.filter((f) => f.direction === "outgoing");

  const addCandidates =
    allUsers?.filter((u) => {
      if (!userId || u._id === userId) return false;
      const row = friendships?.find((f) => f.peerId === u._id);
      if (row?.status === "accepted" || row?.status === "pending")
        return false;
      return true;
    }) ?? [];

  if (!userId) {
    return (
      <GuestPrompt description="Sign in to edit your profile and preferences." />
    );
  }

  const { blocks: blocksToday } = scheduleQueryBlocks(todaySchedule);

  return (
    <div className="animate-fade-in-up pb-4">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your identity, week stats, and connections — same glass aesthetic as the dashboard."
      />
      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          <header className="animate-float-slow overflow-hidden rounded-[1.35rem] border border-white/50 bg-white/45 p-6 shadow-[0_24px_70px_-28px_rgba(79,70,229,0.22)] backdrop-blur-xl [animation-duration:8s] sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center gap-4 sm:items-start">
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadAvatarFile(f);
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadAvatarFile(f);
                  }}
                />
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 opacity-60 blur-md" />
                  <UserAvatar
                    name={user?.name ?? "You"}
                    imageUrl={user?.avatarUrl}
                    size="lg"
                    className="relative h-28 w-28 !rounded-full border-2 border-white/80 text-3xl shadow-xl shadow-indigo-500/25"
                  />
                </div>
                <div className="flex max-w-[min(100%,280px)] flex-col gap-2">
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-lg"
                      disabled={avatarBusy}
                      onClick={() => galleryInputRef.current?.click()}
                    >
                      Choose from gallery
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-lg"
                      disabled={avatarBusy}
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      Take photo
                    </Button>
                    {user?.avatarStorageId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={avatarBusy}
                        onClick={() => void removeAvatar()}
                      >
                        Remove photo
                      </Button>
                    ) : null}
                  </div>
                  {avatarBusy ? (
                    <p className="text-center text-xs text-slate-500 sm:text-left">
                      Uploading…
                    </p>
                  ) : null}
                  {avatarErr ? (
                    <p className="text-center text-sm font-medium text-red-600 sm:text-left">
                      {avatarErr}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-700 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Member
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  {user === undefined ? "…" : user?.name ?? "Profile"}
                </h1>
                <p className="mt-1 text-base text-slate-500">
                  {user?.email ?? "Loading…"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Preference:{" "}
                  <span className="font-semibold text-slate-800">
                    {user?.preference === "night" ? "Night owl" : "Morning"}
                  </span>
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Scheduled hours",
                value: `${stats.hours}h`,
                sub: "Tasks + meetings (this week)",
              },
              {
                label: "Meeting blocks",
                value: String(stats.meetingBlocks),
                sub: "Across your week",
              },
              {
                label: "Requests handled",
                value: String(stats.handled),
                sub: "Accepted or declined",
              },
              {
                label: "Productivity score",
                value: `${stats.productivity}`,
                sub: "Heuristic from your week",
              },
            ].map((s) => (
              <Card
                key={s.label}
                className="transition-transform duration-300 hover:-translate-y-0.5"
              >
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {s.label}
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold tabular-nums text-slate-900">
                    {s.value}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-slate-500">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Today</CardTitle>
              <CardDescription>
                Live preview of {today} — updates from Convex.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todaySchedule === undefined ? (
                <div className="space-y-3 py-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
              ) : (
                <VerticalDayTimeline
                  blocks={blocksToday}
                  emptyLabel="Nothing scheduled today yet."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                How teammates see you — synced everywhere.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-5 rounded-xl border border-white/50 bg-white/40 px-4 py-3 text-sm text-slate-700 shadow-inner shadow-white/20 backdrop-blur-md">
                <p className="font-semibold text-slate-900">
                  How you use ChronoSync
                </p>
                <p className="mt-1">
                  {(user?.mode ?? "social") === "work"
                    ? "Work mode — organization tools in the sidebar, manager flows, and shared scheduling."
                    : "Social mode — friends, shared calendars, and your planner. Joining any workspace moves you to Work mode automatically."}
                </p>
              </div>
              <form className="space-y-5" onSubmit={save}>
                <div className="space-y-2">
                  <Label htmlFor="p-name">Name</Label>
                  <Input
                    id="p-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-email">Email</Label>
                  <Input
                    id="p-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Energy preference</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={preference === "morning" ? "default" : "outline"}
                      className="flex-1 rounded-lg"
                      onClick={() => setPreference("morning")}
                    >
                      Morning
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={preference === "night" ? "default" : "outline"}
                      className="flex-1 rounded-lg"
                      onClick={() => setPreference("night")}
                    >
                      Night owl
                    </Button>
                  </div>
                </div>
                {msg ? (
                  <p className="text-sm font-medium text-emerald-700">{msg}</p>
                ) : null}
                {err ? (
                  <p className="text-sm font-medium text-red-600">{err}</p>
                ) : null}
                <Button
                  type="submit"
                  className="h-11 rounded-lg"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
              <CardDescription>
                Sign out on this device or use Switch user in the sidebar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="secondary"
                className="rounded-lg"
                onClick={() => signOut()}
              >
                Sign out
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200/80 bg-red-50/40">
            <CardHeader>
              <CardTitle className="text-red-900">Danger zone</CardTitle>
              <CardDescription className="text-red-900/70">
                Permanently delete your account, schedule, tasks, org links, and
                friend connections. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog
                open={deleteOpen}
                onOpenChange={(open) => {
                  setDeleteOpen(open);
                  if (!open) {
                    setDeleteConfirm("");
                    setDeleteErr(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-lg"
                  >
                    Delete your profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-red-200/80">
                  <DialogHeader>
                    <DialogTitle>Delete your profile?</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-600">
                    All data tied to this account will be removed from the
                    database. Type{" "}
                    <span className="font-mono font-semibold text-slate-900">
                      {DELETE_CONFIRM_PHRASE}
                    </span>{" "}
                    to confirm.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirm">Confirmation</Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder={DELETE_CONFIRM_PHRASE}
                      autoComplete="off"
                    />
                  </div>
                  {deleteErr ? (
                    <p className="text-sm font-medium text-red-600">{deleteErr}</p>
                  ) : null}
                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-lg"
                      disabled={deleteBusy}
                      onClick={() => setDeleteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="rounded-lg"
                      disabled={
                        deleteBusy ||
                        deleteConfirm.trim() !== DELETE_CONFIRM_PHRASE
                      }
                      onClick={() => void confirmDeleteAccount()}
                    >
                      {deleteBusy ? "Deleting…" : "Delete forever"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4">
          <Card className="shadow-[0_20px_50px_-18px_rgba(79,70,229,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Connections</CardTitle>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-lg">
                    + Add friend
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add friend</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Label>Teammate</Label>
                    <select
                      className={selectTriggerClassName()}
                      value={addPeer}
                      onChange={(e) =>
                        setAddPeer(e.target.value as Id<"users"> | "")
                      }
                    >
                      <option value="">Choose…</option>
                      {addCandidates.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      className="w-full rounded-lg"
                      disabled={!addPeer || addBusy}
                      onClick={() => void addFriendConnect()}
                    >
                      {addBusy ? "Sending…" : "Send request"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="friends">
                <TabsList className="mb-4 w-full">
                  <TabsTrigger value="friends" className="flex-1">
                    Friends
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex-1">
                    Pending
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="friends" className="space-y-3">
                  {acceptedFriends.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/60 bg-white/25 px-4 py-8 text-center backdrop-blur-sm">
                      <p className="text-sm font-medium text-slate-600">
                        No connections yet
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Add someone above to share calendars.
                      </p>
                    </div>
                  ) : (
                    acceptedFriends.map((f) => {
                      const peer = f.peer;
                      return (
                        <div
                          key={f._id}
                          className="rounded-xl border border-white/50 bg-white/40 p-4 shadow-md shadow-indigo-500/5 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/70 hover:shadow-lg hover:shadow-indigo-500/15"
                        >
                          <div className="flex items-start gap-3">
                            <UserAvatar
                              name={peer?.name ?? "?"}
                              size="md"
                              imageUrl={peer?.avatarUrl}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900">
                                {peer?.name}
                              </p>
                              <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                                Connected
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" className="rounded-lg" asChild>
                              <Link href={`/shared?peer=${f.peerId}`}>
                                Shared calendar
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
                <TabsContent value="pending" className="space-y-3">
                  {pendingIncoming.length === 0 && pendingOutgoing.length === 0 ? (
                    <p className="text-sm text-slate-500">No pending invites.</p>
                  ) : null}
                  {pendingIncoming.map((f) => (
                    <div
                      key={f._id}
                      className="rounded-xl border border-amber-300/50 bg-gradient-to-br from-amber-100/60 to-yellow-100/40 p-4 shadow-md backdrop-blur-md transition-all duration-200 hover:-translate-y-px hover:shadow-lg"
                    >
                      <p className="font-semibold text-slate-900">
                        {f.peer?.name}
                      </p>
                      <p className="text-xs text-amber-800">Wants to connect</p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-lg"
                          disabled={connBusy === f.peerId}
                          onClick={() => void acceptF(f.peerId)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-lg"
                          disabled={connBusy === f.peerId}
                          onClick={() => void rejectF(f.peerId)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingOutgoing.map((f) => (
                    <div
                      key={f._id}
                      className="rounded-xl border border-white/50 bg-white/35 p-4 text-sm text-slate-600 shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-white/50"
                    >
                      Waiting for <span className="font-medium">{f.peer?.name}</span>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
