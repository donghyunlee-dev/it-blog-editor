import type { Metadata } from "next";
import "./globals.css";
import "@sfood/ui/global.css";

export const metadata: Metadata = {
  title: "SFOOD IT Editor",
  description: "SFOOD IT 담당 및 AX팀을 위한 사내 문서 작성 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
