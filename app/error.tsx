"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-destructive">Something went wrong</p>
      <h1 className="max-w-md text-xl font-semibold tracking-tight">
        We hit an unexpected error while rendering this page.
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error.message || "An unknown error occurred."}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
