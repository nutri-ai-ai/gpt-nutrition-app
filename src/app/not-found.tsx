'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageTransition from '@/components/ui/PageTransition';

export default function NotFound() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행되도록 설정
    setIsClient(true);
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">페이지를 찾을 수 없습니다</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          찾으시는 페이지가 존재하지 않거나, 이동되었거나, 일시적으로 사용할 수 없습니다.
        </p>
        <Link 
          href="/" 
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition duration-300"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </PageTransition>
  );
} 