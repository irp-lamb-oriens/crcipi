"use client";

import Link from "next/link";
import type { ConsoleSession } from "./useSession";
import styles from "./Console.module.scss";

// Renders the loading / wrong-role states for a console page. Returns null when
// the session matches the required role, so pages can write:
//   const gate = <ConsoleGate session={s} role="admin" />; if (s.status !== "admin") return gate;
export default function ConsoleGate({
  session,
  role,
}: {
  session: ConsoleSession;
  role: "admin" | "member";
}) {
  if (session.status === role) return null;

  if (session.status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.gate}>
          <p className={styles.hint}>Loading…</p>
        </div>
      </main>
    );
  }

  const signedOut = session.status === "anonymous";
  return (
    <main className={styles.page}>
      <div className={styles.gate}>
        <h1 className={styles.title}>
          {signedOut
            ? "Sign in to continue"
            : role === "admin"
              ? "This area is for administrators"
              : "This area is for members"}
        </h1>
        <p className={styles.hint}>
          {signedOut
            ? "Use the email you registered with. We'll send you a one-time code."
            : "You're signed in with a different kind of account."}
        </p>
        <Link
          className={styles.primary}
          href={signedOut ? "/admin" : session.status === "admin" ? "/admin/dashboard" : "/account"}
        >
          {signedOut ? "Sign in" : "Go to my dashboard"}
        </Link>
      </div>
    </main>
  );
}
