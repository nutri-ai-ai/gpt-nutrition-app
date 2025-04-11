'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NamePage() {
  const router = useRouter()
  const [name, setName] = useState('')

  const handleNext = () => {
    if (!name.trim()) {
      alert('이름을 입력해주세요.')
      return
    }

    router.push(`/signup?name=${encodeURIComponent(name)}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <h1 className="text-2xl font-bold mb-6">이름을 입력하세요</h1>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="border px-4 py-2 rounded text-lg"
        />
        <button
          onClick={handleNext}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          다음으로
        </button>
      </div>
    </main>
  )
}
