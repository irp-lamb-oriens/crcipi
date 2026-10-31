"use client";

import { useEffect } from "react";
import OffTheMap from "@/components/system/OffTheMap";

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <OffTheMap variant="error" onRetry={reset} />;
}
