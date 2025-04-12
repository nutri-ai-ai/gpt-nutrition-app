'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function LoginPage() {
  const router = useRouter()

  // 초기 state 정의
  const [form, setForm] = useState({
    id: '',
    password: '',
  })

  // 폼 필드 변경 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // 로그인 처리
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.id || !form.password) {
      alert('ID와 비밀번호를 입력해주세요.')
      return
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', form.id))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        // 비밀번호 확인 후 로그인 처리
        if (userData.password === form.password) {
          alert('로그인 성공!')
          // 로컬 스토리지에 저장
          localStorage.setItem('username', form.id)
          localStorage.setItem('password', form.password)
          router.push('/intro')
        } else {
          alert('비밀번호가 틀렸습니다.')
        }
      } else {
        alert('존재하지 않는 사용자입니다.')
      }
    } catch (error) {
      console.error("로그인 에러:", error)
      alert('로그인 처리 중 오류 발생')
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">  {/* 배경을 하얗게 수정 */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-6">
          {/* 로고 이미지 */}
          <img src="/path/to/logo.png" alt="NUTRI AI 로고" className="w-24 h-24 object-cover" />
        </div>
        
        <h1 className="text-2xl font-bold text-blue-700 text-center mb-4">
          NUTRI AI에 오신 걸 환영합니다!
        </h1>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">아이디</label>
            <input
              type="text"
              name="id"
              value={form.id}
              onChange={handleChange}
              className="px-4 py-2 border border-gray-300 rounded-md"
              placeholder="이메일 주소"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">비밀번호</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="px-4 py-2 border border-gray-300 rounded-md"
              placeholder="비밀번호"
              required
            />
          </div>

          <div className="flex justify-between text-sm">
          <a href="#" onClick={() => router.push('/forgot-password')} className="text-blue-600 hover:text-blue-700">비밀번호를 잊으셨나요?</a>
            <a href="#" onClick={() => router.push('/signup')} className="text-blue-600 hover:text-blue-700">회원가입</a>
          </div>

          <button type="submit" className="w-full mt-6 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition">
            로그인
          </button>
        </form>
      </div>
    </main>
  )
}
