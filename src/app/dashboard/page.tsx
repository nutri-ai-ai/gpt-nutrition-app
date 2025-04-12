'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { motion } from 'framer-motion'
import { FaComments } from 'react-icons/fa'  // AI 채팅 아이콘 추가

export default function DashboardPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    // 로컬스토리지에서 username 확인
    if (!storedUsername) {
      router.push('/login')  // username 없으면 로그인 페이지로 리디렉션
      return
    }

    // Firestore에서 사용자 데이터 조회
    const getUserData = async () => {
      try {
        const docRef = doc(db, 'users', storedUsername)
        const docSnapshot = await getDoc(docRef)

        // 사용자가 존재하지 않으면 로그인 페이지로 리디렉션
        if (docSnapshot.exists()) {
          setUserData(docSnapshot.data())
        } else {
          console.error('사용자 데이터가 존재하지 않습니다.')
          router.push('/login')  // 데이터가 없다면 로그인 페이지로 리디렉션
        }
      } catch (err) {
        console.error('사용자 데이터 로드 오류:', err)
        router.push('/login')  // 오류 발생 시 로그인 페이지로 리디렉션
      }
      setLoading(false)
    }

    getUserData()
  }, [router])

  // 로그아웃 처리
  const handleLogout = () => {
    localStorage.removeItem('username')
    localStorage.removeItem('password')
    router.push('/login')  // 로그아웃 후 로그인 페이지로 리디렉션
  }

  // 구독 상태 및 만료일 처리
  const getSubscriptionStatus = () => {
    if (userData.subscriptionStatus && userData.subscriptionDate) {
      const subscriptionEndDate = new Date(userData.subscriptionDate)
      const currentDate = new Date()
      const daysLeft = Math.floor((subscriptionEndDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24))

      if (daysLeft <= 7) {
        // 구독 만료 7일 전부터 빨간색으로 표시
        return (
          <p className="text-red-600 font-semibold">구독 만료일: {subscriptionEndDate.toLocaleDateString()} (남은 일: {daysLeft}일)</p>
        )
      } else {
        return (
          <p className="text-green-600 font-semibold">구독 상태: {userData.subscriptionStatus} (구독기간: {subscriptionEndDate.toLocaleDateString()})</p>
        )
      }
    } else {
      return <p className="text-gray-500">구독 상태: 미구독</p>
    }
  }

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
              className="flex items-center text-white bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-lg transition"
            >
              <FaComments className="mr-2" />
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
          {getSubscriptionStatus()}
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

        {/* 로그아웃 버튼 - 건강 팁 바로 위에 위치 */}
        <section className="text-center">
          <button
            onClick={handleLogout}
            className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            로그아웃
          </button>
        </section>

        {/* 건강 팁 */}
        <section className="text-sm text-gray-600 text-center pt-6 border-t">
          매일 30분 이상의 가벼운 운동과 균형 잡힌 식사는 건강 유지에 도움이 됩니다.
        </section>
      </motion.div>
    </main>
  )
}
