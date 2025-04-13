'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-white relative">
      {/* 로고 섹션 - 화면 상단에서 약 40% 위치 */}
      <div className="absolute top-[40%] transform -translate-y-1/2">
        <div className="relative w-24 h-24">
          <Image
            src="/logo-animation.svg"
            alt="Nutri AI Logo"
            width={96}
            height={96}
            className="animate-spin-slow"
          />
        </div>
      </div>

      {/* 텍스트 섹션 - 화면 중앙 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 text-center w-full">
        <h1 className="text-[28px] font-medium text-gray-900 leading-tight">
          <span className="font-bold text-[34px]">NUTRI AI</span>에<br />
          오신걸 환영합니다.
        </h1>
        <p className="mt-16 text-gray-600 text-lg leading-relaxed">
          사용자의 건강 데이터를 바탕으로<br />
          <span className="text-blue-600">맞춤형 영양 루틴</span>을 설계해드려요.
        </p>
      </div>

      {/* 버튼 섹션 - 화면 하단 */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-full px-8">
        <Link
          href="/login"
          className="block w-full max-w-md mx-auto py-4 text-lg text-white font-medium bg-blue-600 rounded-full text-center"
        >
          시작하기
        </Link>
      </div>
    </main>
  )
}
