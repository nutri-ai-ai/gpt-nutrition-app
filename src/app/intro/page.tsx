'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function IntroPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const name = searchParams.get('name') || '사용자'

  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),   // "다시 오셨네요"
      setTimeout(() => setStep(2), 2000),  // 사라짐
      setTimeout(() => setStep(3), 2500),  // "건강관리를 시작할게요"
      setTimeout(() => setStep(4), 4000),  // 사라짐
      setTimeout(() => {
        router.push(`/chat?name=${encodeURIComponent(name)}`)
      }, 4500),
    ]

    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-2xl font-semibold text-gray-800 transition-opacity duration-3000 ease-in-out">
        {step === 1 && <p className="opacity-100 animate-fade-in-out">{name}님, 다시 오셨네요</p>}
        {step === 3 && <p className="opacity-100 animate-fade-in-out">NUTRI-AI가 건강관리를 시작할게요</p>}
      </div>

      <style jsx>{`
        .animate-fade-in-out {
          animation: fadeInOut 2s ease-in-out forwards;
        }
        @keyframes fadeInOut {
          0% { opacity: 0; filter: blur(5px); }
          30% { opacity: 1; filter: blur(0); }
          70% { opacity: 1; filter: blur(0); }
          100% { opacity: 0; filter: blur(5px); }
        }
      `}</style>
    </main>
  )
}
