'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [id, setId] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'id') setId(value)
    if (name === 'newPassword') setNewPassword(value)
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!id || !newPassword) {
      alert('ID와 새 비밀번호를 입력해주세요.')
      return
    }

    try {
      // Firestore에서 해당 ID의 사용자 문서를 찾고 비밀번호 변경
      const userDocRef = doc(db, 'users', id)
      await updateDoc(userDocRef, { password: newPassword })

      alert('비밀번호가 성공적으로 변경되었습니다.')
      router.push('/login') // 로그인 페이지로 리디렉션
    } catch (error) {
      console.error('비밀번호 변경 오류:', error)
      alert('비밀번호 변경 중 오류가 발생했습니다.')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">비밀번호 찾기</h1>

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">ID</label>
            <input
              type="text"
              name="id"
              value={id}
              onChange={handleChange}
              className="px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">새 비밀번호</label>
            <input
              type="password"
              name="newPassword"
              value={newPassword}
              onChange={handleChange}
              className="px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
          >
            비밀번호 변경
          </button>
        </form>
      </div>
    </main>
  )
}
