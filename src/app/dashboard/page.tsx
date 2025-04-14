'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { motion } from 'framer-motion'
import { FaComments } from 'react-icons/fa'  // AI 채팅 아이콘 추가
import { IoMdHeart } from 'react-icons/io'
import { GiStomach, GiMedicines } from 'react-icons/gi'
import { RiMentalHealthLine } from 'react-icons/ri'
import { TbEye } from 'react-icons/tb'
import Slider from 'react-slick'
import "slick-carousel/slick/slick.css"
import "slick-carousel/slick/slick-theme.css"
import { healthTips } from '@/data/healthTips'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentTipIndex, setCurrentTipIndex] = useState(0)

  // 건강 팁 자동 변경
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prevIndex) => (prevIndex + 1) % healthTips.length)
    }, 10000) // 10초마다 변경

    return () => clearInterval(interval)
  }, [])

  // --- 사용자 데이터 로드 및 임시 데이터 정리 useEffect ---
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true); // 로딩 시작

      // --- 임시 데이터 정리 로직 ---
      const tempId = localStorage.getItem('tempId');
      if (tempId) {
        console.log(`대시보드 진입: 임시 문서 삭제 시도 (tempId: ${tempId})`);
        const tempUserRef = doc(db, 'users', tempId);
        try {
          await deleteDoc(tempUserRef);
          console.log(`임시 사용자 문서 삭제 성공 (tempId: ${tempId})`);
        } catch (deleteError) {
          console.error(`임시 사용자 문서 삭제 실패 (tempId: ${tempId}):`, deleteError);
          // 실패해도 계속 진행
        } finally {
          // 성공/실패 여부와 관계없이 로컬 스토리지에서 tempId 제거
          localStorage.removeItem('tempId');
          console.log('로컬 스토리지에서 tempId 제거 완료');
        }
      }
      // --- 임시 데이터 정리 끝 ---

      // --- 최종 사용자 데이터 로드 (username 기반) ---
      const storedUsername = localStorage.getItem('username'); // username 가져오기
      if (!storedUsername) {
        console.log('로그인 정보(username) 없음. 로그인 페이지로 이동합니다.');
        router.push('/login');
        setLoading(false); // username 없으면 로딩 종료하고 리턴
        return;
      }

      try {
        // username을 문서 ID로 사용하여 사용자 데이터 조회
        const userDocRef = doc(db, 'users', storedUsername);
        const docSnapshot = await getDoc(userDocRef);

        if (docSnapshot.exists()) {
          setUserData(docSnapshot.data());
          console.log('사용자 데이터 로드 성공:', docSnapshot.data());
        } else {
          console.error('사용자 데이터가 존재하지 않습니다. username:', storedUsername);
          // 데이터가 없는 경우, 로그아웃 처리 후 로그인 페이지로 이동
          handleLogout(); // 로그아웃 함수 호출 (아래 정의된 함수)
          // handleLogout에서 리디렉션하므로 여기서 추가 리디렉션 필요 없음
          // setLoading(false)는 handleLogout 호출 전 또는 finally 블록에서 처리됨
        }
      } catch (err) {
        console.error('사용자 데이터 로드 오류:', err);
        // 오류 발생 시 로그아웃 처리 후 로그인 페이지로 이동
        handleLogout(); // 로그아웃 함수 호출
      } finally {
         setLoading(false); // 데이터 로드 시도 후 로딩 종료
      }
      // --- 최종 사용자 데이터 로드 끝 ---
    };

    initializeDashboard();
  }, [router]); // router만 의존성 배열에 포함

  // 로그아웃 처리 (기존 함수 유지 또는 개선)
  const handleLogout = () => {
    console.log('로그아웃 처리 시작...');
    // 로컬 스토리지 정리 (signOut 함수와 유사하게 필요한 항목 모두 제거)
    localStorage.removeItem('username');
    localStorage.removeItem('uid'); // 혹시 남아있을 수 있으니 제거
    localStorage.removeItem('gender');
    localStorage.removeItem('height');
    localStorage.removeItem('weight');
    localStorage.removeItem('birthDate');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
    localStorage.removeItem('healthGoals');
    localStorage.removeItem('signupStep');
    localStorage.removeItem('cart_items');
    localStorage.removeItem('tempId'); // 여기서도 확실히 제거
    localStorage.removeItem('last_active_time');
    localStorage.removeItem('email_verified');

    router.push('/login');
    console.log('로그아웃 처리 완료. 로그인 페이지로 이동.');
  };

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

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 2,
    slidesToScroll: 1,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  };

  const sampleSupplements = [
    {
      id: 'omega3',
      name: "오메가3",
      description: "심혈관 건강과 인지 기능 개선에 도움을 줘요",
      icon: <IoMdHeart className="w-8 h-8" />,
      color: "from-red-400 to-red-600"
    },
    {
      id: 'vitaminC',
      name: "비타민C",
      description: "면역력 증진과 피부 건강에 도움을 줘요",
      icon: <GiMedicines className="w-8 h-8" />,
      color: "from-orange-400 to-orange-600"
    },
    {
      id: 'probiotics',
      name: "프로바이오틱스",
      description: "장 건강 개선과 면역력 강화에 좋아요",
      icon: <GiStomach className="w-8 h-8" />,
      color: "from-green-400 to-green-600"
    },
    {
      id: 'lutein',
      name: "루테인",
      description: "눈 건강과 시력 보호에 도움이 돼요",
      icon: <TbEye className="w-8 h-8" />,
      color: "from-blue-400 to-blue-600"
    },
    {
      id: 'magnesium',
      name: "마그네슘",
      description: "스트레스 완화와 수면 개선에 효과적이에요",
      icon: <RiMentalHealthLine className="w-8 h-8" />,
      color: "from-purple-400 to-purple-600"
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="max-w-4xl mx-auto p-4 md:p-8 space-y-8"
      >
        {/* 상단 헤더 */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              안녕하세요, {userData.name}님!
            </h1>
            <p className="text-gray-600 mt-2">
              오늘도 건강한 하루 보내세요 ✨
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </header>

        {/* AI 채팅 바로가기 카드 */}
        <motion.section
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/chat')}
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white cursor-pointer group transition-all duration-300 hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">AI 건강 상담</h2>
              <p className="text-blue-100">맞춤형 건강 상담을 시작해보세요</p>
            </div>
            <div className="bg-white text-blue-600 rounded-full p-4 group-hover:bg-blue-50 transition-colors">
              <FaComments className="w-6 h-6" />
            </div>
          </div>
        </motion.section>

        {/* 구독 상태 카드 */}
        <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-800">구독 상태</h2>
          <div className="bg-gray-50 rounded-xl p-4">
            {getSubscriptionStatus()}
          </div>
        </section>

        {/* 오늘의 추천 영양제 */}
        <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-gray-800">오늘의 추천 영양제</h2>
          <div className="relative px-2">
            <style jsx global>{`
              .supplement-slider .slick-arrow {
                width: 40px;
                height: 40px;
                background-color: rgba(255, 255, 255, 0.9);
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                z-index: 10;
              }
              .supplement-slider .slick-arrow:hover {
                background-color: white;
              }
              .supplement-slider .slick-prev {
                left: -20px;
              }
              .supplement-slider .slick-next {
                right: -20px;
              }
              .supplement-slider .slick-prev:before,
              .supplement-slider .slick-next:before {
                color: #4B5563;
                font-size: 24px;
              }
            `}</style>
            <Slider {...settings} className="supplement-slider -mx-2">
              {sampleSupplements.map((supp, index) => (
                <div key={index} className="px-2 h-[200px]">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className={`bg-gradient-to-br ${supp.color} rounded-xl p-5 text-white h-full flex flex-col cursor-pointer`}
                    onClick={() => router.push(`/nutrition-details?id=${supp.id}`)}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                        {supp.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{supp.name}</h3>
                        <p className="text-sm text-white/90 line-clamp-2">{supp.description}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex justify-between items-center">
                      <span className="text-xs bg-white/20 rounded-full px-3 py-1 backdrop-blur-sm">
                        추천 섭취: 1일 1회
                      </span>
                      <span className="text-xs bg-white/20 rounded-full px-3 py-1 backdrop-blur-sm">
                        자세히 보기
                      </span>
                    </div>
                  </motion.div>
                </div>
              ))}
            </Slider>
          </div>
        </section>

        {/* 건강기록 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 건강기록하기 카드 */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg overflow-hidden cursor-pointer"
            onClick={() => router.push('/health-records')}
          >
            <div className="p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold">건강기록하기</h3>
              </div>
              <p className="text-white/80">오늘의 건강 상태, 운동, 식사 등을 기록하고 관리해보세요.</p>
            </div>
          </motion.div>

          {/* 내 건강기록 보기 카드 */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg overflow-hidden cursor-pointer"
            onClick={() => router.push('/view-health-records')}
          >
            <div className="p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold">내 건강기록 보기</h3>
              </div>
              <p className="text-white/80">기록된 건강 데이터를 달력으로 확인하고 관리하세요.</p>
            </div>
          </motion.div>
        </div>

        {/* 빠른 메뉴 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl shadow-lg overflow-hidden cursor-pointer"
            onClick={() => router.push('/nutrition-details')}
          >
            <div className="p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <GiMedicines className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold">영양제 정보</h3>
              </div>
              <p className="text-white/80">맞춤 영양제 정보를 확인하고 관리해보세요.</p>
            </div>
          </motion.div>

          <Link href="/health-mindmap" className="group block">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <RiMentalHealthLine className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">AI 맞춤 건강관리</h2>
                  <p className="text-blue-100 mt-1">AI가 분석한 사용자에 맞는 운동, 수면, 영양을 확인해보세요</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg overflow-hidden cursor-pointer"
            onClick={() => router.push('/subscription')}
          >
            <div className="p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                    <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold">구독 관리</h3>
              </div>
              <p className="text-white/80">구독 상태를 확인하고 관리하세요.</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl shadow-lg overflow-hidden cursor-pointer"
            onClick={() => router.push('/membership-info')}
          >
            <div className="p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold">회원 정보</h3>
              </div>
              <p className="text-white/80">내 정보를 확인하고 수정하세요.</p>
            </div>
          </motion.div>
        </div>

        {/* 건강 팁 */}
        <motion.section 
          className="text-center py-6"
          key={currentTipIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm text-gray-600">
            {healthTips[currentTipIndex]}
          </p>
        </motion.section>
      </motion.div>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-100 py-8">
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
