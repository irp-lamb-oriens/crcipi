import { NextRequest } from "next/server";
import { readPublicFile } from "@/lib/storage";

// GET /api/media/public/... — streams a public image from private storage.
// Object names are random UUIDs, so responses are safely immutable.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const file = await readPublicFile(path.join("/"));
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
