"use client";

import { useEffect, useRef } from "react";
import { useCms } from "./CmsProvider";
import "./cms.scss";

interface Props {
  path: string;
  as?: React.ElementType;
  children?: React.ReactNode;
  multiline?: boolean;
  className?: string;
  [key: string]: unknown;
}

// Inline editable element.
//
// The committed CMS value is rendered as React text so non-edit mode is
// server-rendered normally. In edit mode the element becomes contenteditable;
// typing is committed ONLY on blur so React does not reset the caret while
// the user types. While the field is not focused we keep the DOM text in sync
// with the committed value so undo/redo and live content propagate.
export default function EditableText({
  path,
  as: Tag = "span",
  children,
  multiline = false,
  className,
  ...rest
}: Props) {
  const { editMode, getValue, update } = useCms();
  const ref = useRef<HTMLElement | null>(null);
  const focusedRef = useRef(false);

  const value = getValue(path);
  const fallback =
    typeof children === "string"
      ? children
      : children == null
        ? ""
        : String(children);
  const text = value == null ? fallback : String(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!focusedRef.current && el.textContent !== text) {
      el.textContent = text;
    }
  }, [text, editMode]);

  const handleFocus = () => {
    focusedRef.current = true;
  };

  const handleBlur = () => {
    focusedRef.current = false;
    const el = ref.current;
    if (!el) return;
    const next = (el.textContent ?? "").trim();
    if (next !== text) {
      update(path, next);
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const plain = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, plain);
  };

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      className={`${className ?? ""} cmsEditable`}
      contentEditable={editMode}
      suppressContentEditableWarning
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPaste={handlePaste}
      {...rest}
    >
      {text}
    </Tag>
  );
}