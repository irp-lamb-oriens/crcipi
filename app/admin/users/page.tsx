"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from "@/lib/permissions";
import styles from "./page.module.scss";

type Participant = {
  id: string;
  email: string;
  name: string;
  status: "active" | "suspended";
  createdAt: number;
};

type Admin = {
  id: string;
  email: string;
  name: string;
  permissions: AdminPermission[];
  status: "active" | "suspended";
};

type ProviderRef = {
  id: string;
  name: string;
  ownerId: string | null;
  approved: boolean;
};

type Viewer = {
  canManagePermissions: boolean;
  canManageUsers: boolean;
};

type Overview = {
  participants: Participant[];
  admins: Admin[];
  providers: ProviderRef[];
  viewer: Viewer;
};

const PERMISSION_LABELS: Record<AdminPermission, string> = {
  "content.manage": "Manage content",
  "providers.manage": "Manage providers",
  "ratings.moderate": "Moderate reviews",
  "users.manage": "Manage users",
  "permissions.manage": "Manage permissions",
};

export default function AdminUsersPage() {
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tab, setTab] = useState<"participants" | "admins">("participants");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) return;
    const data = await res.json();
    setOverview(data as Overview);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { authed: boolean; role: string | null }) =>
        setRole(data.authed ? data.role : null)
      )
      .catch(() => setRole(null));
  }, []);

  useEffect(() => {
    if (role === "admin") void load();
  }, [role, load]);

  async function updateUser(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error === "self_protected" ? "You cannot change your own access." : "Update failed.");
        return;
      }
      setNotice("Saved.");
      void load();
    } catch {
      setError("Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function assignOwner(providerId: string, ownerId: string | null) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId }),
      });
      if (!res.ok) {
        setError("Assignment failed.");
        return;
      }
      setNotice("Access updated.");
      void load();
    } catch {
      setError("Assignment failed.");
    } finally {
      setBusy(false);
    }
  }

  if (role === undefined) {
    return (
      <main className={styles.main}>
        <p className={styles.hint}>Loading…</p>
      </main>
    );
  }

  // Members and anonymous visitors never see the admin console.
  if (role !== "admin") {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.hint}>
            {role === null ? (
              <>
                You need to sign in first. <a href="/admin">Sign in</a>.
              </>
            ) : (
              <>
                This area is for administrators.{" "}
                <a href="/account">Go to my business</a>.
              </>
            )}
          </p>
        </div>
      </main>
    );
  }

  const participants = overview?.participants ?? [];
  const admins = overview?.admins ?? [];
  const providers = overview?.providers ?? [];
  const viewer = overview?.viewer;

  const ownersById = new Map<string, ProviderRef[]>();
  for (const provider of providers) {
    if (!provider.ownerId) continue;
    const list = ownersById.get(provider.ownerId) ?? [];
    list.push(provider);
    ownersById.set(provider.ownerId, list);
  }

  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Participants & permissions</h1>
            <p className={styles.subtitle}>
              Manage members, their business access, and admin permissions.
            </p>
          </div>
          <a className={styles.back} href="/admin/providers">
            Manage providers
          </a>
        </header>

        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "participants"}
            className={`${styles.tab} ${tab === "participants" ? styles.tabActive : ""}`}
            onClick={() => setTab("participants")}
          >
            Participants
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "admins"}
            className={`${styles.tab} ${tab === "admins" ? styles.tabActive : ""}`}
            onClick={() => setTab("admins")}
          >
            Admins & permissions
          </button>
        </div>

        {tab === "participants" ? (
          <section className={styles.pane}>
            <h2 className={styles.paneTitle}>All participants</h2>

            {participants.length === 0 ? (
              <p className={styles.hint}>No participants yet.</p>
            ) : (
              <ul className={styles.list}>
                {participants.map((participant) => {
                  const owned = ownersById.get(participant.id) ?? [];
                  return (
                    <li key={participant.id} className={styles.person}>
                      <div className={styles.personHead}>
                        <div>
                          <span className={styles.personName}>
                            {participant.name || participant.email}
                          </span>
                          <span className={styles.personEmail}>{participant.email}</span>
                        </div>
                        <div className={styles.personMeta}>
                          {participant.status === "suspended" ? (
                            <span className={styles.badgeMuted}>Suspended</span>
                          ) : null}
                          {viewer?.canManageUsers ? (
                            <button
                              type="button"
                              className={styles.smallButton}
                              disabled={busy}
                              onClick={() =>
                                void updateUser(participant.id, {
                                  status: participant.status === "active" ? "suspended" : "active",
                                })
                              }
                            >
                              {participant.status === "active" ? "Suspend" : "Activate"}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className={styles.accessBlock}>
                        <span className={styles.accessLabel}>Business access</span>
                        {owned.length === 0 ? (
                          <span className={styles.hint}>No businesses assigned.</span>
                        ) : (
                          <ul className={styles.accessList}>
                            {owned.map((provider) => (
                              <li key={provider.id} className={styles.accessRow}>
                                <span>{provider.name}</span>
                                {provider.approved ? null : (
                                  <span className={styles.badgeMuted}>Pending</span>
                                )}
                                <button
                                  type="button"
                                  className={styles.danger}
                                  disabled={busy}
                                  onClick={() => void assignOwner(provider.id, null)}
                                >
                                  Revoke
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          <section className={styles.pane}>
            <h2 className={styles.paneTitle}>Admins & permissions</h2>

            {admins.length === 0 ? (
              <p className={styles.hint}>No admins yet.</p>
            ) : (
              <ul className={styles.list}>
                {admins.map((admin) => (
                  <li key={admin.id} className={styles.person}>
                    <div className={styles.personHead}>
                      <div>
                        <span className={styles.personName}>
                          {admin.name || admin.email}
                        </span>
                        <span className={styles.personEmail}>{admin.email}</span>
                      </div>
                      {admin.status === "suspended" ? (
                        <span className={styles.badgeMuted}>Suspended</span>
                      ) : null}
                    </div>

                    {viewer?.canManagePermissions ? (
                      <fieldset className={styles.perms}>
                        <legend className={styles.accessLabel}>Permissions</legend>
                        {ADMIN_PERMISSIONS.map((permission) => (
                          <label key={permission} className={styles.permRow}>
                            <input
                              type="checkbox"
                              checked={admin.permissions.includes(permission)}
                              disabled={busy}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...admin.permissions, permission]
                                  : admin.permissions.filter((p) => p !== permission);
                                void updateUser(admin.id, { permissions: next });
                              }}
                            />
                            <span>{PERMISSION_LABELS[permission]}</span>
                          </label>
                        ))}
                      </fieldset>
                    ) : (
                      <div className={styles.accessBlock}>
                        <span className={styles.accessLabel}>Permissions</span>
                        <ul className={styles.permReadOnly}>
                          {admin.permissions.length === 0 ? (
                            <li className={styles.hint}>No permissions.</li>
                          ) : (
                            admin.permissions.map((permission) => (
                              <li key={permission}>{PERMISSION_LABELS[permission]}</li>
                            ))
                          )}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className={styles.pane}>
          <h2 className={styles.paneTitle}>Provider ownership</h2>
          <ul className={styles.list}>
            {providers.map((provider) => {
              const ownerEmail =
                participants.find((p) => p.id === provider.ownerId)?.email ??
                admins.find((a) => a.id === provider.ownerId)?.email;
              return (
                <li key={provider.id} className={styles.ownerRow}>
                  <div>
                    <span className={styles.personName}>{provider.name}</span>
                    <span className={styles.personEmail}>
                      {ownerEmail ? `Owner: ${ownerEmail}` : "No owner"}
                    </span>
                    {!provider.approved ? (
                      <span className={styles.badgeMuted}>Pending</span>
                    ) : null}
                  </div>
                  <select
                    className={styles.select}
                    value={provider.ownerId ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      void assignOwner(
                        provider.id,
                        e.target.value === "" ? null : e.target.value
                      )
                    }
                  >
                    <option value="">No owner</option>
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name || participant.email}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}