'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PaymentPage() {
  const router = useRouter()
  
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null)

  useEffect(() => {
    const storedDetails = sessionStorage.getItem('nutri_subscription')
    if (storedDetails) {
      setSubscriptionDetails(JSON.parse(storedDetails))
    } else {
      router.push('/') // 구독 정보가 없으면 홈으로 리디렉션
    }
  }, [])

  // 상품명 변경 로직
  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'monthly':
        return '뉴트리 데일리 영양플랜 (월간플랜)'
      case 'annual':
        return '뉴트리 데일리 영양플랜 (연간플랜)'
      case 'once':
        return '뉴트리 데일리 영양플랜 (1개월 단기플랜)'
      default:
        return '뉴트리 데일리 영양플랜'
    }
  }

  const handlePaymentSuccess = () => {
    // 실제 결제 처리 로직이 구현되어야 할 곳
    // 결제 완료 후, /thank-you로 이동
    router.push('/thank-you')
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-blue-700 mb-6">결제 정보</h1>
      
      {subscriptionDetails ? (
        <div>
          <h2 className="text-lg font-semibold">상품명: {getPlanName(subscriptionDetails.plan)}</h2>
          <p className="text-lg">결제 금액: {subscriptionDetails.amountPaid.toLocaleString()}원</p>

          {/* 결제 처리 UI (가상의 결제 버튼) */}
          <button
            onClick={handlePaymentSuccess}
            className="w-full bg-green-500 text-white py-4 rounded-lg text-lg font-bold hover:bg-green-600 transition"
          >
            결제하기
          </button>
        </div>
      ) : (
        <p>구독 정보가 없습니다.</p>
      )}
    </main>
  )
}
