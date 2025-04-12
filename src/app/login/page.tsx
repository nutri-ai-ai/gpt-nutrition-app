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
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">로그인</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">ID</label>
            <input
              type="text"
              name="id"
              value={form.id}
              onChange={handleChange}
              className="px-3 py-2 border border-gray-300 rounded-md"
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
              className="px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <button type="submit" className="w-full mt-4 bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition">
            로그인
          </button>
        </form>
      </div>
    </main>
  )
}
