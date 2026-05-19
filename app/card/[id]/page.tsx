import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getWorldType } from "@/lib/world-map";
import { PersonaCard } from "@/components/PersonaCard";
import { ShareBar } from "@/components/ShareBar";
import { PersonalNav } from "@/components/PersonalNav";
import { getUidFromCookie } from "@/lib/session";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.persona.findUnique({ where: { id } });
  if (!p) return { title: "NADIFE" };
  const w = getWorldType(p.worldType);
  const title = `${w.title} · NADIFE`;
  const description = `“${p.oneLiner}”  — AI가 본 ${
    p.kind === "SUB" ? "숨은 부캐" : "디지털 관상"
  }`;
  const og = `${BASE}/api/og/persona/${id}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: og, width: 1200, height: 1200 }],
      type: "article"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [og]
    }
  };
}

export default async function CardPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await prisma.persona.findUnique({ where: { id } });
  if (!p) notFound();
  const cookieUid = await getUidFromCookie();
  const isOwner = cookieUid && cookieUid === p.userId;

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-xl px-6 pb-20">
      {isOwner ? (
        <PersonalNav userId={cookieUid!} current="home" />
      ) : (
        <header className="flex items-center justify-between py-6">
          <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">NADIFE</p>
          <Link href="/" className="text-xs tracking-widest text-ink-100/40 hover:text-nadi-glow">
            홈 →
          </Link>
        </header>
      )}

      <p className="serif mt-10 text-center text-xs tracking-[0.45em] text-nadi-gold">
        AI가 본 디지털 관상
      </p>

      <div className="mt-6">
        <PersonaCard data={p} />
      </div>

      <ShareBar personaId={p.id} title={p.title} />

      <div className="mt-12 rounded-3xl border border-nadi-gold/30 bg-gradient-to-br from-nadi-gold/5 to-nadi-rose/5 p-6 text-center">
        <h3 className="serif text-lg text-nadi-glow">
          당신은 어떤 세계에 살고 있나요?
        </h3>
        <p className="mt-2 text-xs text-ink-100/60">
          60초 — 이메일과 디지털 흔적 몇 가지로
        </p>
        <Link
          href="/onboard"
          className="mt-5 inline-flex rounded-full bg-gradient-to-r from-nadi-gold to-nadi-rose px-8 py-3 text-xs tracking-[0.3em] text-nadi-night hover:opacity-90"
        >
          내 관상 보러 가기
        </Link>
      </div>
    </main>
  );
}
