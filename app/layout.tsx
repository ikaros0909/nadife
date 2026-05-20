import type { Metadata } from "next";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "NADIPE · 나의 디지털 페르소나",
  description:
    "AI가 읽어주는 나의 디지털 관상. 이메일과 디지털 흔적 몇 가지로 — 메인캐와 숨은 부캐, 매일 다른 나를 발견하세요.",
  metadataBase: new URL(BASE),
  openGraph: {
    title: "NADIPE · 당신은 한 명이 아닙니다",
    description: "AI가 읽는 나의 디지털 관상. 메인캐와 숨은 부캐, 그리고 매일 다른 나의 페르소나.",
    siteName: "NADIPE",
    type: "website",
    locale: "ko_KR"
  },
  twitter: {
    card: "summary_large_image",
    title: "NADIPE · 당신은 한 명이 아닙니다",
    description: "AI가 읽어주는 나의 디지털 관상."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700;900&family=Noto+Sans+KR:wght@300;400;500;700&display=swap"
        />
      </head>
      <body className="stars relative overflow-x-hidden">{children}</body>
    </html>
  );
}
