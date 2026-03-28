import type { Metadata } from "next";
import { AuthPageClient } from "@/components/auth/auth-page-client";
import type { AuthTab } from "@/components/auth/auth-tabs";

export const metadata: Metadata = {
  title: "Sign in · Chronosync",
  description: "Log in or create your Chronosync account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: AuthTab = tab === "signup" ? "signup" : "login";
  return <AuthPageClient initialTab={initialTab} />;
}
