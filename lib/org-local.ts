const KEY = "chronosync_org_id";

export function getStoredOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setStoredOrgId(id: string) {
  window.localStorage.setItem(KEY, id);
}

export function clearStoredOrgId() {
  window.localStorage.removeItem(KEY);
}
