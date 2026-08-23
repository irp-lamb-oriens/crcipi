"use client";

import { useCms } from "./CmsProvider";
import EditableText from "./EditableText";
import styles from "./EditableList.module.scss";

export interface Field {
  path: string;
  as?: React.ElementType;
  multiline?: boolean;
}

interface Props {
  path: string;
  fields: Field[];
  addTemplate: Record<string, string>;
  addLabel: string;
  className?: string;
  renderItem?: (
    item: Record<string, unknown>,
    index: number,
    controls: React.ReactNode
  ) => React.ReactNode;
}

function getPath(root: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[part];
  }, root);
}

// Editable array wrapper.
//
// Reads the array at `path` from CMS state, renders each item via `renderItem`
// (or stacks `fields` by default), and attaches per-item reorder/remove
// controls plus an "add" button that only appear in edit mode.
export default function EditableList({
  path,
  fields,
  addTemplate,
  addLabel,
  className,
  renderItem,
}: Props) {
  const { editMode, content, add, remove, move } = useCms();

  const value = getPath(content, path);
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  const controlsFor = (index: number) =>
    editMode ? (
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={() => move(path, index, index - 1)}
          disabled={index === 0}
          aria-label="Move up"
        >
          &uarr;
        </button>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={() => move(path, index, index + 1)}
          disabled={index === items.length - 1}
          aria-label="Move down"
        >
          &darr;
        </button>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={() => remove(path, index)}
          aria-label="Remove"
        >
          &times;
        </button>
      </div>
    ) : null;

  return (
    <div className={`${styles.list} ${className ?? ""}`}>
      {items.map((item, index) => {
        if (renderItem) {
          return renderItem(item, index, controlsFor(index));
        }

        return (
          <div key={index} className={styles.item}>
            {fields.map((field) => (
              <EditableText
                key={field.path}
                path={`${path}.${index}.${field.path}`}
                as={field.as ?? "div"}
                multiline={field.multiline}
              />
            ))}
            {controlsFor(index)}
          </div>
        );
      })}

      {editMode ? (
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => add(path, { ...addTemplate })}
        >
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}