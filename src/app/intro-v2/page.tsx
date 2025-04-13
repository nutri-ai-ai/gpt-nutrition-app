'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/context/auth-context'

export default function IntroV2Page() {
  const router = useRouter()
  const { updateUserSignupData } = useAuth()
  const [step, setStep] = useState(0)
  const [name, setName] = useState<string>('사용자')
  const [showFireworks, setShowFireworks] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const fireworksContainerRef = useRef<HTMLDivElement>(null)

  // 스파클 위치 설정을 위한 배열
  const sparklePositions = [
    { top: '30%', left: '20%' },
    { top: '25%', left: '40%' },
    { top: '35%', left: '60%' },
    { top: '40%', left: '80%' },
    { top: '60%', left: '25%' },
    { top: '55%', left: '45%' },
    { top: '50%', left: '65%' },
    { top: '45%', left: '85%' },
    { top: '70%', left: '30%' },
    { top: '65%', left: '50%' },
    { top: '75%', left: '70%' },
    { top: '80%', left: '90%' },
  ]

  const sparkleColors = [
    '#FFB6C1', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C',
    '#B0C4DE', '#E6E6FA', '#F5DEB3', '#98FF98', '#FFB6C1',
    '#87CEFA', '#DDA0DD'
  ]

  useEffect(() => {
    let isMounted = true
    const initializeSession = async () => {
      try {
        // 페이지 접근 제어
        const emailVerified = localStorage.getItem('email_verified')
        const tempId = localStorage.getItem('tempId')
        const lastActiveTime = localStorage.getItem('last_active_time')
        const storedName = localStorage.getItem('signup_name')
        
        if (!emailVerified || !tempId || !lastActiveTime) {
          router.replace('/signup-v2/phone')
          return
        }

        // 세션 만료 체크 (30분)
        const lastActive = parseInt(lastActiveTime)
        const now = Date.now()
        if (now - lastActive > 30 * 60 * 1000) {
          router.replace('/signup-v2/phone')
          return
        }
        
        // 세션 활성 시간 업데이트
        localStorage.setItem('last_active_time', now.toString())

        if (storedName && isMounted) {
          setName(storedName)
        }
        
        if (isMounted) {
          setMounted(true)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('초기화 오류:', error)
        if (isMounted) {
          setError('페이지 초기화 중 오류가 발생했습니다')
          setIsLoading(false)
        }
      }
    }

    initializeSession()

    return () => {
      isMounted = false
    }
  }, [router])

  useEffect(() => {
    if (!mounted) return

    // 초기 딜레이 후 시작
    const initialDelay = setTimeout(() => {
      setShowFireworks(true)
    }, 500)

    const sequence = [
      setTimeout(() => setShowFireworks(false), 3000),
      setTimeout(() => setStep(1), 3500),
      setTimeout(() => setStep(2), 6000),
      setTimeout(() => setStep(3), 8500),
      setTimeout(() => {
        router.push('/signup-v2/survey')
      }, 11000),
    ]

    return () => {
      clearTimeout(initialDelay)
      sequence.forEach(clearTimeout)
    }
  }, [mounted, router])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 relative overflow-hidden">
      <style jsx>{`
        .sparkle {
          position: absolute;
          width: 20px;
          height: 20px;
          pointer-events: none;
        }
        .sparkle-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: currentColor;
          animation: sparkle 1.5s ease-in-out infinite;
          opacity: 0.8;
          box-shadow: 0 0 10px currentColor;
        }
        @keyframes sparkle {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(0); opacity: 0; }
        }
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
          100% { transform: translateY(0) rotate(360deg); }
        }
        .text-fade {
          opacity: 0;
          transform: translateY(20px);
          animation: textFade 2s ease-in-out forwards;
        }
        @keyframes textFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .logo-container {
          position: absolute;
          top: 30%;
          left: 50%;
          transform: translateX(-50%);
        }
        .text-container {
          position: absolute;
          top: 60%;
          left: 0;
          right: 0;
          min-height: 120px; /* 텍스트 영역의 최소 높이 */
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      {/* 폭죽 효과 */}
      {showFireworks && (
        <div 
          ref={fireworksContainerRef}
          className="fixed inset-0 pointer-events-none z-10"
        >
          {sparklePositions.map((pos, i) => (
            <div
              key={i}
              className="sparkle absolute"
              style={{
                top: pos.top,
                left: pos.left,
                color: sparkleColors[i],
                animation: `float ${2 + (i % 3)}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`
              }}
            >
              <div className="sparkle-inner"></div>
            </div>
          ))}
        </div>
      )}

      {/* 로고 */}
      <div className="logo-container">
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

      {/* 텍스트 영역 */}
      <div className="text-container">
        {step === 1 && (
          <p className="text-3xl font-bold text-gray-800 text-fade">
            {name}님! 반가워요
          </p>
        )}
        {step === 2 && (
          <p className="text-2xl text-gray-600 text-fade">
            이제 AI가 {name}님의<br />
            건강상태를 체크하고
          </p>
        )}
        {step === 3 && (
          <p className="text-2xl text-gray-600 text-fade">
            맞춤 영양설계를<br />
            시작하겠습니다
          </p>
        )}
      </div>

      <style jsx>{`
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
} 