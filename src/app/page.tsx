'use client'

import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="flex flex-col items-center text-center gap-6 py-8">
            <h1 className="text-3xl font-bold text-blue-700 tracking-tight text-balance">
              💊 NUTRI AI에 오신 걸 환영합니다!
            </h1>

            <p className="text-gray-600 leading-loose text-base">
              사용자의 건강 데이터를 바탕으로<br />
              <span className="text-blue-600 font-semibold">맞춤형 영양 루틴</span>을 설계해드려요.
            </p>

            <div className="w-full space-y-2">
              <Button variant="primary" onClick={() => router.push('/login')}>
                로그인
              </Button>
              <Button variant="secondary" onClick={() => router.push('/name')}>
                회원가입
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
