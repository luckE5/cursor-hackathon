"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/session-provider";
import { AuthPushButton } from "@/components/auth/auth-push-button";
import styles from "./auth.module.css";

export function LoginForm() {
  const authenticateUser = useMutation(api.users.authenticateUser);
  const { setUserId } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const userId = await authenticateUser({ email, password });
      setUserId(userId);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(e) => void onSubmit(e)} noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="auth-login-email"
          className="text-sm font-semibold text-slate-700"
        >
          Email
        </label>
        <input
          id="auth-login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.authInput}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="auth-login-password"
          className="text-sm font-semibold text-slate-700"
        >
          Password
        </label>
        <input
          id="auth-login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.authInput}
          placeholder="••••••••"
        />
      </div>
      {error ? (
        <p
          className="rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2 text-center text-sm font-medium text-red-700 backdrop-blur-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <AuthPushButton type="submit" variant="primary" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </AuthPushButton>
    </form>
  );
}
