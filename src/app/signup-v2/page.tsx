'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface SignupData {
  name: string
}

export default function SignupV2Page() {
  const router = useRouter()
  const [signupData, setSignupData] = useState<SignupData>({
    name: ''
  })

  const handleNext = () => {
    if (signupData.name.trim()) {
      // 이름을 localStorage에 저장
      localStorage.setItem('signup_name', signupData.name.trim())
      // 이메일 인증 페이지로 이동
      router.push('/signup-v2/email')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 relative">
      {/* 로고 - 고정 위치 */}
      <div className="absolute top-[20%] text-center">
        <div className="relative w-24 h-24 mx-auto">
          <Image
            src="/logo-animation.svg"
            alt="Nutri AI Logo"
            width={96}
            height={96}
            className="animate-spin-slow"
          />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
          NUTRI - AI
        </h1>
      </div>

      {/* 이름 입력 폼 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4">
        <div className="space-y-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800">
            사용자님의 이름을 알려주세요
          </h2>
          <div className="flex flex-col items-center space-y-4">
            <input
              type="text"
              value={signupData.name}
              onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
              className="w-full max-w-xs px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              placeholder="이름"
            />
            <button
              onClick={handleNext}
              disabled={!signupData.name.trim()}
              className={`w-full max-w-xs py-3 px-6 rounded-lg transition-colors ${
                signupData.name.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              시작
            </button>
          </div>
        </div>
      </div>

      {/* 하단 안내 문구 */}
      <div className="absolute bottom-8 text-center w-full px-4">
        <p className="text-gray-600 text-lg font-medium leading-relaxed">
          AI-개인맞춤형 건강설계로<br />
          스마트한 건강생활을 시작하세요
        </p>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </main>
  )
} 