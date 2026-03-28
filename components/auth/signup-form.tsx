"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/session-provider";
import { AuthPushButton } from "@/components/auth/auth-push-button";
import styles from "./auth.module.css";

export function SignupForm() {
  const createUser = useMutation(api.users.createUser);
  const { setUserId } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const userId = await createUser({
        name: name.trim() || "Member",
        email,
        password,
      });
      setUserId(userId);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(e) => void onSubmit(e)} noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="auth-signup-name"
          className="text-sm font-semibold text-slate-700"
        >
          Name
        </label>
        <input
          id="auth-signup-name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.authInput}
          placeholder="Alex Morgan"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="auth-signup-email"
          className="text-sm font-semibold text-slate-700"
        >
          Email
        </label>
        <input
          id="auth-signup-email"
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
          htmlFor="auth-signup-password"
          className="text-sm font-semibold text-slate-700"
        >
          Password
        </label>
        <input
          id="auth-signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.authInput}
          placeholder="At least 6 characters"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="auth-signup-confirm"
          className="text-sm font-semibold text-slate-700"
        >
          Confirm password
        </label>
        <input
          id="auth-signup-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={styles.authInput}
          placeholder="Repeat password"
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
        {busy ? "Creating account…" : "Create account"}
      </AuthPushButton>
    </form>
  );
}
