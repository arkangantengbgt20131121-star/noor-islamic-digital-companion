export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (query.length < 2 || query.length > 80) return Response.json({ results: [] });
  const language = url.searchParams.get("language") === "en" ? "en" : "id";
  const edition = language === "en" ? "en.sahih" : "id.indonesian";
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/${edition}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return Response.json({ error: "Quran search is temporarily unavailable." }, { status: 502 });
    const payload = (await response.json()) as { code?: number; data?: { matches?: unknown[] } };
    if (payload.code !== 200) return Response.json({ error: "The Quran source returned an unexpected response." }, { status: 502 });
    return Response.json({ results: payload.data?.matches ?? [], source: "AlQuran.cloud search" });
  } catch {
    return Response.json({ error: "Unable to reach Quran search right now." }, { status: 502 });
  }
}
