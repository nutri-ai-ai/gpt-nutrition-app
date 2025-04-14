'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { auth } from '@/firebase/config'
import { createUserWithEmailAndPassword } from 'firebase/auth'

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
  const [emailLocal, setEmailLocal] = useState('')
  const [selectedDomain, setSelectedDomain] = useState(EMAIL_DOMAINS[0])
  const [customDomain, setCustomDomain] = useState('')
  const [isCustomDomain, setIsCustomDomain] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // 세션이 있는지 확인
    const tempId = localStorage.getItem('tempId')
    const lastActiveTime = localStorage.getItem('last_active_time')
    
    if (tempId && lastActiveTime) {
      // 30분 이내인지 확인
      const lastActive = parseInt(lastActiveTime)
      const now = Date.now()
      const diffMinutes = (now - lastActive) / (1000 * 60)
      
      if (diffMinutes <= 30) {
        // 세션이 유효하면 인트로 페이지로 리다이렉트
        router.push('/signup-v2/intro')
        return
      }
    }
    
    // 초기화 완료
    setIsInitialized(true)
  }, [router])
  
  // 도메인 선택 처리
  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSelectedDomain(value)
    setIsCustomDomain(value === '직접입력')
    setError('')
  }
  
  // 커스텀 도메인 입력 처리
  const handleCustomDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDomain(e.target.value)
    setError('')
  }
  
  // 이메일 로컬 부분 입력 처리
  const handleEmailLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailLocal(e.target.value)
    setError('')
  }

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 유효성 검사
    if (!emailLocal.trim()) {
      setError('이메일 아이디를 입력해주세요')
      return
    }
    
    // 이메일 도메인 결정
    let domain = selectedDomain
    if (isCustomDomain) {
      if (!customDomain.trim()) {
        setError('이메일 도메인을 입력해주세요')
        return
      }
      domain = customDomain.trim()
    }
    
    const email = `${emailLocal.trim()}@${domain}`
    
    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('유효한 이메일 형식이 아닙니다')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      // signup_name 가져오기
      const name = localStorage.getItem('signup_name') || '사용자'
      
      // Firestore에 임시 사용자 정보 저장
      const docRef = await addDoc(collection(db, 'users'), {
        email: email,
        name: name, // 이름 저장
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        signupStep: 'email'
      })
      
      // 로컬 스토리지에 세션 정보 저장
      localStorage.setItem('tempId', docRef.id)
      localStorage.setItem('last_active_time', Date.now().toString())
      localStorage.setItem('email_verified', 'true')
      localStorage.setItem('email', email)
      
      // 다음 단계로 이동
      router.push('/signup-v2/intro')
    } catch (error: any) {
      console.error('이메일 제출 오류:', error)
      setError('이메일 등록 중 오류가 발생했습니다: ' + error.message)
      setIsSubmitting(false)
    }
  }
  
  // 초기화 전에는 로딩 표시
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500">확인 중...</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white">
      {/* 로고 */}
      <div className="relative w-16 h-16 mb-8">
        <Image
          src="/logo-animation.svg"
          alt="Nutri AI Logo"
          width={64}
          height={64}
          className="animate-spin-slow"
        />
      </div>
      
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-xl font-semibold text-center mb-2">
          회원가입
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          이메일을, 입력해주세요
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 이메일 입력 */}
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  value={emailLocal}
                  onChange={handleEmailLocalChange}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="이메일"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center">
                <span className="mr-2 text-gray-500">@</span>
                {isCustomDomain ? (
                  <input
                    type="text"
                    value={customDomain}
                    onChange={handleCustomDomainChange}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="직접 입력"
                    disabled={isSubmitting}
                  />
                ) : (
                  <select
                    value={selectedDomain}
                    onChange={handleDomainChange}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  >
                    {EMAIL_DOMAINS.map(domain => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            {isCustomDomain && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsCustomDomain(false)}
                  className="text-xs text-blue-500 hover:text-blue-600 mt-1"
                >
                  일반 도메인 선택하기
                </button>
              </div>
            )}
          </div>
          
          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg text-white font-medium text-sm transition-colors ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isSubmitting ? '처리 중...' : '다음'}
          </button>
        </form>
      </div>
    </div>
  )
}
