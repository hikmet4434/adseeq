import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { fetchMedia } from "@/lib/media-proxy";
import { hizSiniriAsimi } from "@/lib/rate-limit";

export async function GET(request: Request, context: { params: Promise<{ creativeId: string }> }) {
  const limited = hizSiniriAsimi(request, "medya");
  if (limited) return limited;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { creativeId } = await context.params;
  const creative = await prisma.adCreative.findUnique({ where: { id: creativeId }, select: { url: true, type: true } });
  if (!creative || creative.type !== "VIDEO") return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });

  try {
    const upstream = await fetchMedia(creative.url, request.headers.get("range"));
    if (!upstream.ok && upstream.status !== 206) {
      await upstream.body?.cancel();
      return NextResponse.json({ error: "MEDIA_UNAVAILABLE" }, { status: 502 });
    }

    const headers = new Headers({
      "content-type": upstream.headers.get("content-type") || "video/mp4",
      "accept-ranges": upstream.headers.get("accept-ranges") || "bytes",
      "cache-control": "private, max-age=300",
      "content-disposition": "inline",
      "x-content-type-options": "nosniff"
    });
    for (const name of ["content-length", "content-range"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return NextResponse.json({ error: "MEDIA_UNAVAILABLE" }, { status: 502 });
  }
}
