// @vercel/og 가 윈도우에서 번들 폰트를 못 읽는 이슈 회피용.
// Google Fonts에서 한국어 폰트를 받아 ArrayBuffer로 캐시한다.

type FontWeight = 400 | 500 | 700 | 900;

const cache = new Map<string, ArrayBuffer>();

async function fetchFromGoogleFonts(family: string, weight: FontWeight): Promise<ArrayBuffer> {
  const key = `${family}:${weight}`;
  const cached = cache.get(key);
  if (cached) return cached;

  // User-Agent를 현대 브라우저로 보내면 woff2가 내려옴(satori가 처리 가능).
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

  // 가장 첫 번째 url(...)을 잡는다.
  const match = css.match(/src:\s*url\((https?:\/\/[^)]+)\)\s*format\(['"]?(woff2|woff|truetype)['"]?\)/);
  if (!match) throw new Error("Could not parse font URL from Google Fonts CSS");

  const fontRes = await fetch(match[1], { cache: "force-cache" });
  if (!fontRes.ok) throw new Error(`Font binary fetch failed: ${fontRes.status}`);
  const buf = await fontRes.arrayBuffer();
  cache.set(key, buf);
  return buf;
}

export type OgFont = { name: string; data: ArrayBuffer; weight: FontWeight; style: "normal" };

export async function loadOgFonts(): Promise<OgFont[]> {
  const [sans400, sans700, serif700] = await Promise.all([
    fetchFromGoogleFonts("Noto Sans KR", 400),
    fetchFromGoogleFonts("Noto Sans KR", 700),
    fetchFromGoogleFonts("Noto Serif KR", 700)
  ]);
  return [
    { name: "NotoKR", data: sans400, weight: 400, style: "normal" },
    { name: "NotoKR", data: sans700, weight: 700, style: "normal" },
    { name: "NotoSerifKR", data: serif700, weight: 700, style: "normal" }
  ];
}
