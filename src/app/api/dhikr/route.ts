import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { dhikrDailyProgress, dhikrLibrary, dhikrSessions } from "@/db/schema";
import { DHIKR_PRESETS } from "@/lib/content";
import { localDateKey } from "@/lib/date";
import { getCurrentUser } from "@/lib/server-auth";

type Body = { action?: unknown; dhikrId?: unknown; count?: unknown; target?: unknown; date?: unknown; title?: unknown; arabicText?: unknown; transliteration?: unknown; translation?: unknown };

function validDay(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return localDateKey();
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? localDateKey() : value;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const date = validDay(new URL(request.url).searchParams.get("date"));
  try {
    const custom = user
      ? await db.select().from(dhikrLibrary).where(eq(dhikrLibrary.ownerId, user.id)).orderBy(desc(dhikrLibrary.createdAt))
      : [];
    const progress = user
      ? await db.select().from(dhikrDailyProgress).where(and(eq(dhikrDailyProgress.userId, user.id), eq(dhikrDailyProgress.progressDate, date)))
      : [];
    const history = user
      ? await db.select().from(dhikrDailyProgress).where(eq(dhikrDailyProgress.userId, user.id)).orderBy(desc(dhikrDailyProgress.progressDate)).limit(24)
      : [];
    return Response.json({
      items: [...DHIKR_PRESETS, ...custom],
      progress,
      history,
      signedIn: Boolean(user),
    });
  } catch (error) {
    console.error("Dhikr data fetch failed", error);
    return Response.json({ error: "Dhikr data could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to save your dhikr progress." }, { status: 401 });
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const action = typeof body.action === "string" ? body.action : "";
  if (action === "custom") {
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
    const translation = typeof body.translation === "string" ? body.translation.trim().slice(0, 500) : "";
    if (title.length < 2 || translation.length < 2) return Response.json({ error: "Add a name and meaning for your custom dhikr." }, { status: 400 });
    const id = `custom_${randomUUID()}`;
    try {
      const [item] = await db.insert(dhikrLibrary).values({
        id,
        ownerId: user.id,
        title,
        category: "Custom dzikir",
        arabicText: typeof body.arabicText === "string" ? body.arabicText.trim().slice(0, 500) : "",
        transliteration: typeof body.transliteration === "string" ? body.transliteration.trim().slice(0, 500) : "",
        translation,
        explanation: "Personal entry added by you.",
        reference: "Personal entry — source not supplied by Noor.",
        defaultTarget: 33,
      }).returning();
      return Response.json({ item }, { status: 201 });
    } catch (error) {
      console.error("Custom dhikr save failed", error);
      return Response.json({ error: "Your custom dhikr could not be saved." }, { status: 500 });
    }
  }
  if (action !== "progress") return Response.json({ error: "Choose a valid dhikr action." }, { status: 400 });
  const dhikrId = typeof body.dhikrId === "string" ? body.dhikrId : "";
  const count = typeof body.count === "number" ? Math.floor(body.count) : -1;
  const target = typeof body.target === "number" ? Math.floor(body.target) : -1;
  const progressDate = validDay(body.date);
  if (!Number.isInteger(count) || count < 0 || count > 100000 || !Number.isInteger(target) || target < 1 || target > 100000) {
    return Response.json({ error: "Count or target is outside the allowed range." }, { status: 400 });
  }
  const preset = DHIKR_PRESETS.some((item) => item.id === dhikrId);
  const [custom] = preset ? [] : await db.select({ id: dhikrLibrary.id }).from(dhikrLibrary).where(and(eq(dhikrLibrary.id, dhikrId), eq(dhikrLibrary.ownerId, user.id))).limit(1);
  if (!preset && !custom) return Response.json({ error: "Dhikr entry not found." }, { status: 404 });
  try {
    const [previous] = await db.select({ count: dhikrDailyProgress.count }).from(dhikrDailyProgress).where(and(
      eq(dhikrDailyProgress.userId, user.id),
      eq(dhikrDailyProgress.dhikrId, dhikrId),
      eq(dhikrDailyProgress.progressDate, progressDate),
    )).limit(1);
    const now = new Date();
    await db.insert(dhikrDailyProgress).values({ userId: user.id, dhikrId, progressDate, count, target, updatedAt: now })
      .onConflictDoUpdate({
        target: [dhikrDailyProgress.userId, dhikrDailyProgress.dhikrId, dhikrDailyProgress.progressDate],
        set: { count, target, updatedAt: now },
      });
    if (count >= target && (previous?.count ?? 0) < target) {
      await db.insert(dhikrSessions).values({ userId: user.id, dhikrId, count, target, completedAt: now });
    }
    return Response.json({ ok: true, count, target });
  } catch (error) {
    console.error("Dhikr progress save failed", error);
    return Response.json({ error: "Your count could not be saved." }, { status: 500 });
  }
}
