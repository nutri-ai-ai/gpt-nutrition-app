'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/context/auth-context'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

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

  useEffect(() => {
    const checkSession = async () => {
      const tempId = localStorage.getItem('tempId')
      const lastActiveTime = localStorage.getItem('last_active_time')
      // 이메일 인증 체크 로직 제거
      
      if (!tempId || !lastActiveTime) {
        router.push('/signup-v2/email')
        return
      }

      // 30분 초과 시 세션 만료
      const lastActive = parseInt(lastActiveTime)
      const now = Date.now()
      const diffMinutes = (now - lastActive) / (1000 * 60)
      
      if (diffMinutes > 30) {
        // 세션 만료 시 정리
        localStorage.removeItem('tempId')
        localStorage.removeItem('last_active_time')
        // 이메일 관련 체크 제거
        router.push('/signup-v2/email')
        return
      }
      
      // 세션 활성 시간 업데이트
      localStorage.setItem('last_active_time', now.toString())
      
      // 사용자 이름 가져오기
      const storedName = localStorage.getItem('signup_name')
      if (storedName) {
        setName(storedName)
      } else {
        // localStorage에 없으면 Firestore에서 가져오기
        try {
          const userRef = doc(db, 'users', tempId)
          const userDoc = await getDoc(userRef)
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.name) {
              setName(userData.name)
            }
          }
        } catch (error) {
          console.error('사용자 데이터 로드 오류:', error)
        }
      }
      
      setIsLoading(false)
      setMounted(true)
    }
    
    checkSession()
  }, [router])

  useEffect(() => {
    if (!mounted) return
    
    const sequence = [
      setTimeout(() => setShowFireworks(true), 500),
      setTimeout(() => setShowFireworks(false), 2500),
      setTimeout(() => setStep(1), 3000),
      setTimeout(() => setStep(0), 5000),
      setTimeout(() => setStep(2), 5500),
      setTimeout(() => setStep(0), 7500),
      setTimeout(() => setStep(3), 8000),
      setTimeout(() => setStep(0), 10000),
      setTimeout(() => {
        router.push('/signup-v2/survey')
      }, 10500),
    ]

    return () => sequence.forEach(clearTimeout)
  }, [mounted, router])

  useEffect(() => {
    if (mounted && showFireworks && fireworksContainerRef.current) {
      // 폭죽 효과 초기화
      const container = fireworksContainerRef.current
      container.style.opacity = '1'
      
      return () => {
        container.style.opacity = '0'
      }
    }
  }, [mounted, showFireworks])

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

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">불러오는 중...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 relative overflow-hidden">
      {/* 오류 메시지 */}
      {error && (
        <div className="absolute top-5 left-0 right-0 mx-auto w-full max-w-md bg-red-100 p-3 rounded-lg text-center text-red-600 z-50">
          {error}
        </div>
      )}
      
      {/* 폭죽 효과 */}
      {mounted && showFireworks && (
        <div 
          ref={fireworksContainerRef}
          className="fixed inset-0 pointer-events-none z-0 opacity-0 transition-opacity duration-500"
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

      {/* 메시지 */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className={`text-center transition-all duration-1000 ${
          step === 0 ? 'opacity-0 transform translate-y-8' : 'opacity-100 transform translate-y-0'
        }`}>
          {step === 1 && (
            <p className="text-3xl font-bold text-gray-800 animate-fade-up">
              {name}님 반가워요!
            </p>
          )}
          {step === 2 && (
            <p className="text-2xl text-gray-600 animate-fade-up leading-relaxed">
              이제 AI가 {name}님의<br />
              건강설문조사를 시작할게요
            </p>
          )}
          {step === 3 && (
            <p className="text-2xl text-gray-600 animate-fade-up leading-relaxed">
              이를 기반으로 인공지능이<br />
              {name}님만을 위한<br />
              영양설계를 해드릴게요
            </p>
          )}
        </div>
      </div>

      {mounted && (
        <style jsx global>{`
          .fireworks-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }

          .sparkle {
            width: 6px;
            height: 6px;
          }

          .sparkle-inner {
            position: relative;
            width: 100%;
            height: 100%;
          }

          .sparkle-inner::before,
          .sparkle-inner::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: currentColor;
            animation: sparkle 1.5s ease-in-out infinite;
          }

          .sparkle-inner::after {
            animation-delay: -0.75s;
          }

          @keyframes sparkle {
            0%, 100% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1);
              opacity: 1;
            }
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0) translateX(0);
            }
            50% {
              transform: translateY(-20px) translateX(10px);
            }
          }

          @keyframes fade-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fade-up {
            animation: fade-up 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
        `}</style>
      )}
    </main>
  )
} 