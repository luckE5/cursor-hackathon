import { format } from "date-fns";

export function todayISODate(): string {
  return format(new Date(), "yyyy-MM-dd");
}
