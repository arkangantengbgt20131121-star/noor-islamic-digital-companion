import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { dhikrDailyProgress, learningProgress, libraryItems, readingProgress } from "@/db/schema";
import { getCurrentUser } from "@/lib/server-auth";
import { LIBRARY_ITEMS } from "@/lib/content";
import { localDateKey } from "@/lib/date";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to view your personal dashboard." }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") ?? localDateKey();
  try {
    await db.insert(libraryItems).values(LIBRARY_ITEMS).onConflictDoNothing();
    const [todayDhikr, quranProgress, allLessons, recentLibrary] = await Promise.all([
      db.select().from(dhikrDailyProgress).where(and(eq(dhikrDailyProgress.userId, user.id), eq(dhikrDailyProgress.progressDate, date))),
      db.select().from(readingProgress)
        .where(and(eq(readingProgress.userId, user.id), eq(readingProgress.contentType, "quran")))
        .orderBy(sql`${readingProgress.updatedAt} desc`).limit(1),
      db.select().from(learningProgress).where(eq(learningProgress.userId, user.id)),
      db.select({
        contentId: readingProgress.contentId,
        progress: readingProgress.progress,
        updatedAt: readingProgress.updatedAt,
        title: libraryItems.title,
      }).from(readingProgress)
        .leftJoin(libraryItems, eq(readingProgress.contentId, libraryItems.id))
        .where(and(eq(readingProgress.userId, user.id), eq(readingProgress.contentType, "library")))
        .orderBy(sql`${readingProgress.updatedAt} desc`).limit(3),
    ]);
    const totalDhikr = todayDhikr.reduce((sum, item) => sum + item.count, 0);
    const quran = quranProgress[0] ?? null;
    const completedLessons = allLessons.filter((item) => item.completionStatus === "completed").length;
    return Response.json({
      today: date,
      dhikrCount: totalDhikr,
      dhikrTarget: 100,
      quran,
      completedLessons,
      startedLessons: allLessons.length,
      totalDhikrEntries: todayDhikr.length,
      recentLibrary: recentLibrary.map((item) => ({ ...item, title: item.title ?? "Reading material" })),
      signedIn: true,
    });
  } catch (error) {
    console.error("Dashboard data fetch failed", error);
    return Response.json({ error: "Your dashboard could not be loaded." }, { status: 500 });
  }
}
