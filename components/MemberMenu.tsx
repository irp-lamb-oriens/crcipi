"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/content/types";
import styles from "./MemberMenu.module.scss";

type AuthState = { loaded: boolean; role: string | null };

const LABELS: Record<Locale, { guest: string; member: string; admin: string }> = {
  en: {
    guest: "Register your business",
    member: "Manage my business",
    admin: "Admin",
  },
  es: {
    guest: "Registra tu empresa",
    member: "Gestionar mi empresa",
    admin: "Admin",
  },
};

// Reflects the member session in the header: signed-out visitors see a member
// sign in link; signed-in members see a shortcut to their business dashboard.
export default function MemberMenu({ locale }: { locale: Locale }) {
  const [state, setState] = useState<AuthState>({ loaded: false, role: null });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { authed: boolean; role: string | null }) => {
        if (!cancelled) {
          setState({ loaded: true, role: data.authed ? data.role : null });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ loaded: true, role: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state.loaded) return null;

  const labels = LABELS[locale];

  if (state.role === "admin") {
    return (
      <Link href="/admin/providers" className={styles.link}>
        {labels.admin}
      </Link>
    );
  }

  if (state.role === "member") {
    return (
      <Link href="/account" className={styles.link}>
        {labels.member}
      </Link>
    );
  }

  return (
    <Link href="/signup" className={styles.link}>
      {labels.guest}
    </Link>
  );
}