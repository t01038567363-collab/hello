import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "추억 산책 | 10조벌자",
  description: "경남 어르신을 위한 개인 맞춤형 산책 미션 웹 프로토타입",
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
