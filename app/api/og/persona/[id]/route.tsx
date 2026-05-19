import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { getWorldType } from "@/lib/world-map";
import { loadOgFonts } from "@/lib/og-font";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const persona = await prisma.persona.findUnique({ where: { id } });
  if (!persona) return new Response("not found", { status: 404 });
  const world = getWorldType(persona.worldType);
  const fonts = await loadOgFonts();

  const kindLabel =
    persona.kind === "MAIN" ? "MAIN · 메인캐"
    : persona.kind === "SUB" ? "SUB · 부캐"
    : "SHADOW";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "1200px",
          display: "flex",
          flexDirection: "column",
          background: `radial-gradient(ellipse at top, ${world.hue}55, transparent 60%), radial-gradient(ellipse at bottom, ${world.hueAlt}88, transparent 60%), linear-gradient(180deg, #0b0e1a 0%, #11142b 100%)`,
          padding: "80px 70px",
          color: "#f5e6c8",
          fontFamily: "NotoSerifKR, NotoKR"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "NotoKR" }}>
          <div style={{ fontSize: 28, letterSpacing: "0.4em", color: "#d4af6f", fontWeight: 700 }}>
            NADIFE
          </div>
          <div style={{ fontSize: 22, color: "#bfb7a3", letterSpacing: "0.2em" }}>{kindLabel}</div>
        </div>

        <div style={{ marginTop: 80, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 32, color: "#bfb7a3", fontFamily: "NotoKR" }}>
            당신의 디지털 관상
          </div>
          <div
            style={{
              fontSize: 130,
              fontWeight: 700,
              marginTop: 18,
              lineHeight: 1.05,
              color: "#f5e6c8",
              letterSpacing: "-0.02em",
              fontFamily: "NotoSerifKR"
            }}
          >
            {world.title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginTop: 18,
              fontFamily: "NotoKR"
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9999,
                background: world.hue,
                boxShadow: `0 0 24px ${world.hue}`
              }}
            />
            <div style={{ fontSize: 28, color: world.hue, letterSpacing: "0.35em" }}>
              {world.vibe}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 60,
            padding: "40px 44px",
            borderRadius: 28,
            background: "rgba(245, 230, 200, 0.06)",
            border: "1px solid rgba(212, 175, 111, 0.25)",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ fontSize: 26, color: "#d4af6f", letterSpacing: "0.25em", fontFamily: "NotoKR", fontWeight: 700 }}>
            AI 한줄평
          </div>
          <div style={{ fontSize: 52, marginTop: 14, lineHeight: 1.3, color: "#f5e6c8", fontFamily: "NotoSerifKR" }}>
            “{persona.oneLiner}”
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 50, gap: 24, flexWrap: "wrap", fontFamily: "NotoKR" }}>
          {[
            ["리듬", persona.rhythm],
            ["관계 속도", persona.speed],
            ["감정", persona.emotion],
            ["회복", persona.recovery]
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "20px 26px",
                borderRadius: 18,
                background: "rgba(11,14,26,0.5)",
                border: "1px solid rgba(212,175,111,0.18)",
                minWidth: 220
              }}
            >
              <div style={{ fontSize: 20, color: "#bfb7a3", letterSpacing: "0.2em" }}>{k}</div>
              <div style={{ fontSize: 34, color: "#f5e6c8", marginTop: 8, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "NotoKR"
          }}
        >
          <div style={{ fontSize: 24, color: "#bfb7a3", maxWidth: 700, lineHeight: 1.5 }}>
            {persona.narrative}
          </div>
          <div style={{ fontSize: 22, color: "#d4af6f", letterSpacing: "0.3em" }}>
            나의 디지털 페르소나
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
