import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { learningLessons, learningProgress } from "@/db/schema";
import { getCurrentUser } from "@/lib/server-auth";
import { LESSONS } from "@/lib/content";

export async function GET() {
  try {
    await db.insert(learningLessons).values(LESSONS).onConflictDoNothing();
    const user = await getCurrentUser();
    const [lessons, progress] = await Promise.all([
      db.select().from(learningLessons).orderBy(asc(learningLessons.category), asc(learningLessons.title)),
      user ? db.select().from(learningProgress).where(eq(learningProgress.userId, user.id)) : Promise.resolve([]),
    ]);
    return Response.json({ lessons, progress, signedIn: Boolean(user) });
  } catch (error) {
    console.error("Learning catalogue fetch failed", error);
    return Response.json({ error: "Learning materials could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to save learning progress." }, { status: 401 });
  let body: { lessonId?: unknown; completed?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
  if (!LESSONS.some((lesson) => lesson.id === lessonId)) return Response.json({ error: "Lesson not found." }, { status: 404 });
  const completed = body.completed === true;
  const now = new Date();
  try {
    await db.insert(learningProgress).values({
      userId: user.id,
      lessonId,
      completionStatus: completed ? "completed" : "in_progress",
      completedAt: completed ? now : null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [learningProgress.userId, learningProgress.lessonId],
      set: { completionStatus: completed ? "completed" : "in_progress", completedAt: completed ? now : null, updatedAt: now },
    });
    return Response.json({ ok: true, lessonId, completed });
  } catch (error) {
    console.error("Learning progress update failed", error);
    return Response.json({ error: "Your progress could not be saved." }, { status: 500 });
  }
}
