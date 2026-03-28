"use client";

import type { CalBlock } from "@/lib/schedule-cal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ScheduleBlockDetailDialog({
  open,
  onOpenChange,
  block,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: CalBlock | null;
  /** Optional — planner opens edit dialog from here. */
  onEdit?: () => void;
}) {
  if (!block) return null;

  const link = block.meetingLink?.trim();
  const isMeeting = block.type === "meeting";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[1.35rem] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left">
            {block.label?.trim() ||
              (block.type === "free"
                ? "Free time"
                : block.type === "meeting"
                  ? "Meeting"
                  : "Block")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-white/50 bg-white/40 px-4 py-3 shadow-inner shadow-white/30 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Time
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {block.startTime} – {block.endTime}
            </p>
            <p className="mt-2 text-xs font-medium capitalize text-slate-500">
              {block.type}
            </p>
          </div>
          {block.description?.trim() ? (
            <div className="rounded-xl border border-white/45 bg-white/35 px-4 py-3 backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Description
              </p>
              <p className="mt-1 whitespace-pre-wrap text-slate-700">
                {block.description.trim()}
              </p>
            </div>
          ) : isMeeting ? (
            <p className="text-slate-500">No description provided.</p>
          ) : null}
          {link ? (
            <div className="rounded-xl border border-white/45 bg-white/35 px-4 py-3 backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Meeting link
              </p>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block truncate font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-violet-700"
              >
                {link}
              </a>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {link ? (
            <Button className="w-full sm:w-auto" asChild>
              <a href={link} target="_blank" rel="noopener noreferrer">
                Join meeting
              </a>
            </Button>
          ) : null}
          {onEdit ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                onOpenChange(false);
                onEdit();
              }}
            >
              Edit block
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
