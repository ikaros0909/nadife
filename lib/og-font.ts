// @vercel/og 가 윈도우에서 번들 폰트를 못 읽는 이슈 회피용.
// Google Fonts에서 한국어 폰트의 *모든* unicode-range subset을 받아 satori에 주입한다.
// 한 family/weight당 woff2 수십~수백개가 만들어지지만 모듈 레벨 캐시로 첫 요청 후엔 즉시 응답.

type FontWeight = 400 | 500 | 700 | 900;

const cache = new Map<string, ArrayBuffer[]>();

async function fetchFontFiles(family: string, weight: FontWeight): Promise<ArrayBuffer[]> {
  const key = `${family}:${weight}`;
  const cached = cache.get(key);
  if (cached) return cached;

  // User-Agent를 모던 브라우저로 보내야 Google Fonts가 woff2 + unicode-range를 내려줌
  const cssRes = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
      },
      cache: "force-cache"
    }
  );
  if (!cssRes.ok) throw new Error(`Google Fonts CSS failed: ${cssRes.status}`);
  const css = await cssRes.text();

  // 모든 src url(...) 추출 — 한국어 폰트는 수십개 subset이 옴
  const urls = [...css.matchAll(/src:\s*url\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]);
  if (urls.length === 0) {
    throw new Error(`Could not parse font URLs from Google Fonts CSS for ${family}:${weight}`);
  }

  const buffers = await Promise.all(
    urls.map(async (u) => {
      const r = await fetch(u, { cache: "force-cache" });
      if (!r.ok) throw new Error(`Font binary fetch failed: ${r.status} ${u}`);
      return r.arrayBuffer();
    })
  );

  cache.set(key, buffers);
  return buffers;
}

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: "normal";
};

/**
 * satori에 넘길 폰트 배열을 만든다. 같은 name으로 여러 buffer를 등록하면
 * satori가 글리프별로 적절한 subset을 골라 사용한다 — 한글/라틴/기호 누락 zero.
 */
export async function loadOgFonts(): Promise<OgFont[]> {
  const [sans400, sans700, serif700] = await Promise.all([
    fetchFontFiles("Noto Sans KR", 400),
    fetchFontFiles("Noto Sans KR", 700),
    fetchFontFiles("Noto Serif KR", 700)
  ]);
  const fonts: OgFont[] = [];
  for (const buf of sans400) fonts.push({ name: "NotoKR", data: buf, weight: 400, style: "normal" });
  for (const buf of sans700) fonts.push({ name: "NotoKR", data: buf, weight: 700, style: "normal" });
  for (const buf of serif700) fonts.push({ name: "NotoSerifKR", data: buf, weight: 700, style: "normal" });
  return fonts;
}
