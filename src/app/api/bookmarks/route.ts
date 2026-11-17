import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks, libraryItems, quranBookmarks } from "@/db/schema";
import { getCurrentUser } from "@/lib/server-auth";
import { LESSONS, LIBRARY_ITEMS } from "@/lib/content";

type BookmarkBody = { type?: unknown; contentId?: unknown };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to view saved items." }, { status: 401 });
  try {
    const [ayahs, other] = await Promise.all([
      db.select().from(quranBookmarks).where(eq(quranBookmarks.userId, user.id)).orderBy(desc(quranBookmarks.createdAt)),
      db.select().from(bookmarks).where(eq(bookmarks.userId, user.id)).orderBy(desc(bookmarks.createdAt)),
    ]);
    const details = await Promise.all(other.map(async (item) => {
      if (item.contentType === "library") {
        const [stored] = await db.select({ title: libraryItems.title, description: libraryItems.description }).from(libraryItems).where(eq(libraryItems.id, item.contentId)).limit(1);
        const seed = LIBRARY_ITEMS.find((entry) => entry.id === item.contentId);
        return { type: item.contentType, contentId: item.contentId, title: stored?.title ?? seed?.title ?? "Saved library item", description: stored?.description ?? seed?.description ?? "", createdAt: item.createdAt };
      }
      const lesson = LESSONS.find((entry) => entry.id === item.contentId);
      return { type: item.contentType, contentId: item.contentId, title: lesson?.title ?? "Saved lesson", description: lesson?.description ?? "", createdAt: item.createdAt };
    }));
    const quran = ayahs.map((item) => ({ type: "quran", contentId: `${item.surahNumber}:${item.ayahNumber}`, title: `Qur'an · ${item.surahNumber}:${item.ayahNumber}`, description: "Bookmarked ayah", createdAt: item.createdAt }));
    return Response.json({ bookmarks: [...quran, ...details] });
  } catch (error) {
    console.error("Bookmark fetch failed", error);
    return Response.json({ error: "Bookmarks could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to save bookmarks." }, { status: 401 });
  let body: BookmarkBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const type = typeof body.type === "string" ? body.type : "";
  const contentId = typeof body.contentId === "string" ? body.contentId.slice(0, 120) : "";
  if (type === "quran") {
    const [surah, ayah] = contentId.split(":").map(Number);
    if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1 || ayah > 286) {
      return Response.json({ error: "Invalid ayah reference." }, { status: 400 });
    }
    try {
      await db.insert(quranBookmarks).values({ userId: user.id, surahNumber: surah, ayahNumber: ayah }).onConflictDoNothing();
      return Response.json({ ok: true, saved: true });
    } catch (error) {
      console.error("Quran bookmark failed", error);
      return Response.json({ error: "The bookmark could not be saved." }, { status: 500 });
    }
  }
  if ((type !== "library" && type !== "lesson") || !contentId) return Response.json({ error: "Invalid bookmark." }, { status: 400 });
  const exists = type === "library"
    ? LIBRARY_ITEMS.some((item) => item.id === contentId)
    : LESSONS.some((lesson) => lesson.id === contentId);
  if (!exists) return Response.json({ error: "Item not found." }, { status: 404 });
  try {
    await db.insert(bookmarks).values({ userId: user.id, contentType: type, contentId }).onConflictDoNothing();
    return Response.json({ ok: true, saved: true });
  } catch (error) {
    console.error("Bookmark save failed", error);
    return Response.json({ error: "The bookmark could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to manage bookmarks." }, { status: 401 });
  let body: BookmarkBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const type = typeof body.type === "string" ? body.type : "";
  const contentId = typeof body.contentId === "string" ? body.contentId : "";
  try {
    if (type === "quran") {
      const [surah, ayah] = contentId.split(":").map(Number);
      if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return Response.json({ error: "Invalid ayah reference." }, { status: 400 });
      await db.delete(quranBookmarks).where(and(eq(quranBookmarks.userId, user.id), eq(quranBookmarks.surahNumber, surah), eq(quranBookmarks.ayahNumber, ayah)));
    } else {
      await db.delete(bookmarks).where(and(eq(bookmarks.userId, user.id), eq(bookmarks.contentType, type), eq(bookmarks.contentId, contentId)));
    }
    return Response.json({ ok: true, saved: false });
  } catch (error) {
    console.error("Bookmark removal failed", error);
    return Response.json({ error: "The bookmark could not be removed." }, { status: 500 });
  }
}
