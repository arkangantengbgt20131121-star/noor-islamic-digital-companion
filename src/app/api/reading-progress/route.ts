import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { readingProgress } from "@/db/schema";
import { getCurrentUser } from "@/lib/server-auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to view reading progress." }, { status: 401 });
  try {
    const progress = await db.select().from(readingProgress).where(eq(readingProgress.userId, user.id)).orderBy(desc(readingProgress.updatedAt));
    return Response.json({ progress });
  } catch (error) {
    console.error("Reading progress fetch failed", error);
    return Response.json({ error: "Reading progress could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to save reading progress." }, { status: 401 });
  let body: { contentType?: unknown; contentId?: unknown; progress?: unknown; position?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const contentId = typeof body.contentId === "string" ? body.contentId.slice(0, 120) : "";
  const progress = typeof body.progress === "number" ? Math.round(body.progress) : 0;
  const position = typeof body.position === "number" ? Math.floor(body.position) : 0;
  if (!["quran", "library", "lesson"].includes(contentType) || !contentId || contentId.length > 120) {
    return Response.json({ error: "Invalid reading position." }, { status: 400 });
  }
  if (!Number.isFinite(progress) || progress < 0 || progress > 100 || !Number.isFinite(position) || position < 0) {
    return Response.json({ error: "Reading progress is outside the allowed range." }, { status: 400 });
  }
  const now = new Date();
  try {
    await db.insert(readingProgress).values({ userId: user.id, contentType, contentId, progress, position, updatedAt: now })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.contentType, readingProgress.contentId],
        set: { progress, position, updatedAt: now },
      });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Reading progress save failed", error);
    return Response.json({ error: "Reading progress could not be saved." }, { status: 500 });
  }
}
