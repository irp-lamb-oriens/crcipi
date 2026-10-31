"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DirectoryContent } from "@/content/types";
import ReviewModal from "./ReviewModal";
import styles from "./ContactForm.module.scss";

// "Leave a review" on a provider profile. Opens by itself when the page is
// reached from a won-lead review request (?review=1).
export default function ProfileReviewButton({
  providerId,
  providerName,
  label,
  copy,
}: {
  providerId: string;
  providerName: string;
  label: string;
  copy: DirectoryContent["rating"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("review") === "1") setOpen(true);
  }, []);

  return (
    <>
      <button type="button" className={styles.ghost} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <ReviewModal
          providerId={providerId}
          providerName={providerName}
          copy={copy}
          onClose={() => setOpen(false)}
          onSubmitted={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
