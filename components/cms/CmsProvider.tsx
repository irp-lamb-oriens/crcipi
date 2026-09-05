"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PageContent } from "@/content/types";
import {
  addItemAtPath,
  deepClone,
  getByPath,
  moveItemAtPath,
  removeItemAtPath,
  setByPath,
} from "@/lib/paths";

type SaveState = "idle" | "saving" | "saved" | "error";

interface CmsContextValue {
  authed: boolean;
  email: string | null;
  editMode: boolean;
  content: PageContent;
  saveState: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  setEditMode: (value: boolean) => void;
  getValue: (path: string) => unknown;
  update: (path: string, value: unknown) => void;
  undo: () => void;
  redo: () => void;
  saveNow: () => Promise<void>;
  add: (path: string, item: unknown) => void;
  remove: (path: string, index: number) => void;
  move: (path: string, from: number, to: number) => void;
  logout: () => Promise<void>;
}

const CmsContext = createContext<CmsContextValue | null>(null);

export function useCms(): CmsContextValue {
  const ctx = useContext(CmsContext);
  if (!ctx) {
    throw new Error("useCms must be used within a CmsProvider");
  }
  return ctx;
}

interface Props {
  locale: string;
  initialContent: PageContent;
  children: React.ReactNode;
}

export default function CmsProvider({ locale, initialContent, children }: Props) {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [content, setContent] = useState<PageContent>(initialContent);
  const [editMode, setEditMode] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pastRef = useRef<PageContent[]>([]);
  const futureRef = useRef<PageContent[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check auth status once on mount. Only an admin session enables CMS editing;
  // a member session remains read-only in the public site.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { authed: boolean; role: string | null; email: string | null }) => {
        if (cancelled) return;
        const isAdmin = data.authed && data.role === "admin";
        setAuthed(isAdmin);
        setEmail(isAdmin ? data.email ?? null : null);
      })
      .catch(() => {
        if (!cancelled) setAuthed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(
    (path: string, value: unknown) => {
      setContent((current) => {
        const next = setByPath(current, path, value) as PageContent;
        pastRef.current = [...pastRef.current, deepClone(current)];
        futureRef.current = [];
        setHistoryVersion((v) => v + 1);
        return next;
      });
      dirtyRef.current = true;
      setSaveState("idle");
    },
    []
  );

  const add = useCallback(
    (path: string, item: unknown) => {
      setContent((current) => {
        const next = addItemAtPath(current, path, item) as PageContent;
        pastRef.current = [...pastRef.current, deepClone(current)];
        futureRef.current = [];
        setHistoryVersion((v) => v + 1);
        return next;
      });
      dirtyRef.current = true;
      setSaveState("idle");
    },
    []
  );

  const remove = useCallback(
    (path: string, index: number) => {
      setContent((current) => {
        const next = removeItemAtPath(current, path, index) as PageContent;
        pastRef.current = [...pastRef.current, deepClone(current)];
        futureRef.current = [];
        setHistoryVersion((v) => v + 1);
        return next;
      });
      dirtyRef.current = true;
      setSaveState("idle");
    },
    []
  );

  const move = useCallback(
    (path: string, from: number, to: number) => {
      setContent((current) => {
        const next = moveItemAtPath(current, path, from, to) as PageContent;
        pastRef.current = [...pastRef.current, deepClone(current)];
        futureRef.current = [];
        setHistoryVersion((v) => v + 1);
        return next;
      });
      dirtyRef.current = true;
      setSaveState("idle");
    },
    []
  );

  const undo = useCallback(() => {
    setContent((current) => {
      const past = pastRef.current;
      if (past.length === 0) return current;
      const previous = past[past.length - 1];
      pastRef.current = past.slice(0, -1);
      futureRef.current = [deepClone(current), ...futureRef.current];
      setHistoryVersion((v) => v + 1);
      return previous;
    });
    dirtyRef.current = true;
    setSaveState("idle");
  }, []);

  const redo = useCallback(() => {
    setContent((current) => {
      const future = futureRef.current;
      if (future.length === 0) return current;
      const next = future[0];
      futureRef.current = future.slice(1);
      pastRef.current = [...pastRef.current, deepClone(current)];
      setHistoryVersion((v) => v + 1);
      return next;
    });
    dirtyRef.current = true;
    setSaveState("idle");
  }, []);

  const saveNow = useCallback(async () => {
    setSaveState("saving");
    dirtyRef.current = false;
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, content }),
      });
      if (!res.ok) throw new Error("save_failed");
      setSaveState("saved");
    } catch {
      dirtyRef.current = true;
      setSaveState("error");
    }
  }, [locale, content]);

  // Autosave (debounced) whenever content changes while authenticated.
  useEffect(() => {
    if (!authed || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveNow();
    }, 1200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [content, authed, saveNow]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
    setEmail(null);
    setEditMode(false);
  }, []);

  const getValue = useCallback(
    (path: string) => getByPath(content, path),
    [content]
  );

  const value: CmsContextValue = useMemo(
    () => ({
      authed,
      email,
      editMode,
      content,
      saveState,
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
      setEditMode,
      getValue,
      update,
      undo,
      redo,
      saveNow,
      add,
      remove,
      move,
      logout,
    }),
    [
      authed,
      email,
      editMode,
      content,
      saveState,
      historyVersion,
      getValue,
      update,
      undo,
      redo,
      saveNow,
      add,
      remove,
      move,
      logout,
    ]
  );

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}