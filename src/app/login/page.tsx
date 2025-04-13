'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    id: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // 사용자 정보 확인
      const userDoc = await getDoc(doc(db, "users", form.id))
      const userData = userDoc.data()

      if (!userData) {
        toast.error('존재하지 않는 아이디입니다.', {
          duration: 2000,
          position: 'bottom-center',
          style: {
            background: '#EF4444',
            color: '#ffffff',
            fontSize: '16px',
            padding: '16px',
            borderRadius: '12px',
          }
        })
        return
      }

      // 비밀번호 확인 후 로그인 처리
      if (userData.password === form.password) {
        // 로컬 스토리지에 저장
        localStorage.setItem('username', form.id)
        localStorage.setItem('password', form.password)
        
        // 로그인 성공 알림창 표시 후 페이지 이동
        toast.success('로그인 성공!', {
          duration: 1500,
          position: 'bottom-center',
          style: {
            background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
            color: '#ffffff',
            fontSize: '16px',
            padding: '16px 24px',
            borderRadius: '12px',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
          icon: '🎉'
        });

        // 토스트 알림이 표시된 후 페이지 이동
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.push('/intro');
      } else {
        toast.error('비밀번호가 틀렸습니다.', {
          duration: 2000,
          position: 'bottom-center',
          style: {
            background: '#EF4444',
            color: '#ffffff',
            fontSize: '16px',
            padding: '16px',
            borderRadius: '12px',
          }
        })
      }
    } catch (error) {
      console.error('로그인 에러:', error)
      toast.error('로그인 중 오류가 발생했습니다.', {
        duration: 2000,
        position: 'bottom-center',
        style: {
          background: '#EF4444',
          color: '#ffffff',
          fontSize: '16px',
          padding: '16px',
          borderRadius: '12px',
        }
      })
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-white relative">
      {/* 로고 섹션 - 화면 상단에서 약 35% 위치 */}
      <div className="absolute top-[35%] transform -translate-y-1/2">
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
      <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 text-center w-full">
        <h1 className="text-[28px] font-medium text-gray-900 leading-tight mb-12">
          <span className="font-bold text-[34px]">NUTRI AI</span>
        </h1>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto px-8">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="아이디"
              value={form.id}
              onChange={(e) => setForm(prev => ({ ...prev, id: e.target.value }))}
              className="w-full px-4 py-3 rounded-full bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={form.password}
              onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 rounded-full bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            className="w-full mt-8 py-4 text-lg text-white font-medium bg-blue-600 rounded-full text-center"
          >
            로그인
          </button>

          {/* 회원가입 링크 */}
          <div className="mt-4 text-center">
            <Link href="/signup" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              회원이 아니신가요? 회원가입
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
