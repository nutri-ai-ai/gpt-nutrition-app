'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ThankYouPage() {
  const router = useRouter()

  useEffect(() => {
    // 감사 페이지로 리디렉션 후 자동으로 홈으로 돌아가도록 5초 딜레이를 줄 수 있음
    setTimeout(() => {
      router.push('/') // 홈으로 리디렉션
    }, 5000)
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-green-500">구독이 완료되었습니다!</h1>
        <p className="text-lg mt-4">감사합니다! 구독이 완료되었습니다. 잠시 후 메인 페이지로 이동합니다.</p>
      </div>
    </main>
  )
}
