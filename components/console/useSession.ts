"use client";

import { useEffect, useState } from "react";
import type { AdminPermission } from "@/lib/permissions";

export interface ConsoleSession {
  status: "loading" | "anonymous" | "member" | "admin";
  email: string | null;
  name: string | null;
  permissions: AdminPermission[];
}

const LOADING: ConsoleSession = { status: "loading", email: null, name: null, permissions: [] };
const ANONYMOUS: ConsoleSession = { status: "anonymous", email: null, name: null, permissions: [] };

// One shared read of /api/auth/me for every console page (dreams.md noted the
// cost of re-inlining this fetch per page).
export function useSession(): ConsoleSession {
  const [session, setSession] = useState<ConsoleSession>(LOADING);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then(
        (data: {
          authed: boolean;
          role: string | null;
          email: string | null;
          name?: string;
          permissions?: AdminPermission[];
        }) => {
          if (cancelled) return;
          if (!data.authed) return setSession(ANONYMOUS);
          setSession({
            status: data.role === "admin" ? "admin" : "member",
            email: data.email,
            name: data.name ?? null,
            permissions: data.permissions ?? [],
          });
        }
      )
      .catch(() => {
        if (!cancelled) setSession(ANONYMOUS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}
