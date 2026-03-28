"use client";

import { useMutation, useQuery } from "convex/react";
import { addWeeks, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { OrgEmployeeWeekCalendar } from "@/components/schedule/org-employee-week-calendar";
import { GuestPrompt } from "@/components/guest-prompt";
import { PageHeader } from "@/components/layout/page-header";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWeekSchedules } from "@/hooks/use-week-schedules";
import { scheduleQueryBlocks } from "@/lib/schedule-access";
import type { CalBlock } from "@/lib/schedule-cal";
import type { OrganizationHeatmapPayload } from "@/lib/team-heatmap";
import {
  clearStoredOrgId,
  getStoredOrgId,
  setStoredOrgId,
} from "@/lib/org-local";
import { getWeekIsoDates, weekRangeLabel } from "@/lib/week-dates";
import { selectTriggerClassName } from "@/lib/ui-classes";

export default function OrgPage() {
  const { userId } = useSession();

  const myOrgs = useQuery(
    api.organizations.listMyOrganizations,
    userId ? { userId } : "skip",
  );

  const [selectedOrg, setSelectedOrg] = useState<Id<"organizations"> | "">("");
  const [orgName, setOrgName] = useState("Operations pod");
  const [memberToAdd, setMemberToAdd] = useState<Id<"users"> | "">("");
  const [role, setRole] = useState<"member" | "manager">("member");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<
    Id<"users"> | ""
  >("");
  const [weekAnchor, setWeekAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const createOrg = useMutation(api.organizations.createOrganization);
  const addMember = useMutation(api.organizations.addMember);
  const assignMeeting = useMutation(api.organizations.assignMeeting);
  const assignBlockedTime = useMutation(api.organizations.assignBlockedTime);
  const requestToJoin = useMutation(api.organizations.requestToJoinOrganization);
  const joinWithInvite = useMutation(api.organizations.joinWithInviteCode);
  const leaveOrg = useMutation(api.organizations.leaveOrganization);
  const respondJoin = useMutation(api.organizations.respondToJoinRequest);
  const createInvite = useMutation(api.organizations.createInviteLink);

  const [orgSearch, setOrgSearch] = useState("");
  const [debouncedOrgSearch, setDebouncedOrgSearch] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedOrgSearch(orgSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [orgSearch]);

  const orgSearchResults = useQuery(
    api.organizations.searchOrganizations,
    debouncedOrgSearch.length >= 2 ? { query: debouncedOrgSearch } : "skip",
  );

  const myJoinRequests = useQuery(
    api.organizations.listMyJoinRequests,
    userId ? { userId } : "skip",
  );

  const pendingJoinForOrg = useQuery(
    api.organizations.listPendingJoinRequestsForOrg,
    userId && selectedOrg
      ? {
          managerId: userId,
          organizationId: selectedOrg as Id<"organizations">,
        }
      : "skip",
  );

  const members = useQuery(
    api.organizations.getMembers,
    selectedOrg ? { organizationId: selectedOrg as Id<"organizations"> } : "skip",
  );
  const allUsers = useQuery(
    api.users.listPublicPeers,
    userId ? { viewerId: userId } : "skip",
  );

  useEffect(() => {
    const stored = getStoredOrgId();
    if (stored) setSelectedOrg(stored as Id<"organizations">);
  }, []);

  useEffect(() => {
    if (selectedOrg) setStoredOrgId(selectedOrg);
    else clearStoredOrgId();
  }, [selectedOrg]);

  useEffect(() => {
    setSelectedEmployeeId("");
  }, [selectedOrg]);

  const currentRole = myOrgs?.find(
    (o) => o.organization._id === selectedOrg,
  )?.membership.role;

  const isManager = currentRole === "manager";

  const weekDates = useMemo(
    () => getWeekIsoDates(weekAnchor),
    [weekAnchor],
  );

  const heatmapRaw = useQuery(
    api.organizations.getOrganizationWeekHeatmapData,
    isManager && selectedOrg && selectedEmployeeId
      ? {
          organizationId: selectedOrg as Id<"organizations">,
          weekDates,
        }
      : "skip",
  );

  const teamHeatmapPayload = useMemo((): OrganizationHeatmapPayload | undefined => {
    if (!isManager || heatmapRaw === undefined) return undefined;
    const schedulesByDate: OrganizationHeatmapPayload["schedulesByDate"] = {};
    for (const [date, byUser] of Object.entries(heatmapRaw.schedulesByDate)) {
      schedulesByDate[date] = {};
      for (const [uid, cell] of Object.entries(byUser)) {
        schedulesByDate[date][uid] = {
          scheduleExists: cell.scheduleExists,
          blocks: cell.blocks as CalBlock[],
        };
      }
    }
    return { members: heatmapRaw.members, schedulesByDate };
  }, [isManager, heatmapRaw]);

  const employeeIdForCal =
    selectedEmployeeId ? (selectedEmployeeId as Id<"users">) : null;

  const employeeWeek = useWeekSchedules(employeeIdForCal, userId, weekDates);
  const managerWeek = useWeekSchedules(
    userId && isManager ? userId : null,
    userId,
    weekDates,
  );

  const blocksByDate = useMemo(() => {
    const out: Record<string, CalBlock[]> = {};
    weekDates.forEach((d, i) => {
      const { blocks } = scheduleQueryBlocks(employeeWeek[i]);
      out[d] = blocks as CalBlock[];
    });
    return out;
  }, [weekDates, employeeWeek]);

  const managerBlocksByDate = useMemo(() => {
    const out: Record<string, CalBlock[]> = {};
    weekDates.forEach((d, i) => {
      const { blocks } = scheduleQueryBlocks(managerWeek[i]);
      out[d] = blocks as CalBlock[];
    });
    return out;
  }, [weekDates, managerWeek]);

  const dayLoadingEach = weekDates.map((_, i) => {
    if (!employeeIdForCal) return false;
    if (employeeWeek[i] === undefined) return true;
    if (isManager && userId && managerWeek[i] === undefined) return true;
    return false;
  });

  const selectedMember = members?.find(
    (m) => m.userId === selectedEmployeeId,
  );

  async function bootstrapOrg() {
    if (!userId) return;
    setPending(true);
    setActionErr(null);
    setActionMsg(null);
    try {
      const orgId = await createOrg({ name: orgName.trim() || "Workspace" });
      await addMember({
        organizationId: orgId,
        userId,
        role: "manager",
      });
      setSelectedOrg(orgId);
      setActionMsg("Workspace created — you are the manager.");
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Could not create workspace");
    } finally {
      setPending(false);
    }
  }

  async function onAssignMeeting({
    date,
    startTime,
    endTime,
    label,
    description,
    meetingLink,
  }: {
    date: string;
    startTime: string;
    endTime: string;
    force: boolean;
    label?: string;
    description?: string;
    meetingLink?: string;
  }) {
    if (!userId || !selectedOrg || !selectedEmployeeId) return;
    setPending(true);
    setActionErr(null);
    setActionMsg(null);
    try {
      await assignMeeting({
        managerId: userId,
        organizationId: selectedOrg as Id<"organizations">,
        userIds: [selectedEmployeeId as Id<"users">, userId],
        time: {
          date,
          startTime,
          endTime,
        },
        label: label ?? "Team meeting",
        description,
        meetingLink,
      });
      setActionMsg("Meeting added to both calendars.");
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Assignment failed");
      throw e;
    } finally {
      setPending(false);
    }
  }

  async function onAssignBlock({
    date,
    startTime,
    endTime,
  }: {
    date: string;
    startTime: string;
    endTime: string;
    force: boolean;
  }) {
    if (!userId || !selectedOrg || !selectedEmployeeId) return;
    setPending(true);
    setActionErr(null);
    setActionMsg(null);
    try {
      await assignBlockedTime({
        managerId: userId,
        organizationId: selectedOrg as Id<"organizations">,
        userIds: [selectedEmployeeId as Id<"users">],
        time: {
          date,
          startTime,
          endTime,
        },
        label: "Unavailable (manager hold)",
      });
      setActionMsg("Blocked time applied.");
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Block failed");
      throw e;
    } finally {
      setPending(false);
    }
  }

  if (!userId) {
    return (
      <GuestPrompt description="Sign in to create workspaces and manage team schedules." />
    );
  }

  return (
    <div className="space-y-8 pb-4 animate-fade-in-up">
      <PageHeader
        eyebrow="Teams"
        title="Workspace"
        description="Pick a member to open their week. Managers drag on the grid to assign a meeting (both calendars) or block time on the employee."
      />

      {actionMsg ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {actionMsg}
        </p>
      ) : null}
      {actionErr ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {actionErr}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Find or join a workspace</CardTitle>
          <CardDescription>
            Search by name, request access, or paste an invite code from a
            manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Search organizations</Label>
            <Input
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              placeholder="Type at least 2 characters…"
            />
          </div>
          {orgSearchResults === undefined && debouncedOrgSearch.length >= 2 ? (
            <p className="text-sm text-slate-500">Searching…</p>
          ) : orgSearchResults && orgSearchResults.length > 0 ? (
            <ul className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              {orgSearchResults.map((o) => {
                const already = myOrgs?.some(
                  (x) => x.organization._id === o._id,
                );
                return (
                  <li
                    key={o._id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="font-medium text-slate-900">{o.name}</span>
                    {already ? (
                      <span className="text-xs text-emerald-700">Member</span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!userId || pending}
                        onClick={() => {
                          if (!userId) return;
                          void requestToJoin({
                            userId,
                            organizationId: o._id,
                          })
                            .then(() =>
                              setActionMsg(`Join request sent to ${o.name}.`),
                            )
                            .catch((e) =>
                              setActionErr(
                                e instanceof Error
                                  ? e.message
                                  : "Request failed",
                              ),
                            );
                        }}
                      >
                        Request to join
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : debouncedOrgSearch.length >= 2 ? (
            <p className="text-sm text-slate-500">No matches.</p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label>Invite code</Label>
              <Input
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="8-character code"
              />
            </div>
            <Button
              type="button"
              disabled={!userId || pending || !inviteCodeInput.trim()}
              onClick={() => {
                if (!userId) return;
                void joinWithInvite({
                  userId,
                  code: inviteCodeInput.trim(),
                })
                  .then(() => {
                    setActionMsg("Joined workspace with invite.");
                    setInviteCodeInput("");
                  })
                  .catch((e) =>
                    setActionErr(
                      e instanceof Error ? e.message : "Could not join",
                    ),
                  );
              }}
            >
              Join with code
            </Button>
          </div>
        </CardContent>
      </Card>

      {myJoinRequests && myJoinRequests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your join requests</CardTitle>
            <CardDescription>Track requests you have sent.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {myJoinRequests.map((r) => (
                <li
                  key={r._id}
                  className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <span className="font-medium">
                    {r.organization?.name ?? "Workspace"}
                  </span>
                  <span
                    className={
                      r.status === "pending"
                        ? "text-amber-700"
                        : r.status === "accepted"
                          ? "text-emerald-700"
                          : "text-slate-500"
                    }
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your workspaces</CardTitle>
          <CardDescription>
            Pulls from Convex memberships — pick one to manage schedules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {myOrgs === undefined ? (
            <p className="text-sm text-slate-500">Loading organizations…</p>
          ) : myOrgs.length === 0 ? (
            <p className="text-sm text-slate-500">
              You are not in any workspace yet — create one below.
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Active workspace</Label>
              <select
                className={selectTriggerClassName("max-w-xl")}
                value={selectedOrg}
                onChange={(e) =>
                  setSelectedOrg(e.target.value as Id<"organizations"> | "")
                }
              >
                <option value="">Select…</option>
                {myOrgs.map(({ organization, membership }) => (
                  <option key={organization._id} value={organization._id}>
                    {organization.name} · {membership.role}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label>New workspace name</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <Button
              type="button"
              disabled={pending}
              onClick={() => void bootstrapOrg()}
            >
              Create &amp; join as manager
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedOrg ? (
        <>
          {isManager && pendingJoinForOrg && pendingJoinForOrg.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Pending join requests</CardTitle>
                <CardDescription>
                  Approve or reject people who asked to join this workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingJoinForOrg.map((r) => (
                  <div
                    key={r._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={r.user?.name ?? "?"}
                        size="sm"
                        imageUrl={r.user?.avatarUrl}
                      />
                      <span className="font-medium text-slate-900">
                        {r.user?.name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          if (!userId) return;
                          void respondJoin({
                            managerId: userId,
                            requestId: r._id,
                            decision: "accept",
                          }).then(() => setActionMsg("Request accepted."));
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => {
                          if (!userId) return;
                          void respondJoin({
                            managerId: userId,
                            requestId: r._id,
                            decision: "reject",
                          }).then(() => setActionMsg("Request rejected."));
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Invite Convex users and set roles. You:{" "}
                <span className="font-medium">{currentRole ?? "…"}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <select
                  className={selectTriggerClassName("min-w-[200px] flex-1 sm:max-w-xs")}
                  value={memberToAdd}
                  onChange={(e) =>
                    setMemberToAdd(e.target.value as Id<"users"> | "")
                  }
                >
                  <option value="">Add teammate…</option>
                  {allUsers?.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <select
                  className={selectTriggerClassName("w-[140px]")}
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "member" | "manager")
                  }
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                </select>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={!memberToAdd || pending}
                  onClick={() =>
                    void addMember({
                      organizationId: selectedOrg as Id<"organizations">,
                      userId: memberToAdd as Id<"users">,
                      role,
                    }).then(() => setActionMsg("Member updated."))
                  }
                >
                  Save member
                </Button>
                {isManager ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      if (!userId) return;
                      void createInvite({
                        managerId: userId,
                        organizationId: selectedOrg as Id<"organizations">,
                        role: "member",
                      }).then(({ code }) =>
                        setActionMsg(
                          `Invite code (single-use): ${code} — share with your teammate.`,
                        ),
                      );
                    }}
                  >
                    Create invite link
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-700 hover:text-red-800"
                  disabled={pending}
                  onClick={() => {
                    if (!userId) return;
                    void leaveOrg({
                      userId,
                      organizationId: selectedOrg as Id<"organizations">,
                    })
                      .then(() => {
                        setSelectedOrg("");
                        setActionMsg("You left this workspace.");
                      })
                      .catch((e) =>
                        setActionErr(
                          e instanceof Error ? e.message : "Could not leave",
                        ),
                      );
                  }}
                >
                  Leave workspace
                </Button>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200/90">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3 text-right">Role</th>
                      <th className="px-4 py-3 text-right">Schedule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {members === undefined ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          Loading roster…
                        </td>
                      </tr>
                    ) : (
                      members.map((m) => (
                        <tr
                          key={m._id}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                name={m.user?.name ?? "?"}
                                size="sm"
                                imageUrl={m.user?.avatarUrl}
                              />
                              <span className="font-medium text-slate-900">
                                {m.user?.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                m.role === "manager"
                                  ? "bg-violet-100 text-violet-900"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {m.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  selectedEmployeeId === m.userId
                                    ? "default"
                                    : "outline"
                                }
                                className="rounded-lg"
                                onClick={() => setSelectedEmployeeId(m.userId)}
                              >
                                Week view
                              </Button>
                              {m.userId !== userId ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="rounded-lg"
                                  asChild
                                >
                                  <Link href={`/shared?peer=${m.userId}`}>
                                    Compare calendars
                                  </Link>
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {selectedEmployeeId && selectedMember?.user ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedMember.user.name}
                    {selectedEmployeeId === userId ? " (you)" : ""}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isManager
                      ? "Drag on empty time to assign a meeting or block."
                      : "Read-only. Use Request time to propose a slot on the shared calendar."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="self-start rounded-lg"
                  onClick={() => setSelectedEmployeeId("")}
                >
                  Close week view
                </Button>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    aria-label="Previous week"
                    onClick={() => setWeekAnchor((w) => addWeeks(w, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    aria-label="Next week"
                    onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <p className="px-2 text-sm font-bold text-slate-900">
                    {weekRangeLabel(weekAnchor)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-lg"
                  onClick={() =>
                    setWeekAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))
                  }
                >
                  Today
                </Button>
              </div>

              <OrgEmployeeWeekCalendar
                weekDates={weekDates}
                employeeName={selectedMember.user.name}
                employeeId={selectedEmployeeId as Id<"users">}
                blocksByDate={blocksByDate}
                dayLoadingEach={dayLoadingEach}
                isManager={isManager}
                managerBlocksByDate={managerBlocksByDate}
                onAssignMeeting={onAssignMeeting}
                onAssignBlock={onAssignBlock}
                teamHeatmap={teamHeatmapPayload}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
