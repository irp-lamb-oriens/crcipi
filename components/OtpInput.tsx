"use client";

import { forwardRef } from "react";
import styles from "./OtpInput.module.scss";

// Six drawn slots over one real input, so paste, autofill from SMS/email
// (autocomplete="one-time-code") and screen readers all see a single field.
const OtpInput = forwardRef<
  HTMLInputElement,
  {
    id: string;
    value: string;
    onChange: (digits: string) => void;
    invalid?: boolean;
    describedBy?: string;
    disabled?: boolean;
  }
>(function OtpInput({ id, value, onChange, invalid, describedBy, disabled }, ref) {
  return (
    <div className={styles.otp}>
      <input
        ref={ref}
        id={id}
        className={styles.otpInput}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
      />
      <div className={styles.slots} aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={`${styles.slot} ${value[i] ? styles.filled : ""} ${i === value.length ? styles.caret : ""} ${invalid ? styles.bad : ""}`}
          >
            {value[i] ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
});

export default OtpInput;
