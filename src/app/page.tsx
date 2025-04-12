'use client'

import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function Home() {
  const router = useRouter()

  return (
<main className="min-h-screen bg-white flex items-center justify-center px-4">
  <div className="w-full max-w-md flex flex-col items-center text-center space-y-8">
    {/* 로고 및 환영 메시지 */}
    <br/>


    <div className="flex flex-col items-start w-full space-y-4">
      <img
        src="/path/to/logo.png"  // 실제 로고 파일 경로로 교체해주세요
        alt="NUTRI AI 로고"
        className="w-24 h-24 object-cover mb-4"
      />
      
      <h1 className="text-4xl font-bold text-black-600 text-left">
        <span className="font-bold">NUTRI AI</span>에 <br />
        오신 걸 환영합니다!
      </h1>
    </div>


    {/* 설명 텍스트 */}
    <p className="text-gray-600 text-lg leading-relaxed">
    
      사용자의 건강 데이터를 바탕으로 <br />
      <span className="text-blue-600 font-semibold">맞춤형 영양 루틴</span>을 설계해드려요.
      <br/>
    <br/>
    <br/>
    <br/>
    <br/>
    <br/>
 
  
    </p>

    {/* 시작하기 버튼 */}
    <div className="w-full mt-8">
      <Button
        variant="primary"
        onClick={() => router.push('/login')}
        className="w-full py-6 text-xl text-white bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        시작하기
      </Button>
    </div>
  </div>
</main>

  )
}
