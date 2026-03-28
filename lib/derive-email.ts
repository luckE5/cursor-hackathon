export function makeLocalUserEmail(displayName: string): string {
  const base = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 10)
      : `${Date.now()}`;
  const safe = base || "user";
  return `${safe}-${suffix}@users.chronosync.local`;
}
