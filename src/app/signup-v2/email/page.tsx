'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/context/auth-context'
import { auth, db } from '@/lib/firebase'
import { sendEmailVerification, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'

// CheckCircle 컴포넌트를 직접 구현
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// 자주 사용하는 이메일 도메인 목록
const EMAIL_DOMAINS = [
  'naver.com',
  'gmail.com',
  'daum.net',
  'hanmail.net',
  'nate.com',
  'kakao.com',
  '직접입력'
]

export default function EmailVerificationPage() {
  const router = useRouter()
  const { checkEmail } = useAuth()
  
  const [email, setEmail] = useState('')
  const [isEmailValid, setIsEmailValid] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // 세션 체크
    const lastActiveTime = localStorage.getItem('last_active_time')
    const tempId = localStorage.getItem('tempId')

    if (lastActiveTime && tempId) {
      // 이미 시작된 세션이 있는 경우
      const now = Date.now()
      const diff = now - parseInt(lastActiveTime)
      
      // 30분 이내의 세션이면 소개 페이지로 이동
      if (diff < 30 * 60 * 1000) {
        router.push('/signup-v2/intro')
        return
      }
    }
  }, [router])

  // 이메일 유효성 검사 함수
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 이메일 변경 핸들러
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsEmailValid(validateEmail(newEmail));
    setError('');
  };

  // 이메일 인증 전송 핸들러
  const handleSendVerification = async () => {
    if (!isEmailValid) return;
    
    setLoading(true);
    setError('');
    
    try {
      // 임시 비밀번호로 계정 생성
      const tempPassword = Math.random().toString(36).slice(-8);
      
      // Firebase에 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
      
      // 이메일 인증 전송
      await sendEmailVerification(userCredential.user);
      
      // 로컬 스토리지에 정보 저장
      const tempId = `temp_${Date.now()}`;
      localStorage.setItem('tempId', tempId);
      localStorage.setItem('email', email);
      localStorage.setItem('last_active_time', Date.now().toString());
      localStorage.setItem('email_verified', 'false');
      
      // Firestore에 임시 사용자 생성
      await setDoc(doc(db, 'users', tempId), {
        email: email,
        createdAt: new Date().toISOString(),
        isTemporary: true
      });
      
      setIsSent(true);
      
      // 이메일 인증 상태 체크를 위한 인터벌 설정
      const checkVerificationStatus = setInterval(async () => {
        try {
          // 현재 사용자 상태 새로고침
          await userCredential.user.reload();
          
          // 이메일 인증 완료 여부 확인
          if (userCredential.user.emailVerified) {
            // 인증 완료 시 로컬 스토리지 업데이트
            localStorage.setItem('email_verified', 'true');
            clearInterval(checkVerificationStatus);
            
            // 성공 메시지로 표시 (에러가 아닌 정보 메시지)
            setError('');
            // 인증 완료된 상태 UI 새로고침을 위해 컴포넌트 상태 업데이트
            setIsSent(true); // 이미 true지만 상태 업데이트 트리거를 위해
          }
        } catch (error) {
          console.error('인증 상태 확인 중 오류:', error);
          clearInterval(checkVerificationStatus);
        }
      }, 5000); // 5초마다 확인
      
      // 5분 후에 인터벌 종료 (타임아웃)
      setTimeout(() => {
        clearInterval(checkVerificationStatus);
      }, 5 * 60 * 1000);
      
    } catch (error: any) {
      console.error('인증 이메일 전송 오류:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다. 다른 이메일을 사용해주세요.');
      } else {
        setError('인증 이메일 전송 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // 다른 이메일 사용 핸들러
  const handleUseAnotherEmail = () => {
    setEmail('');
    setIsSent(false);
    setError('');
    signOut(auth); // 현재 로그인된 사용자 로그아웃
  };

  // 다음 단계로 이동 핸들러
  const handleNextStep = () => {
    const isVerified = localStorage.getItem('email_verified') === 'true';
    
    if (!isVerified) {
      setError('이메일 인증이 완료되지 않았습니다. 이메일 인증 링크를 클릭하신 후 다시 시도해주세요.');
      return;
    }
    
    // 인증이 완료되었다면 다음 페이지로 이동
    router.push('/signup-v2/intro');
  };

  // 이메일 인증 완료 여부
  const isEmailVerified = localStorage.getItem('email_verified') === 'true';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="relative w-16 h-16 mb-8">
        <Image
          src="/logo-animation.svg"
          alt="Nutri AI Logo"
          width={64}
          height={64}
          className={loading ? "animate-spin-slow" : ""}
        />
      </div>

      <div className="w-full max-w-md">
        {!isSent ? (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h1 className="text-xl font-semibold text-center mb-6">
              이메일을 입력해주세요
            </h1>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  onChange={handleEmailChange}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleSendVerification}
                disabled={!isEmailValid || loading}
                className={`w-full py-3 rounded-lg text-white font-medium text-sm transition-colors ${
                  !isEmailValid || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {loading ? '처리 중...' : '인증 메일 전송'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-center mb-6">
              <div className="mb-4 flex justify-center">
                <CheckCircleIcon className={`h-12 w-12 ${isEmailVerified ? 'text-green-500' : 'text-yellow-500'}`} />
              </div>
              <h2 className="text-xl font-semibold">
                {isEmailVerified ? '이메일 인증 완료!' : '인증 이메일 전송됨'}
              </h2>
              <p className="text-gray-600 mt-2">
                {isEmailVerified 
                  ? `${email} 인증이 완료되었습니다. 다음 단계로 진행해주세요.`
                  : `${email}로 인증 메일을 보냈습니다. 메일함을 확인해주세요.`}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {!isEmailVerified && (
                <div className="text-center text-sm text-gray-500">
                  <p>이메일을 받지 못하셨나요?</p>
                  <button
                    onClick={handleUseAnotherEmail}
                    className="mt-2 font-medium text-blue-600 hover:text-blue-500"
                  >
                    다른 이메일 사용하기
                  </button>
                </div>
              )}

              <button
                onClick={handleNextStep}
                className={`w-full py-3 rounded-lg text-white font-medium text-sm transition-colors ${
                  isEmailVerified 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isEmailVerified ? '다음 단계로 진행' : '다음 단계로'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
