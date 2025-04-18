"use client";

// Next.js 13에서 정적/ISR 프리렌더를 막고, 강제로 동적 렌더링
export const dynamic = "force-dynamic";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 실제 로직을 담당하는 클라이언트 컴포넌트
function IntroContent() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);  // 사용자의 이름을 저장
  const [step, setStep] = useState(0);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) {
      router.push('/login'); // 로그인되지 않은 경우 로그인 페이지로 리디렉션
    } else {
      setName(storedUsername);  // 로그인된 사용자 이름을 설정
    }

    const timers = [
      setTimeout(() => setStep(1), 500),   // "다시 오셨네요"
      setTimeout(() => setStep(2), 2000),  // 사라짐
      setTimeout(() => setStep(3), 2500),  // "건강관리를 시작할게요"
      setTimeout(() => setStep(4), 4000),  // 사라짐
      setTimeout(() => {
        router.push(`/chat`);
      }, 4500),
    ];

    return () => timers.forEach(clearTimeout);
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-2xl font-semibold text-gray-800 transition-opacity duration-3000 ease-in-out">
        {step === 1 && (
          <p className="opacity-100 animate-fade-in-out">
            {name ? `${name}님, 다시 오셨네요` : '사용자님, 다시 오셨네요'}
          </p>
        )}
        {step === 3 && (
          <p className="opacity-100 animate-fade-in-out">
            NUTRI-AI가 건강관리를 시작할게요
          </p>
        )}
      </div>

      <style jsx>{`
        .animate-fade-in-out {
          animation: fadeInOut 2s ease-in-out forwards;
        }
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            filter: blur(5px);
          }
          30% {
            opacity: 1;
            filter: blur(0);
          }
          70% {
            opacity: 1;
            filter: blur(0);
          }
          100% {
            opacity: 0;
            filter: blur(5px);
          }
        }
      `}</style>
    </main>
  );
}

// Suspense로 감싸는 래퍼 컴포넌트
export default function IntroPage() {
  return (
    <Suspense fallback={<div>Loading Intro...</div>}>
      <IntroContent />
    </Suspense>
  );
}
