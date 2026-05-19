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
  if (!p) return { title: "NADIFE — 나의 디지털 페르소나" };
  const w = getWorldType(p.worldType);
  const kindLabel = p.kind === "SUB" ? "숨은 부캐" : "디지털 관상";
  const title = `${w.title} · NADIFE`;
  const description = `“${p.oneLiner}” — AI가 읽어주는 나의 ${kindLabel}. NADIFE에서 이메일 하나로 60초 안에 나의 디지털 페르소나를 발견하세요.`;
  const og = `${BASE}/api/og/persona/${id}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "NADIFE",
      images: [{ url: og, width: 1200, height: 1200, alt: `${w.title} — NADIFE 디지털 관상` }],
      type: "article",
      locale: "ko_KR"
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
          <Link
            href="/"
            className="serif text-[10px] tracking-[0.5em] text-nadi-gold transition hover:text-nadi-glow"
          >
            NADIFE
          </Link>
          <Link
            href="/"
            className="rounded-full border border-nadi-gold/40 bg-nadi-gold/10 px-4 py-1.5 text-[11px] tracking-[0.3em] text-nadi-glow hover:bg-nadi-gold/20"
          >
            나디페 홈 →
          </Link>
        </header>
      )}

      {!isOwner && (
        <section className="mt-10 rounded-3xl border border-nadi-gold/25 bg-black/30 p-6 text-center">
          <p className="serif text-xs tracking-[0.45em] text-nadi-gold">NADIFE</p>
          <h1 className="serif mt-4 text-2xl leading-snug text-nadi-glow sm:text-3xl">
            누군가가 자신의
            <br />
            디지털 관상을 공유했어요.
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-ink-100/65">
            NADIFE는 디지털 흔적을 읽는 AI 관상가입니다.
            <br />
            이메일과 관심사 몇 가지로 — 나의 디지털 페르소나를 발견하세요.
          </p>
        </section>
      )}

      <p className="serif mt-10 text-center text-xs tracking-[0.45em] text-nadi-gold">
        {isOwner ? "AI가 본 디지털 관상" : "받은 디지털 관상"}
      </p>

      <div className="mt-6">
        <PersonaCard data={p} />
      </div>

      <ShareBar personaId={p.id} title={p.title} />

      <div className="mt-12 rounded-3xl border border-nadi-gold/40 bg-gradient-to-br from-nadi-gold/10 to-nadi-rose/10 p-7 text-center">
        <h3 className="serif text-xl leading-snug text-nadi-glow">
          {isOwner ? "또 다른 친구에게도 보여주세요." : "당신의 디지털 관상은 어떨까요?"}
        </h3>
        <p className="mt-2 text-xs text-ink-100/65">
          60초 — 이메일과 디지털 흔적 몇 가지로 AI가 읽어드립니다.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/onboard"
            className="rounded-full bg-gradient-to-r from-nadi-gold to-nadi-rose px-8 py-3 text-xs tracking-[0.3em] text-nadi-night hover:opacity-90"
          >
            내 관상 보러 가기 →
          </Link>
          {!isOwner && (
            <Link
              href="/me"
              className="rounded-full border border-nadi-gold/40 bg-nadi-gold/5 px-8 py-3 text-xs tracking-[0.3em] text-nadi-glow hover:bg-nadi-gold/15"
            >
              이미 시작했나요? — 이메일로 이어가기
            </Link>
          )}
        </div>
      </div>

      <p className="mt-10 text-center text-[10px] tracking-[0.45em] text-ink-100/30">
        우리는 모두 다른 세계를 살아간다
      </p>
    </main>
  );
}
