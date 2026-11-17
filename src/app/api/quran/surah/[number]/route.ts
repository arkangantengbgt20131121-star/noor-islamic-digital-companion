type Context = { params: Promise<{ number: string }> };

export async function GET(request: Request, context: Context) {
  const { number: rawNumber } = await context.params;
  const number = Number(rawNumber);
  if (!Number.isInteger(number) || number < 1 || number > 114) {
    return Response.json({ error: "Surah number must be between 1 and 114." }, { status: 400 });
  }
  const language = new URL(request.url).searchParams.get("language") === "en" ? "en" : "id";
  const translationEdition = language === "en" ? "en.sahih" : "id.indonesian";
  const editions = `quran-uthmani,${translationEdition},ar.alafasy`;
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${number}/editions/${editions}`, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return Response.json({ error: "This surah is temporarily unavailable." }, { status: 502 });
    const payload = (await response.json()) as { code?: number; data?: Array<{ name?: string; englishName?: string; englishNameTranslation?: string; revelationType?: string; number?: number; ayahs?: Array<Record<string, unknown>>; edition?: { identifier?: string; englishName?: string } }> };
    if (payload.code !== 200 || !Array.isArray(payload.data) || payload.data.length < 2) {
      return Response.json({ error: "The Quran source returned an unexpected response." }, { status: 502 });
    }
    const arabic = payload.data[0];
    const translation = payload.data[1];
    const audio = payload.data[2];
    const audioByAyah = new Map<number, string>();
    for (const ayah of audio?.ayahs ?? []) {
      const index = Number(ayah.numberInSurah);
      if (Number.isInteger(index) && typeof ayah.audio === "string") audioByAyah.set(index, ayah.audio);
    }
    const ayahs = (arabic.ayahs ?? []).map((ayah, index) => ({
      number: Number(ayah.numberInSurah),
      globalNumber: Number(ayah.number),
      arabic: typeof ayah.text === "string" ? ayah.text : "",
      translation: typeof translation.ayahs?.[index]?.text === "string" ? translation.ayahs[index].text : "",
      audio: audioByAyah.get(Number(ayah.numberInSurah)) ?? null,
    }));
    return Response.json({
      number,
      name: arabic.name ?? "",
      englishName: arabic.englishName ?? "",
      englishNameTranslation: arabic.englishNameTranslation ?? "",
      revelationType: arabic.revelationType ?? "",
      ayahCount: ayahs.length,
      translationSource: language === "en" ? "Saheeh International (AlQuran.cloud edition en.sahih)" : "Indonesian translation (AlQuran.cloud edition id.indonesian)",
      source: "AlQuran.cloud — Uthmani Arabic text (quran-uthmani)",
      ayahs,
    }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return Response.json({ error: "Unable to reach the Quran source right now." }, { status: 502 });
  }
}
