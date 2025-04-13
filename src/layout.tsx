import type { Metadata } from "next";
import { GeistSans } from "geist/font";
import { GeistMono } from "geist/font";
import "./globals.css"; // globals.css 임포트
import { useEffect, useState } from 'react'

export const metadata: Metadata = {
  title: "NUTRI-AI",
  description: "AI-개인맞춤형 건강설계로 스마트한 건강생활을 시작하세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <html lang="ko" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* 다음 주소 검색 스크립트 */}
        <script
          src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
          async
        ></script>
        {/* 구글 리캡챠 스크립트 */}
        <script
          src="https://www.google.com/recaptcha/api.js"
          async
          defer
        ></script>
      </head>
      <body className="antialiased bg-white">
        <div className={isMounted ? "fade-in" : ""}>
          {children}
        </div>
        {isMounted && (
          <style jsx global>{`
            @keyframes fade-in {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .fade-in {
              animation: fade-in 0.5s ease-out forwards;
            }
          `}</style>
        )}
      </body>
    </html>
  );
}
