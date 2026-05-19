import type { Metadata } from "next";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "NADIFE · 나의 디지털 페르소나",
  description:
    "AI가 읽은 당신의 디지털 관상. 당신은 한 명이 아닙니다 — 메인캐와 부캐, 그리고 매일 다른 당신을 만나보세요.",
  metadataBase: new URL(BASE),
  openGraph: {
    title: "NADIFE · 당신은 한 명이 아닙니다",
    description: "AI가 잡아낸 나의 디지털 부캐. 당신도 몰랐던 또 다른 당신.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "NADIFE · 당신은 한 명이 아닙니다",
    description: "AI가 잡아낸 나의 디지털 부캐."
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
