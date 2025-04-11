'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (!storedUsername) {
      router.push('/login')
      return
    }
    getDoc(doc(db, 'users', storedUsername))
      .then((docSnapshot) => {
        if (docSnapshot.exists()) {
          setUserData(docSnapshot.data())
        } else {
          console.error('해당 사용자 데이터가 Firestore에 없습니다.')
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('사용자 데이터 로드 실패:', err)
        setLoading(false)
      })
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>사용자 정보를 불러오지 못했습니다.</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* 사용자 인사말 */}
        <section className="text-center">
          <h1 className="text-2xl font-bold text-blue-700">안녕하세요, {userData.name}님!</h1>
          <p className="text-gray-600 mt-2 text-sm">당신의 건강을 위한 맞춤형 루틴을 준비했어요 ✨</p>
        </section>

        {/* AI 추천 카드 */}
        <section className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">오늘의 추천 영양제</h2>
            <button
              onClick={() => router.push('/chat')}
              className="text-sm text-blue-600 hover:underline"
            >
              AI 채팅하러 가기
            </button>
          </div>
          {userData.recommendedSupplements && userData.recommendedSupplements.length > 0 ? (
            <div className="space-y-4">
              {userData.recommendedSupplements.map((supp: any, index: number) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                    <img src={supp.image} alt={supp.name} className="w-12 h-12 object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{supp.name}</p>
                    <p className="text-xs text-gray-500">{supp.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">아직 추천된 영양제가 없어요. AI와 상담해보세요!</p>
          )}
        </section>

        {/* 내 정보 카드 */}
        <section className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">내 정보</h2>
          <p className="mb-2"><span className="font-semibold text-gray-700">이름:</span> {userData.name}</p>
          <p className="mb-2"><span className="font-semibold text-gray-700">이메일:</span> {userData.email}</p>
          <p className="mb-2"><span className="font-semibold text-gray-700">구독 상태:</span> {userData.subscriptionStatus || '미구독'}</p>
          <button
            onClick={() => router.push('/membership-info')}
            className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            회원정보 자세히 보기
          </button>
        </section>

        {/* 빠른 메뉴 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-800">빠른 이동</h2>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => router.push('/health-records')} className="bg-purple-100 text-purple-800 py-3 rounded-lg font-medium hover:bg-purple-200">
              건강 기록
            </button>
            <button onClick={() => router.push('/nutrition-details')} className="bg-orange-100 text-orange-800 py-3 rounded-lg font-medium hover:bg-orange-200">
              영양제 상세보기
            </button>
            <button onClick={() => router.push('/health-mindmap')} className="bg-green-100 text-green-800 py-3 rounded-lg font-medium hover:bg-green-200">
              상담 내역
            </button>
            <button onClick={() => router.push('/subscription')} className="bg-blue-100 text-blue-800 py-3 rounded-lg font-medium hover:bg-blue-200">
              구독 관리
            </button>
          </div>
        </section>

        {/* 건강 팁 */}
        <section className="text-sm text-gray-600 text-center pt-6 border-t">
          매일 30분 이상의 가벼운 운동과 균형 잡힌 식사는 건강 유지에 도움이 됩니다.
        </section>
      </motion.div>
    </main>
  )
}
