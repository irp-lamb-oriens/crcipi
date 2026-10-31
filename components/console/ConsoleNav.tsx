"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./useSession";
import styles from "./Console.module.scss";

type Area = "admin" | "member";

// Six items at most per area. Older admin screens stay reachable from the
// module that owns them (`also` keeps the right item highlighted).
const LINKS: Record<Area, { href: string; label: string; also?: string[] }[]> = {
  admin: [
    { href: "/admin/dashboard", label: "Overview" },
    { href: "/admin/reviews", label: "Reviews", also: ["/admin/verification"] },
    { href: "/admin/members", label: "Members", also: ["/admin/providers"] },
    { href: "/admin/jobs", label: "Jobs" },
    { href: "/admin/articles", label: "Articles" },
    { href: "/admin/users", label: "Users" },
  ],
  member: [
    { href: "/account", label: "Overview" },
    { href: "/account/businesses", label: "My businesses" },
    { href: "/account/leads", label: "Leads" },
    { href: "/account/verification", label: "Trust seal" },
    { href: "/account/jobs", label: "Jobs" },
    { href: "/account/articles", label: "Articles" },
  ],
};

// Top bar shared by every console page. Renders only for the role that owns
// the area, so the sign-in page (/admin) and gated pages stay chrome-free for
// everyone else.
export default function ConsoleNav({ area }: { area: Area }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();

  if (session.status !== area) return null;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/");
  }

  return (
    <aside className={styles.side}>
      <div className={styles.sideTop}>
        <Link href={area === "admin" ? "/admin/dashboard" : "/account"} className={styles.brand}>
          CR-CIPI
          <span>{area === "admin" ? "Cámara" : "Miembros"}</span>
        </Link>
        <nav aria-label="Console" className={styles.navLinks}>
          {LINKS[area].map((link, i) => {
            const active =
              link.href === "/account"
                ? pathname === "/account"
                : [link.href, ...(link.also ?? [])].some(
                    (href) => pathname === href || pathname.startsWith(`${href}/`)
                  );
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.navIndex} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className={styles.sideFoot}>
        <Link
          href={area === "admin" ? "/admin/help" : "/account/help"}
          className={styles.helpLink}
          aria-current={pathname.endsWith("/help") ? "page" : undefined}
        >
          <span aria-hidden="true">?</span> Guides
        </Link>
        {session.email ? <span className={styles.who}>{session.email}</span> : null}
        <Link href="/en">View site</Link>
        <button type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
