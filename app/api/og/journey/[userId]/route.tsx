import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { getWorldType, WORLD_TYPES } from "@/lib/world-map";
import { buildJourneyStats, toSvg, type JourneyPoint } from "@/lib/journey";
import { loadOgFonts } from "@/lib/og-font";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAP = 760;
const PAD = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      personas: { orderBy: { createdAt: "asc" } },
      daily: { orderBy: { date: "asc" } }
    }
  });
  if (!user) return new Response("not found", { status: 404 });

  const points: JourneyPoint[] = [
    ...user.personas.map((p) => ({
      id: p.id,
      source: p.kind as "MAIN" | "SUB",
      date: p.createdAt.toISOString(),
      worldSlug: p.worldType,
      title: p.title,
      oneLiner: p.oneLiner,
      axisX: p.axisX,
      axisY: p.axisY
    })),
    ...user.daily.map((d) => ({
      id: d.id,
      source: "DAILY" as const,
      date: d.date,
      worldSlug: d.worldType,
      title: d.title,
      oneLiner: d.oneLiner,
      axisX: 0,
      axisY: 0
    }))
  ].sort((a, b) => a.date.localeCompare(b.date));

  const stats = buildJourneyStats(points);
  const projected = points.map((p) => {
    const w = getWorldType(p.worldSlug);
    const { cx, cy } = toSvg(w.axisX, w.axisY, MAP, PAD);
    return { ...p, cx, cy, hue: w.hue, worldTitle: w.title };
  });

  const pathD = projected.length > 1
    ? projected
        .map((p, i) => (i === 0 ? `M ${p.cx} ${p.cy}` : `L ${p.cx} ${p.cy}`))
        .join(" ")
    : "";

  const latest = projected[projected.length - 1];
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "1200px",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(ellipse at top, rgba(212,175,111,0.18), transparent 55%), radial-gradient(ellipse at bottom, rgba(196,123,138,0.16), transparent 55%), linear-gradient(180deg, #0b0e1a 0%, #11142b 100%)",
          padding: "70px 70px 60px",
          color: "#f5e6c8",
          fontFamily: "NotoSerifKR, NotoKR"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "NotoKR"
          }}
        >
          <div style={{ fontSize: 28, letterSpacing: "0.4em", color: "#d4af6f", fontWeight: 700 }}>
            NADIPE
          </div>
          <div style={{ fontSize: 22, color: "#bfb7a3", letterSpacing: "0.3em" }}>
            JOURNEY · 궤적
          </div>
        </div>

        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", fontFamily: "NotoKR" }}>
          <div style={{ fontSize: 28, color: "#bfb7a3" }}>나는 지난 시간 동안</div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              marginTop: 8,
              lineHeight: 1.05,
              color: "#f5e6c8",
              fontFamily: "NotoSerifKR"
            }}
          >
            {stats.daysSinceStart}일,{" "}
            <span style={{ color: "#d4af6f" }}>{stats.uniqueWorlds}개의 세계</span>를
            <br />
            거쳐왔다.
          </div>
        </div>

        {/* SVG 궤적 */}
        <div
          style={{
            marginTop: 30,
            display: "flex",
            alignSelf: "center",
            border: "1px solid rgba(212,175,111,0.2)",
            borderRadius: 24,
            background:
              "radial-gradient(circle at center, rgba(212,175,111,0.06), transparent 65%), rgba(11,14,26,0.6)"
          }}
        >
          <svg width={MAP} height={MAP} viewBox={`0 0 ${MAP} ${MAP}`} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="og-path" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d4af6f" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#c47b8a" stopOpacity="1" />
              </linearGradient>
            </defs>

            <line x1={MAP / 2} y1={PAD} x2={MAP / 2} y2={MAP - PAD} stroke="rgba(212,175,111,0.12)" />
            <line x1={PAD} y1={MAP / 2} x2={MAP - PAD} y2={MAP / 2} stroke="rgba(212,175,111,0.12)" />

            {WORLD_TYPES.map((w) => {
              const { cx, cy } = toSvg(w.axisX, w.axisY, MAP, PAD);
              return (
                <circle key={w.slug} cx={cx} cy={cy} r={4} fill={w.hue} opacity="0.25" />
              );
            })}

            {pathD && (
              <path d={pathD} fill="none" stroke="url(#og-path)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {projected.map((p, i) => {
              const isLatest = i === projected.length - 1;
              if (p.source === "MAIN") {
                return (
                  <rect
                    key={p.id}
                    x={p.cx - 8}
                    y={p.cy - 8}
                    width={16}
                    height={16}
                    fill={p.hue}
                    stroke="#0b0e1a"
                    strokeWidth="2"
                  />
                );
              }
              if (p.source === "SUB") {
                return (
                  <polygon
                    key={p.id}
                    points={`${p.cx},${p.cy - 10} ${p.cx + 10},${p.cy} ${p.cx},${p.cy + 10} ${p.cx - 10},${p.cy}`}
                    fill={p.hue}
                    stroke="#0b0e1a"
                    strokeWidth="2"
                  />
                );
              }
              return (
                <circle
                  key={p.id}
                  cx={p.cx}
                  cy={p.cy}
                  r={isLatest ? 11 : 7}
                  fill={p.hue}
                  stroke="#0b0e1a"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>

        {/* Latest 라벨 + 통계 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 30,
            fontFamily: "NotoKR"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 18, color: "#bfb7a3", letterSpacing: "0.3em" }}>오늘 · 현재</div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                marginTop: 4,
                color: latest ? latest.hue : "#f5e6c8",
                fontFamily: "NotoSerifKR"
              }}
            >
              {latest ? latest.worldTitle : "—"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 18, fontFamily: "NotoKR" }}>
            <Stat n={stats.totalEntries} l="기록" />
            <Stat n={stats.uniqueWorlds} l="세계" />
            <Stat n={stats.currentStreak} l="연속" />
            <Stat n={stats.longestStreak} l="최장" />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 24,
            borderTop: "1px solid rgba(212,175,111,0.18)",
            fontFamily: "NotoKR"
          }}
        >
          <div style={{ fontSize: 20, color: "#bfb7a3" }}>우리는 모두 다른 세계를 살아간다</div>
          <div style={{ fontSize: 20, color: "#d4af6f", letterSpacing: "0.3em" }}>
            NADIPE
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 1200,
      fonts: fonts.map((f) => ({
        name: f.name,
        data: f.data,
        weight: f.weight,
        style: f.style
      }))
    }
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: 72,
        padding: "10px 14px",
        borderRadius: 14,
        border: "1px solid rgba(212,175,111,0.2)",
        background: "rgba(11,14,26,0.55)"
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 700, color: "#f5e6c8" }}>{n}</div>
      <div style={{ fontSize: 14, color: "#bfb7a3", letterSpacing: "0.2em", marginTop: 2 }}>
        {l}
      </div>
    </div>
  );
}
