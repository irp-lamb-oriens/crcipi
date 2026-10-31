"use client";

import { useCms } from "@/components/cms/CmsProvider";
import EditableText from "@/components/cms/EditableText";
import styles from "./ScrollWords.module.scss";

interface Props {
  path: string;
  text: string;
  as?: React.ElementType;
  className?: string;
}

// Manifesto text that brightens line by line as it scrolls into place
// (CSS scroll-driven, per word). Screen readers get one intact sentence;
// the split copy is aria-hidden. In CMS edit mode it is plain editable text.
export default function ScrollWords({ path, text, as: Tag = "p", className }: Props) {
  const { editMode, getValue } = useCms();
  const value = String(getValue(path) ?? text);

  if (editMode) {
    return (
      <EditableText path={path} as={Tag} className={className}>
        {value}
      </EditableText>
    );
  }

  const words = value.split(/\s+/).filter(Boolean);
  return (
    <Tag className={className}>
      <span className="srOnly">{value}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <span key={i} className={styles.word}>
            {word}{" "}
          </span>
        ))}
      </span>
    </Tag>
  );
}
