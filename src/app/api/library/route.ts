import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { libraryItems } from "@/db/schema";
import { LIBRARY_ITEMS } from "@/lib/content";

export async function GET(request: Request) {
  try {
    await db.insert(libraryItems).values(LIBRARY_ITEMS).onConflictDoNothing();
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") ?? "").trim().slice(0, 80);
    const category = (params.get("category") ?? "").trim();
    const conditions = [];
    if (query) conditions.push(or(ilike(libraryItems.title, `%${query}%`), ilike(libraryItems.description, `%${query}%`), ilike(libraryItems.content, `%${query}%`))!);
    if (category && category !== "All materials") conditions.push(ilike(libraryItems.category, category));
    const items = await db.select().from(libraryItems).where(conditions.length ? conditions.length === 1 ? conditions[0] : undefined : undefined).orderBy(asc(libraryItems.title));
    const filtered = conditions.length > 1
      ? items.filter((item) => item.category.toLowerCase() === category.toLowerCase() && (!query || `${item.title} ${item.description} ${item.content}`.toLowerCase().includes(query.toLowerCase())))
      : items;
    return Response.json({ items: filtered, sourceNote: "Original Noor study notes; each item includes its source or editorial attribution." });
  } catch (error) {
    console.error("Library fetch failed", error);
    return Response.json({ error: "The library could not be loaded." }, { status: 500 });
  }
}
