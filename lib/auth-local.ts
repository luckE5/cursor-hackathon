const KEY = "chronosync_user_id";

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setStoredUserId(id: string) {
  window.localStorage.setItem(KEY, id);
}

export function clearStoredUserId() {
  window.localStorage.removeItem(KEY);
}
