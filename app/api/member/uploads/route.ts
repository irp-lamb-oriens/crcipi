import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { publicMediaUrl, storeUpload } from "@/lib/storage";

// POST /api/member/uploads  (multipart: file, kind = "document" | "image")
//
// Signed-in users only. Files upload the moment they're chosen in the UI.
//   document -> private/kyc/{userId}/...  (reachable only via signed URLs)
//   image    -> public/images/{userId}/... (served by /api/media/...)
// The returned `path` is what forms submit later; routes that accept a path
// re-check that it lives under the caller's own folder.

const UPLOAD_LIMIT = { max: 30, windowMs: 10 * 60 * 1000, baseBackoffMs: 30 * 1000 };

const STATUS: Record<string, number> = {
  disabled: 503,
  too_large: 413,
  empty: 422,
  unsupported_type: 415,
};

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", 401);

  const limit = await rateLimit(`upload:${user.userId}`, UPLOAD_LIMIT);
  if (!limit.ok) return fail("rate_limited", 429);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("invalid_form", 400);
  }

  const file = form.get("file");
  const kind = form.get("kind") === "image" ? "image" : "document";
  if (!(file instanceof File)) return fail("missing_file", 422);

  try {
    const result = await storeUpload(file, {
      kind,
      visibility: kind === "image" ? "public" : "private",
      folder: kind === "image" ? `images/${user.userId}` : `kyc/${user.userId}`,
    });
    if (!result.ok) return fail(result.error, STATUS[result.error] ?? 400);

    return ok(
      {
        file: {
          ...result.file,
          url: kind === "image" ? publicMediaUrl(result.file.path) : undefined,
        },
      },
      201
    );
  } catch (error) {
    console.error("upload failed", error);
    return fail("storage_failed", 500);
  }
}
