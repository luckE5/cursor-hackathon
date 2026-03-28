"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GuestPrompt({
  title = "Sign in to continue",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <Card className="mx-auto w-full max-w-md border-slate-200/90 shadow-lg shadow-indigo-500/5">
      <CardHeader className="text-center sm:text-left">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="w-full sm:w-auto">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
