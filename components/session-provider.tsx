"use client";

import type { Id } from "@/convex/_generated/dataModel";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clearStoredUserId, getStoredUserId, setStoredUserId } from "@/lib/auth-local";

type SessionValue = {
  userId: Id<"users"> | null;
  ready: boolean;
  setUserId: (id: Id<"users"> | null) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<Id<"users"> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = getStoredUserId();
    if (id) setUserIdState(id as Id<"users">);
    setReady(true);
  }, []);

  const setUserId = useCallback((id: Id<"users"> | null) => {
    if (id) setStoredUserId(id);
    else clearStoredUserId();
    setUserIdState(id);
  }, []);

  const signOut = useCallback(() => {
    clearStoredUserId();
    setUserIdState(null);
  }, []);

  const value = useMemo(
    () => ({ userId, ready, setUserId, signOut }),
    [userId, ready, setUserId, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
