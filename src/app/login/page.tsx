'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { doc, getDoc, updateDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [displayText, setDisplayText] = useState('')
  const [isTypingComplete, setIsTypingComplete] = useState(false)
  const { signIn } = useAuth()

  useEffect(() => {
    const text = 'NUTRI-AI'
    let currentIndex = 0
    let isDeleting = false
    let pauseCount = 0

    const interval = setInterval(() => {
      if (!isDeleting && currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex))
        currentIndex++
        if (currentIndex > text.length) {
          pauseCount = 20 // 약 2초 대기
          isDeleting = false
          setIsTypingComplete(true)
        }
      } else if (pauseCount > 0) {
        pauseCount--
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const handleLogin = async () => {
    try {
      if (!username.trim()) {
        setError('아이디를 입력해주세요')
        return
      }
      
      if (!password.trim()) {
        setError('비밀번호를 입력해주세요')
        return
      }
      
      setIsLoading(true)
      setError('')
      
      // useAuth의 signIn 함수 사용
      const user = await signIn(username, password)
      
      // 로그인 기록 업데이트
      const userStatsRef = doc(db, 'userStats', user.uid)
      const userStatsDoc = await getDoc(userStatsRef)

      if (userStatsDoc.exists()) {
        await updateDoc(userStatsRef, {
          loginCount: increment(1),
          lastLoginAt: serverTimestamp(),
        })
      } else {
        await setDoc(userStatsRef, {
          userId: user.uid,
          username: username,
          loginCount: 1,
          firstLoginAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        })
      }

      // IP 주소 가져오기
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json')
        const { ip } = await ipResponse.json()

        // 로그인 로그 저장
        await fetch('/api/login-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            username: username,
            ipAddress: ip,
            userAgent: navigator.userAgent,
          }),
        })
      } catch (ipError) {
        console.error('IP 정보 가져오기 실패:', ipError)
      }

      // 로그인 성공 후 대시보드로 이동
      router.push('/dashboard')
    } catch (error: any) {
      console.error('로그인 오류:', error)
      setError(error.message || '로그인에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-3 bg-gradient-to-b from-blue-50 to-white">
      {/* 로고 */}
      <div className="relative w-12 h-12 mb-3">
        <Image
          src="/logo-animation.svg"
          alt="Nutri AI Logo"
          width={48}
          height={48}
          className="animate-spin-slow"
        />
      </div>

      {/* 메인 컨텐츠 */}
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center">
            <p className="text-[10px] font-medium text-blue-500 tracking-[0.2em] font-mono">
              {displayText}
              <span className={`inline-block w-[2px] h-[8px] bg-blue-500 ml-[1px] ${isTypingComplete ? 'animate-cursor' : ''}`}>
              </span>
            </p>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            로그인
          </h2>
        </div>

        {error && (
          <div className="text-red-500 text-xs text-center bg-red-50 p-1.5 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-2.5">
          <input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-sm placeholder:text-gray-400"
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('password-input')?.focus()}
          />
          <input
            id="password-input"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-sm placeholder:text-gray-400"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </div>

        <div className="w-full pt-1.5">
          <Link
            href="/signup-v2"
            className="block text-xs text-blue-500 hover:text-blue-600 text-right transition-colors"
          >
            아직도 건강관리 AI가 없으신가요? 회원가입
          </Link>
        </div>
      </div>
    </div>
  )
}
