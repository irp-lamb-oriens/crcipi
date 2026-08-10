import { NextRequest, NextResponse } from "next/server";
import { validateSubmission } from "@/lib/validators";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { site } from "@/content/site";

// POST /api/submit
// Validates the volunteer/interest form server-side, stores it in Firestore
// (collection: submissions), and sends an internal notification email.
//
// Email notifications are a PLACEHOLDER:
// TODO: implement sendNotificationEmail() with the team's chosen provider
// (e.g. Resend). Read credentials from env vars, never hardcode them.
async function sendNotificationEmail(submission: Record<string, unknown>): Promise<void> {
  // Placeholder. Wire to an email provider before launch.
  // Example with Resend:
  //   const resend = new Resend(process.env.RESEND_API_KEY);
  //   await resend.emails.send({
  //     from: "CR-CIPI <no-reply@crcipi.org>",
  //     to: site.notifyEmails,
  //     subject: "New CR-CIPI volunteer application",
  //     html: buildNotificationHtml(submission),
  //   });
  void submission;
}

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

  try {
    const docRef = db.collection("submissions").doc();

    await db.runTransaction(async (transaction) => {
      transaction.set(docRef, {
        ...data,
        consent: data.consent,
        createdAt: FieldValue.serverTimestamp(),
        submissionId: docRef.id,
        site: "crcipi.org",
      });
    });

    // Best-effort notification; never fail the request if email fails.
    try {
      await sendNotificationEmail({ ...data, submissionId: docRef.id });
    } catch {
      // Log server-side; submission is already stored.
      console.error("CR-CIPI notification email failed for", docRef.id);
    }

    return NextResponse.json({ ok: true, id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("CR-CIPI submission storage failed:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}