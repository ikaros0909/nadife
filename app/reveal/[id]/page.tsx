import Link from "next/link";
import { prisma } from "@/lib/db";
import { getWorldType } from "@/lib/world-map";
import { RevealCeremony } from "./RevealCeremony";

export default async function RevealPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ u?: string; kind?: string }>;
}) {
  const { id } = await params;
  const { u, kind } = await searchParams;
  const persona = await prisma.persona.findUnique({ where: { id } });
  if (!persona) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <div className="text-center text-ink-100/60">
          페르소나를 찾을 수 없습니다.
          <div className="mt-6">
            <Link href="/" className="text-nadip-gold underline">다시 시작</Link>
          </div>
        </div>
      </main>
    );
  }

  const world = getWorldType(persona.worldType);
  const hasSub = u
    ? !!(await prisma.persona.findFirst({ where: { userId: u, kind: "SUB" } }))
    : false;

  return (
    <RevealCeremony
      persona={{
        id: persona.id,
        kind: persona.kind,
        worldType: persona.worldType,
        title: persona.title,
        oneLiner: persona.oneLiner,
        rhythm: persona.rhythm,
        speed: persona.speed,
        emotion: persona.emotion,
        recovery: persona.recovery,
        energy: persona.energy,
        narrative: persona.narrative
      }}
      worldHue={world.hue}
      worldHueAlt={world.hueAlt}
      worldVibe={world.vibe}
      kindHint={(kind as string) ?? persona.kind}
      userId={u}
      hasSub={hasSub}
    />
  );
}
