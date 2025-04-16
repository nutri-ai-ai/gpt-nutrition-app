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
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    let isMounted = true;
    
    const checkAuthenticationAndSession = async () => {
      if (!isMounted) return;
      
      console.log('[인트로] 인증 세션 체크 시작...');
      
      // SessionStorage에도 플래그 설정 (localStorage보다 더 안정적일 수 있음)
      const ssFlag = sessionStorage.getItem('intro_page_loaded');
      if (!ssFlag) {
        sessionStorage.setItem('intro_page_loaded', 'true');
      }
      
      // 리다이렉션 이미 처리 중인지 확인
      const isRedirecting = localStorage.getItem('intro_redirecting');
      if (isRedirecting === 'true') {
        console.log('[인트로] 이미 리다이렉션 진행 중, 중복 실행 방지');
        return;
      }
      
      const emailVerified = localStorage.getItem('email_verified');
      const tempId = localStorage.getItem('tempId');
      const lastActiveTime = localStorage.getItem('last_active_time');
      const currentStep = localStorage.getItem('current_signup_step');
      
      // 로깅 추가
      console.log('[인트로] 세션 체크:', { 
        emailVerified, 
        tempId, 
        lastActive: lastActiveTime ? new Date(parseInt(lastActiveTime)).toISOString() : null,
        currentStep 
      });
      
      // 이메일 인증 정보 부족한 경우 확인
      if (emailVerified !== 'true' || !tempId || !lastActiveTime) {
        console.log('[인트로] 필수 세션 정보 없음, 이메일 페이지로 리다이렉션');
        if (isMounted) {
          // 현재 URL 확인
          const currentUrl = window.location.pathname;
          const baseUrl = window.location.origin;
          console.log(`[인트로] 현재 URL: ${currentUrl}, 리디렉션 시작`);
          
          try {
            // localStorage/sessionStorage 초기화 (충돌 방지)
            sessionStorage.removeItem('intro_page_loaded');
            localStorage.removeItem('intro_redirecting');
            
            // 절대 URL 사용 (기본 도메인 문제 해결)
            const redirectUrl = `${baseUrl}/signup-v2/email`;
            console.log('[인트로] 절대 URL로 리디렉션:', redirectUrl);
            
            // 명시적 리디렉션
            window.location.href = redirectUrl;
          } catch (e) {
            console.error('[인트로] 리디렉션 오류:', e);
            // 오류시 대체 방법
            document.location.href = '/signup-v2/email';
          }
          return;
        }
        return;
      }
      
      // 세션 타임아웃 확인
      const lastActive = parseInt(lastActiveTime);
      const now = Date.now();
      const diffMinutes = (now - lastActive) / (1000 * 60);
      
      if (diffMinutes > 30) {
        console.log('[인트로] 세션 만료, 이메일 페이지로 리다이렉션');
        if (isMounted) {
          const baseUrl = window.location.origin;
          window.location.href = `${baseUrl}/signup-v2/email`;
        }
        return;
      }
      
      try {
        // 중복 리다이렉션 방지
        localStorage.setItem('intro_redirecting', 'true');
        
        // 이전 리다이렉션 상태 제거
        localStorage.removeItem('redirecting_to_intro');
        
        // 사용자 데이터 로드
        console.log('[인트로] 사용자 데이터 로드 시도:', tempId);
        if (!db) {
          console.error('[인트로] Firestore가 초기화되지 않았습니다');
          localStorage.removeItem('intro_redirecting');
          if (isMounted) {
            setError('시스템 초기화 중 오류가 발생했습니다');
            setIsInitialized(true);
          }
          return;
        }
        const userDoc = await getDoc(doc(db, 'users', tempId));
        
        if (!userDoc.exists()) {
          console.log('[인트로] 사용자 데이터 없음, 이메일 페이지로 리다이렉션');
          localStorage.removeItem('intro_redirecting');
          if (isMounted) {
            const baseUrl = window.location.origin;
            window.location.href = `${baseUrl}/signup-v2/email`;
          }
          return;
        }
        
        // 로컬 스토리지 업데이트
        localStorage.setItem('last_active_time', now.toString());
        localStorage.setItem('current_signup_step', 'intro');
        
        // 회원가입 진행 중임을 표시하는 쿠키 설정
        document.cookie = 'signup_in_progress=true; path=/; max-age=10800; SameSite=Lax';
        console.log('[인트로] 세션 확인 완료, 진행 중 쿠키 설정');
        
        // 사용자 이름 가져오기
        const storedName = localStorage.getItem('signup_name');
        if (storedName) {
          setName(storedName);
        } else {
          // localStorage에 없으면 Firestore에서 가져오기
          const userData = userDoc.data();
          if (userData && userData.name) {
            setName(userData.name);
            localStorage.setItem('signup_name', userData.name);
          }
        }
        
        // 성공적으로 진행됨을 SessionStorage에 저장
        sessionStorage.setItem('from_email_verification', 'true');
        
        // 리다이렉션 플래그 제거
        localStorage.removeItem('intro_redirecting');
        
        // 상태 업데이트하여 로딩 종료
        if (isMounted) {
          console.log('[인트로] 로딩 완료, UI 표시 준비');
          setIsLoading(false);
          setMounted(true);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[인트로] 사용자 정보 확인 오류:', error);
        // 오류 발생 시에도 초기화 완료하여 로딩에서 벗어나도록 함
        if (isMounted) {
          setError('사용자 정보를 불러오는 중 오류가 발생했습니다');
          setIsInitialized(true);
          localStorage.removeItem('intro_redirecting');
        }
      }
    };
    
    // 페이지가 완전히 마운트된 후 검증 로직 실행
    console.log('[인트로] 페이지 마운트, 세션 체크 예약');
    const timerId = setTimeout(checkAuthenticationAndSession, 300);
    
    return () => {
      console.log('[인트로] 컴포넌트 언마운트');
      isMounted = false;
      clearTimeout(timerId);
      
      // 컴포넌트 언마운트 시 필요한 상태 제거
      if (typeof window !== 'undefined') {
        localStorage.removeItem('intro_redirecting');
      }
    };
  }, [router]);

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
        // 회원가입 진행 중 쿠키 갱신 후 다음 페이지로 이동
        document.cookie = 'signup_in_progress=true; path=/; max-age=10800; SameSite=Lax';
        console.log('인트로 종료, 설문 페이지로 이동 준비');
        setTimeout(() => {
          router.push('/signup-v2/survey')
        }, 500);
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

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500">로딩 중...</p>
      </div>
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