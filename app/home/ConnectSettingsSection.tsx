"use client";

import { useCallback, useEffect, useState } from "react";

type Profile = {
  nickname: string | null;
  birthYear: number | null;
  gender: string | null;
  country: string | null;
  occupation: string | null;
  region: string | null;
  connectGenders: string[];
  connectCountries: string[];
  connectRegions: string[];
  connectAgeMin: number | null;
  connectAgeMax: number | null;
  geoOptIn: boolean;
  geoLat: number | null;
  geoLng: number | null;
  geoUpdatedAt: string | null;
};

export function ConnectSettingsSection({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [savingGeo, setSavingGeo] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/profile?u=${userId}`, { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j.profile) setProfile(j.profile);
    } catch {}
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(update: Partial<Profile>) {
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, ...update })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "저장 실패");
    await load();
  }

  async function shareLocation() {
    if (!("geolocation" in navigator)) {
      setErr("이 브라우저에서는 위치를 가져올 수 없어요.");
      return;
    }
    setSavingGeo(true);
    setErr(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await patch({
            geoOptIn: true,
            geoLat: pos.coords.latitude,
            geoLng: pos.coords.longitude
          });
        } catch (e: unknown) {
          setErr(e instanceof Error ? e.message : "오류");
        } finally {
          setSavingGeo(false);
        }
      },
      (e) => {
        setErr(e.message || "위치를 가져올 수 없어요.");
        setSavingGeo(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600_000 }
    );
  }

  async function unshareLocation() {
    setSavingGeo(true);
    setErr(null);
    try {
      await patch({ geoOptIn: false });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSavingGeo(false);
    }
  }

  if (!profile) return null;

  return (
    <section className="mt-10">
      <h3 className="serif text-sm tracking-[0.4em] text-nadip-gold">✦ 연결 설정</h3>
      <p className="mt-2 text-[11px] tracking-widest text-ink-100/45">
        깊은 인연이 쌓여도 — 조건이 맞아야 연결됩니다.
      </p>

      <div className="mt-4 rounded-2xl border border-nadip-gold/20 bg-black/30 p-5">
        <div className="flex items-center justify-between">
          <p className="serif text-xs tracking-[0.4em] text-nadip-gold">내가 받아들이는 결</p>
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-[10px] tracking-widest text-ink-100/60 hover:text-nadip-glow"
          >
            {editing ? "취소" : "수정"}
          </button>
        </div>

        {!editing ? (
          <PrefsView profile={profile} />
        ) : (
          <PrefsEditor
            initial={profile}
            onSave={async (next) => {
              try {
                await patch(next);
                setEditing(false);
              } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : "오류");
              }
            }}
          />
        )}
      </div>

      {/* GPS / 위치 */}
      <div className="mt-4 rounded-2xl border border-nadip-gold/20 bg-black/30 p-5">
        <div className="flex items-center justify-between">
          <p className="serif text-xs tracking-[0.4em] text-nadip-gold">위치 공유</p>
          <span className="text-[10px] tracking-widest text-ink-100/45">
            {profile.geoOptIn ? "켜짐" : "꺼짐"}
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-100/55">
          1km 그리드로 반올림되어 저장돼요. 누구도 정확한 위치를 보지 못합니다 — 거리 버킷(5km 이내, 다른 도시 등)만 표시되고, 연결된 편지의 비행 시간이 거리에 비례합니다.
        </p>

        <div className="mt-4 flex gap-2">
          {profile.geoOptIn ? (
            <>
              <button
                onClick={shareLocation}
                disabled={savingGeo}
                className="flex-1 rounded-xl border border-nadip-gold/30 bg-nadip-gold/5 px-4 py-2 text-xs tracking-widest text-nadip-glow hover:bg-nadip-gold/15 disabled:opacity-50"
              >
                {savingGeo ? "받는 중…" : "위치 갱신"}
              </button>
              <button
                onClick={unshareLocation}
                disabled={savingGeo}
                className="flex-1 rounded-xl border border-ink-100/15 px-4 py-2 text-xs tracking-widest text-ink-100/65 hover:border-ink-100/30 disabled:opacity-50"
              >
                위치 끄기
              </button>
            </>
          ) : (
            <button
              onClick={shareLocation}
              disabled={savingGeo}
              className="w-full rounded-xl bg-gradient-to-r from-nadip-gold to-nadip-rose px-4 py-2 text-xs tracking-widest text-nadip-night hover:opacity-90 disabled:opacity-50"
            >
              {savingGeo ? "받는 중…" : "위치 공유 켜기"}
            </button>
          )}
        </div>
        {profile.geoUpdatedAt && (
          <p className="mt-2 text-[10px] tracking-widest text-ink-100/40">
            마지막 갱신 — {new Date(profile.geoUpdatedAt).toLocaleString("ko-KR")}
          </p>
        )}
        {err && <p className="mt-2 text-[11px] text-nadip-rose">{err}</p>}
      </div>
    </section>
  );
}

function PrefsView({ profile }: { profile: Profile }) {
  const items: { label: string; values: string[] | null }[] = [
    { label: "성별", values: profile.connectGenders.length ? profile.connectGenders : null },
    { label: "국적", values: profile.connectCountries.length ? profile.connectCountries : null },
    { label: "지역", values: profile.connectRegions.length ? profile.connectRegions : null }
  ];
  const ageRange =
    profile.connectAgeMin !== null || profile.connectAgeMax !== null
      ? `${profile.connectAgeMin ?? "—"} ~ ${profile.connectAgeMax ?? "—"}세`
      : null;

  const anyFilter = items.some((i) => i.values) || ageRange;

  return (
    <div className="mt-4 space-y-2">
      {!anyFilter && (
        <p className="rounded-xl border border-dashed border-ink-100/15 bg-black/20 px-3 py-2 text-[11px] tracking-widest text-ink-100/45">
          모든 조건을 받아들여요.
        </p>
      )}
      {items.map((it) =>
        it.values ? (
          <div key={it.label} className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] tracking-widest text-ink-100/50">{it.label}</span>
            {it.values.map((v) => (
              <span
                key={v}
                className="rounded-full border border-nadip-gold/30 bg-nadip-gold/5 px-3 py-0.5 text-[11px] text-nadip-glow"
              >
                {v}
              </span>
            ))}
          </div>
        ) : null
      )}
      {ageRange && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-widest text-ink-100/50">나이</span>
          <span className="rounded-full border border-nadip-gold/30 bg-nadip-gold/5 px-3 py-0.5 text-[11px] text-nadip-glow">
            {ageRange}
          </span>
        </div>
      )}
    </div>
  );
}

function PrefsEditor({
  initial,
  onSave
}: {
  initial: Profile;
  onSave: (next: Partial<Profile>) => Promise<void>;
}) {
  const [genders, setGenders] = useState(initial.connectGenders.join(", "));
  const [countries, setCountries] = useState(initial.connectCountries.join(", "));
  const [regions, setRegions] = useState(initial.connectRegions.join(", "));
  const [ageMin, setAgeMin] = useState(initial.connectAgeMin?.toString() ?? "");
  const [ageMax, setAgeMax] = useState(initial.connectAgeMax?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  function parseList(s: string): string[] {
    return s
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  async function save() {
    setSaving(true);
    try {
      await onSave({
        connectGenders: parseList(genders),
        connectCountries: parseList(countries),
        connectRegions: parseList(regions),
        connectAgeMin: ageMin ? Number(ageMin) : null,
        connectAgeMax: ageMax ? Number(ageMax) : null
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-2 text-xs">
      <Field label="받아들일 성별 (쉼표로 구분)" value={genders} onChange={setGenders} placeholder="여성, 남성" />
      <Field label="받아들일 국적 (쉼표로 구분)" value={countries} onChange={setCountries} placeholder="한국, 일본" />
      <Field label="받아들일 지역 (쉼표로 구분)" value={regions} onChange={setRegions} placeholder="서울, 부산" />
      <div className="grid grid-cols-2 gap-2">
        <Field label="최소 나이" value={ageMin} onChange={setAgeMin} placeholder="20" type="number" />
        <Field label="최대 나이" value={ageMax} onChange={setAgeMax} placeholder="40" type="number" />
      </div>
      <p className="mt-2 text-[10px] tracking-widest text-ink-100/45">
        모두 비워두면 — 모든 사람을 받아들입니다.
      </p>
      <button
        onClick={save}
        disabled={saving}
        className="mt-2 w-full rounded-xl bg-gradient-to-r from-nadip-gold to-nadip-rose px-4 py-2 text-xs tracking-widest text-nadip-night hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "저장 중…" : "저장"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-widest text-ink-100/55">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-ink-100/15 bg-transparent px-3 py-1.5 text-sm text-nadip-glow placeholder:text-ink-100/30 outline-none focus:border-nadip-gold/50"
      />
    </label>
  );
}
