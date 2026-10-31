import { NextRequest, NextResponse } from "next/server";
import { validateSubmission } from "@/lib/validators";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createUser, getUserByEmail } from "@/lib/auth";
import { recordEvent } from "@/lib/stats";
import { sendInternalNotification, sendVolunteerConfirmation } from "./email";

// POST /api/submit
// Validates the volunteer/interest form server-side, stores it in Firestore
// (collection: submissions), and sends an email confirmation to the volunteer
// plus an internal notification to the team.
//
// Email sending is best-effort: a failure never fails the request, since the
// submission is already stored. Credentials come from env vars (SMTP_USER /
// SMTP_PASS), never hardcoded.

export async function POST(request: NextRequest) {
  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const result = validateSubmission(raw);
  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });
  }

  const data = result.data;

  // Firestore rejects `undefined` values. The validator returns `undefined`
  // for empty optional fields (company, phone, linkedin, sourcePage, language,
  // utm), so strip them before writing.
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  try {
    const docRef = db.collection("submissions").doc();

    await db.runTransaction(async (transaction) => {
      transaction.set(docRef, {
        ...cleanData,
        consent: data.consent,
        createdAt: FieldValue.serverTimestamp(),
        submissionId: docRef.id,
        site: "crcipi.org",
      });
    });

    // Filling the volunteer form creates the login account (role member) so
    // this person can sign in later. Idempotent and non-destructive: an
    // existing account (e.g. an admin) is never overwritten or demoted.
    try {
      const existing = await getUserByEmail(data.email);
      if (!existing) {
        await createUser({
          email: data.email,
          name: `${data.firstName} ${data.lastName}`.trim(),
          role: "member",
        });
        recordEvent("member_signup");
      }
    } catch (error) {
      console.error("CR-CIPI volunteer account creation failed for", data.email, error);
    }

    // Best-effort emails; never fail the request if sending fails.
    try {
      await sendVolunteerConfirmation(data);
    } catch (error) {
      console.error("CR-CIPI volunteer confirmation email failed for", docRef.id, error);
    }

    try {
      await sendInternalNotification(data);
    } catch (error) {
      console.error("CR-CIPI internal notification email failed for", docRef.id, error);
    }

    return NextResponse.json({ ok: true, id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("CR-CIPI submission storage failed:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}