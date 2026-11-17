export const revalidate = 86400;

export async function GET() {
  try {
    const response = await fetch("https://api.alquran.cloud/v1/surah", {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return Response.json({ error: "The Quran catalogue is temporarily unavailable." }, { status: 502 });
    const payload = (await response.json()) as { code?: number; data?: unknown };
    if (payload.code !== 200 || !Array.isArray(payload.data)) {
      return Response.json({ error: "The Quran source returned an unexpected response." }, { status: 502 });
    }
    return Response.json({ surahs: payload.data, source: "AlQuran.cloud" }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return Response.json({ error: "Unable to reach the Quran source right now." }, { status: 502 });
  }
}
