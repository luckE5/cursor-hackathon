"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const url =
      process.env.NEXT_PUBLIC_CONVEX_URL ??
      "https://build-placeholder.invalid.convex.cloud";
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      console.warn(
        "NEXT_PUBLIC_CONVEX_URL is not set — using a build placeholder; set a real URL for the app to work.",
      );
    }
    return new ConvexReactClient(url);
  }, []);

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
