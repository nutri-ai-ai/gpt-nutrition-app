'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

// 건강구독함 아이템 타입 정의
interface CartItem {
  product: {
    id: string;
    name: string;
    description: string;
    category: string;
    pricePerUnit: number;
    tags: string[];
    dailyDosage: number;
    dosageSchedule: {
      time: "아침" | "점심" | "저녁" | "취침전";
      amount: number;
      withMeal?: boolean;
      reason?: string;
    }[];
    monthlyPrice: number;
    benefits?: string[];
    precautions?: string[];
    reason?: string;
  }
}

export default function SubscriptionPage() {
  const router = useRouter()

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [basePrice, setBasePrice] = useState(0)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | 'once'>('monthly')

  // 금액 상수
  const SHIPPING_COST = 4500
  const SURVEY_DISCOUNT = 10000
  const FIRST_SUBSIDY = 10000

  // 건강구독함 데이터 로드
  useEffect(() => {
    // localStorage에서 건강구독함 데이터 가져오기
    const handleStorageChange = () => {
      try {
        // 실제 구현에서는 여기서 localStorage 또는 전역 상태에서 건강구독함 아이템을 가져와야 함
        // 지금은 테스트를 위해 window 객체에서 임시로 가져옴
        if (typeof window !== 'undefined') {
          const tempCartItems = (window as any).__healthCart || [];
          setCartItems(tempCartItems);
          
          // 기본 가격 계산
          const totalPrice = tempCartItems.reduce((sum: number, item: CartItem) => {
            const monthlyPrice = item.product.monthlyPrice || 
              (item.product.pricePerUnit * 30 * item.product.dailyDosage);
            return sum + monthlyPrice;
          }, 0);
          
          setBasePrice(totalPrice);
        }
      } catch (e) {
        console.error('건강구독함 데이터 로드 실패', e);
      }
    };

    // 초기 로드
    handleStorageChange();

    // 이벤트 구독
    window.addEventListener('healthCartUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('healthCartUpdated', handleStorageChange);
    };
  }, []);

  // 플랜별 계산
  const monthlyDiscount = Math.floor(basePrice * 0.05)
  const annualDiscount = Math.floor(basePrice * 12 * 0.15)

  const monthlyPrice = basePrice - monthlyDiscount - SURVEY_DISCOUNT - FIRST_SUBSIDY
  const annualPrice = (basePrice * 12) - annualDiscount - SURVEY_DISCOUNT - FIRST_SUBSIDY
  const oncePrice = basePrice - SURVEY_DISCOUNT - FIRST_SUBSIDY

  // 건강구독함의 영양제 이름 목록 추출
  const supplementNames = cartItems.map(item => item.product.name)

  const handleSubscribe = async () => {
    // 결제 정보 Firestore에 저장
    const subscriptionData = {
      plan: selectedPlan,
      items: cartItems.map(item => ({
        id: item.product.id,
        name: item.product.name,
        dailyDosage: item.product.dailyDosage,
        monthlyPrice: item.product.monthlyPrice || (item.product.pricePerUnit * 30 * item.product.dailyDosage)
      })),
      amountPaid: calculateTotalAmount(),
      createdAt: serverTimestamp()
    }

    try {
      // Firestore에 결제 정보 저장
      const userRef = collection(db, 'subscriptions')
      await addDoc(userRef, subscriptionData)

      // 결제 정보 sessionStorage에 저장
      sessionStorage.setItem('nutri_subscription', JSON.stringify({
        plan: selectedPlan,
        amountPaid: calculateTotalAmount()
      }))

      // 결제 페이지로 이동
      router.push('/payment') // 결제 페이지로 이동
    } catch (error) {
      console.error('구독 정보 저장 실패:', error)
    }
  }

  // 결제 금액 계산
  const calculateTotalAmount = () => {
    let amount = 0
    if (selectedPlan === 'monthly') amount = monthlyPrice
    else if (selectedPlan === 'annual') amount = annualPrice
    else if (selectedPlan === 'once') amount = oncePrice
    return amount
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-blue-700 mb-6">구독유형 선택</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* 월간 플랜 */}
        <div
          onClick={() => setSelectedPlan('monthly')}
          className={`border rounded-lg p-4 cursor-pointer ${selectedPlan === 'monthly' ? 'border-red-500 shadow-lg' : 'border-gray-300'}`}
        >
          <p className="text-xs text-white bg-red-500 px-2 inline-block rounded mb-1">하루 {Math.floor(monthlyPrice / 30).toLocaleString()}원!</p>
          <h2 className="font-semibold text-lg text-red-500">1개월 영양제 월간플랜</h2>
          <p className="text-xl font-bold">{monthlyPrice.toLocaleString()}원</p>
          <p className="text-gray-500 text-sm mt-2">정기구독 할인혜택 -{(SURVEY_DISCOUNT + FIRST_SUBSIDY + monthlyDiscount).toLocaleString()}원</p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li>✔ 배송비 무료 -{SHIPPING_COST.toLocaleString()}원</li>
            <li>✔ 건강설문 할인(AI) -{SURVEY_DISCOUNT.toLocaleString()}원</li>
            <li>✔ 첫구독 시작 지원금 -{FIRST_SUBSIDY.toLocaleString()}원</li>
            <li>✔ 정기구독 할인 5% -{monthlyDiscount.toLocaleString()}원</li>
          </ul>
          <div className="mt-4">
            <h3 className="font-semibold text-lg">제공되는 영양제:</h3>
            <ul className="text-sm text-gray-600">
              {supplementNames.length > 0 ? (
                supplementNames.map((name, index) => (
                  <li key={index}>✔ {name}</li>
                ))
              ) : (
                <li className="text-gray-400">건강구독함이 비어있습니다</li>
              )}
            </ul>
          </div>
        </div>

        {/* 연간 플랜 */}
        <div
          onClick={() => setSelectedPlan('annual')}
          className={`border rounded-lg p-4 cursor-pointer ${selectedPlan === 'annual' ? 'border-red-500 shadow-lg' : 'border-gray-300'}`}
        >
          <p className="text-xs text-white bg-red-500 px-2 inline-block rounded mb-1">연간 플랜 할인 15%</p>
          <h2 className="font-semibold text-lg text-red-500">12개월 영양제 연간플랜</h2>
          <p className="text-xl font-bold">{annualPrice.toLocaleString()}원</p>
          <p className="text-gray-500 text-sm mt-2">연구독 할인혜택 -{(SURVEY_DISCOUNT + FIRST_SUBSIDY + annualDiscount).toLocaleString()}원</p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li>✔ 배송비 무료 -{(SHIPPING_COST * 12).toLocaleString()}원</li>
            <li>✔ 건강설문 할인(AI) -{SURVEY_DISCOUNT.toLocaleString()}원</li>
            <li>✔ 첫구독 시작 지원금 -{FIRST_SUBSIDY.toLocaleString()}원</li>
            <li>✔ 연구독 할인 15% -{annualDiscount.toLocaleString()}원</li>
          </ul>
          <div className="mt-4">
            <h3 className="font-semibold text-lg">제공되는 영양제:</h3>
            <ul className="text-sm text-gray-600">
              {supplementNames.length > 0 ? (
                supplementNames.map((name, index) => (
                  <li key={index}>✔ {name}</li>
                ))
              ) : (
                <li className="text-gray-400">건강구독함이 비어있습니다</li>
              )}
            </ul>
          </div>
        </div>

        {/* 1회성 구매 */}
        <div
          onClick={() => setSelectedPlan('once')}
          className={`border rounded-lg p-4 cursor-pointer ${selectedPlan === 'once' ? 'border-red-500 shadow-lg' : 'border-gray-300'}`}
        >
          <p className="text-xs text-white bg-gray-500 px-2 inline-block rounded mb-1">1회성</p>
          <h2 className="font-semibold text-lg text-gray-700">1개월 플랜 [1회성]</h2>
          <p className="text-xl font-bold">{oncePrice.toLocaleString()}원</p>
          <p className="text-gray-500 text-sm mt-2">1회구매 할인혜택 -{(SURVEY_DISCOUNT + FIRST_SUBSIDY).toLocaleString()}원</p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li>✔ 배송비 무료 -{SHIPPING_COST.toLocaleString()}원</li>
            <li>✔ 건강설문 할인(AI) -{SURVEY_DISCOUNT.toLocaleString()}원</li>
            <li>✔ 첫구독 시작 지원금 -{FIRST_SUBSIDY.toLocaleString()}원</li>
          </ul>
          <div className="mt-4">
            <h3 className="font-semibold text-lg">제공되는 영양제:</h3>
            <ul className="text-sm text-gray-600">
              {supplementNames.length > 0 ? (
                supplementNames.map((name, index) => (
                  <li key={index}>✔ {name}</li>
                ))
              ) : (
                <li className="text-gray-400">건강구독함이 비어있습니다</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubscribe}
        className="w-full bg-red-500 text-white py-4 rounded-lg text-lg font-bold hover:bg-red-600 transition"
      >
        {selectedPlan === 'monthly' && `${monthlyPrice.toLocaleString()}원  |  월간구독 시작`}
        {selectedPlan === 'annual' && `${annualPrice.toLocaleString()}원  |  연간구독 시작`}
        {selectedPlan === 'once' && `${oncePrice.toLocaleString()}원  |  1회 구매`}
      </button>

      {/* 영양제 상세 정보 섹션 */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-blue-700 mb-4">구독 영양제 상세 정보</h2>
        
        {cartItems.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">건강구독함이 비어있습니다. 영양제를 추가해주세요.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {cartItems.map((item, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-blue-500 to-blue-700 p-3 text-white">
                  <h3 className="font-bold text-lg">{item.product.name}</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-700 mb-3">{item.product.description}</p>
                  
                  {item.product.reason && (
                    <p className="text-blue-600 italic mb-3">"{item.product.reason}"</p>
                  )}
                  
                  {item.product.benefits && item.product.benefits.length > 0 && (
                    <div className="mb-3">
                      <h4 className="font-semibold mb-1">주요 효능:</h4>
                      <ul className="text-sm text-gray-600 pl-4 list-disc">
                        {item.product.benefits.map((benefit, idx) => (
                          <li key={idx}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <h4 className="font-semibold mb-1">섭취 방법:</h4>
                    <ul className="text-sm text-gray-600">
                      {item.product.dosageSchedule.map((schedule, idx) => (
                        <li key={idx} className="mb-1">
                          <span className="font-medium">{schedule.time}:</span> {schedule.amount}정
                          {schedule.withMeal !== undefined && ` (${schedule.withMeal ? '식후' : '식전'})`}
                          {schedule.reason && <p className="text-xs text-gray-500 mt-1">{schedule.reason}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {item.product.precautions && item.product.precautions.length > 0 && (
                    <div className="mb-3">
                      <h4 className="font-semibold mb-1">주의사항:</h4>
                      <ul className="text-sm text-gray-600 pl-4 list-disc">
                        {item.product.precautions.map((precaution, idx) => (
                          <li key={idx}>{precaution}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm text-gray-500">일일 {item.product.dailyDosage}정</span>
                    <span className="font-bold text-blue-600">
                      {(item.product.monthlyPrice || (item.product.pricePerUnit * 30 * item.product.dailyDosage)).toLocaleString()}원/월
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-100 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
                NUTRI-AI
              </h3>
              <p className="mt-2 text-gray-600">당신의 건강한 삶을 위한 AI 영양 파트너</p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2">
              <div className="flex items-center gap-4">
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  이용약관
                </a>
                <span className="text-gray-400">|</span>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  개인정보처리방침
                </a>
              </div>
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} NUTRI-AI. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
