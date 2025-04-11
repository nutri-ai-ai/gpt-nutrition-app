'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, getDocs, addDoc, doc, DocumentData } from 'firebase/firestore'


type Supplement = {
  id: string
  name: string
  price: number
  description: string
  dosage: string
  benefits: string
}

type Recommendation = { id: number; text: string }

export default function SubscriptionPage() {
  const router = useRouter()

  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | 'once'>('monthly')

  // 금액 상수
  const SHIPPING_COST = 4500
  const SURVEY_DISCOUNT = 10000
  const FIRST_SUBSIDY = 10000

  useEffect(() => {
    const fetchSupplements = async () => {
      const querySnapshot = await getDocs(collection(db, 'supplements'))
      const supplementsList: Supplement[] = []
      querySnapshot.forEach((docSnapshot) => {
        const docData = docSnapshot.data() as Supplement
        supplementsList.push({ ...docData, id: docSnapshot.id })
      })
      setSupplements(supplementsList)
    }

    const storedRecommendations = sessionStorage.getItem('nutri_recommendations')
    if (storedRecommendations) {
      const parsedRecommendations = JSON.parse(storedRecommendations)
      setRecommendations(parsedRecommendations)
    }

    fetchSupplements()
  }, [])

  // 플랜별 계산
  const basePrice = recommendations.length * 10000 // 1제품당 10,000원 가정
  const monthlyDiscount = Math.floor(basePrice * 0.05)
  const annualDiscount = Math.floor(basePrice * 12 * 0.15)

  const monthlyPrice = basePrice - monthlyDiscount - FIRST_SUBSIDY
  const annualPrice = basePrice * 12 - annualDiscount - FIRST_SUBSIDY
  const oncePrice = basePrice - FIRST_SUBSIDY

  const handleSubscribe = async () => {
    // 결제 정보 Firestore에 저장
    const subscriptionData = {
      plan: selectedPlan,
      recommendations,
      amountPaid: calculateTotalAmount(),
      createdAt: new Date(),
    }

    try {
      // Firestore에 결제 정보 저장
      await addDoc(collection(db, 'subscriptions'), subscriptionData)
      router.push('/payment') // 결제 페이지로 이동
    } catch (error) {
      console.error("Error saving subscription data:", error)
    }
  }

  // 총 금액 계산
  const calculateTotalAmount = () => {
    if (selectedPlan === 'monthly') return monthlyPrice
    if (selectedPlan === 'annual') return annualPrice
    return oncePrice
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-blue-700 mb-6">구매유형 선택</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* 정기구독 */}
        <div
          onClick={() => setSelectedPlan('monthly')}
          className={`border rounded-lg p-4 cursor-pointer ${selectedPlan === 'monthly' ? 'border-red-500 shadow-lg' : 'border-gray-300'}`}
        >
          <p className="text-xs text-white bg-red-500 px-2 inline-block rounded mb-1">하루 {Math.floor(monthlyPrice / 30).toLocaleString()}원!</p>
          <h2 className="font-semibold text-lg text-red-500">정기구독</h2>
          <p className="text-xl font-bold">{monthlyPrice.toLocaleString()}원</p>
          <p className="text-gray-500 text-sm mt-2">정기구독 할인혜택 -{(basePrice - monthlyPrice).toLocaleString()}원</p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li>✔ 배송비 무료 -{SHIPPING_COST.toLocaleString()}원</li>
            <li>✔ 건강설문 할인(AI) -{SURVEY_DISCOUNT.toLocaleString()}원</li>
            <li>✔ 첫구독 시작 지원금 -{FIRST_SUBSIDY.toLocaleString()}원</li>
            <li>✔ 정기구독 할인 5% -{monthlyDiscount.toLocaleString()}원</li>
          </ul>
          <h3>제공되는 영양제:</h3>
          {supplements.filter(supp => recommendations.some(r => r.text.includes(supp.name))).map(supp => (
            <p key={supp.id}>{supp.name}</p>
          ))}
        </div>

        {/* 연구독 */}
        <div
          onClick={() => setSelectedPlan('annual')}
          className={`border rounded-lg p-4 cursor-pointer ${selectedPlan === 'annual' ? 'border-red-500 shadow-lg' : 'border-gray-300'}`}
        >
          <p className="text-xs text-white bg-red-500 px-2 inline-block rounded mb-1">12개월 장기구독</p>
          <h2 className="font-semibold text-lg text-red-500">연구독</h2>
          <p className="text-xl font-bold">{annualPrice.toLocaleString()}원</p>
          <p className="text-gray-500 text-sm mt-2">연구독 할인혜택 -{(basePrice * 12 - annualPrice).toLocaleString()}원</p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li>✔ 배송비 무료 -{(SHIPPING_COST * 12).toLocaleString()}원</li>
            <li>✔ 건강설문 할인(AI) -{SURVEY_DISCOUNT.toLocaleString()}원</li>
            <li>✔ 첫구독 시작 지원금 -{FIRST_SUBSIDY.toLocaleString()}원</li>
            <li>✔ 연구독 할인 15% -{annualDiscount.toLocaleString()}원</li>
          </ul>
          <h3>제공되는 영양제:</h3>
          {supplements.filter(supp => recommendations.some(r => r.text.includes(supp.name))).map(supp => (
            <p key={supp.id}>{supp.name}</p>
          ))}
        </div>

        {/* 한 번만 구매 */}
        <div
          onClick={() => setSelectedPlan('once')}
          className={`border rounded-lg p-4 cursor-pointer ${selectedPlan === 'once' ? 'border-red-500 shadow-lg' : 'border-gray-300'}`}
        >
          <p className="text-xs text-white bg-gray-400 px-2 inline-block rounded mb-1">1회 구매</p>
          <h2 className="font-semibold text-lg text-gray-700">한 번만 구매</h2>
          <p className="text-xl font-bold">{oncePrice.toLocaleString()}원</p>
          <p className="text-gray-500 text-sm mt-2">한 번만 구매 할인혜택 -{(basePrice - oncePrice).toLocaleString()}원</p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li>✔ 배송비 무료 -{SHIPPING_COST.toLocaleString()}원</li>
            <li>✔ 건강설문 할인(AI) -{SURVEY_DISCOUNT.toLocaleString()}원</li>
            <li>✔ 첫구독 시작 지원금 -{FIRST_SUBSIDY.toLocaleString()}원</li>
          </ul>
          <h3>제공되는 영양제:</h3>
          {supplements.filter(supp => recommendations.some(r => r.text.includes(supp.name))).map(supp => (
            <p key={supp.id}>{supp.name}</p>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubscribe}
        className="w-full bg-red-500 text-white py-4 rounded-lg text-lg font-bold hover:bg-red-600 transition"
      >
        {selectedPlan === 'monthly' && `${monthlyPrice.toLocaleString()}원  |  정기구독 시작`}
        {selectedPlan === 'annual' && `${annualPrice.toLocaleString()}원  |  연구독 시작`}
        {selectedPlan === 'once' && `${oncePrice.toLocaleString()}원  |  1회 구매`}
      </button>

      {/* 하단 문구 */}
      <div className="bg-red-50 text-sm text-gray-800 p-4 mt-6 rounded border border-red-200">
        <p className="mb-2 font-bold text-red-600">📦 정기구독 혜택</p>
        <ul className="list-disc ml-4 space-y-1">
          <li>AI 영양추천 완료 시 3,000원 할인 (3만원 이상 구매)</li>
          <li>무료배송 (1만원 이상 구매)</li>
          <li>초대코드 입력 시 5% 할인</li>
          <li>상품 & 결제일 변경, 해지가 자유로워요!</li>
        </ul>
      </div>
    </main>
  )
}
