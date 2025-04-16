'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { motion, AnimatePresence } from 'framer-motion'
import { FaComments } from 'react-icons/fa'  // AI 채팅 아이콘 추가
import { IoMdHeart } from 'react-icons/io'
import { GiStomach, GiMedicines } from 'react-icons/gi'
import { RiMentalHealthLine } from 'react-icons/ri'
import { TbEye } from 'react-icons/tb'
import Link from 'next/link'
// 슬라이더 관련 임포트를 지연 로딩으로 변경
import dynamic from 'next/dynamic'
import { healthTips } from '@/data/healthTips'
import { useAuth } from '@/context/auth-context'

// 타입 정의 추가
interface SliderProps {
  dots?: boolean;
  infinite?: boolean;
  speed?: number;
  slidesToShow?: number;
  slidesToScroll?: number;
  arrows?: boolean;
  autoplay?: boolean;
  autoplaySpeed?: number;
  pauseOnHover?: boolean;
  responsive?: Array<{
    breakpoint: number;
    settings: {
      slidesToShow: number;
      slidesToScroll: number;
    };
  }>;
  children?: React.ReactNode;
}

// 슬라이더 컴포넌트 지연 로딩
const Slider = dynamic<SliderProps>(() => import('react-slick').then(mod => mod.default), { 
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
})

// CSS 파일 지연 로딩을 위한 헬퍼 함수
const loadSlickCSS = () => {
  if (typeof window !== 'undefined') {
    // @ts-ignore: CSS 모듈 import 오류 무시
    import('slick-carousel/slick/slick.css').catch(() => console.warn('슬라이더 CSS 로드 실패'));
    // @ts-ignore: CSS 모듈 import 오류 무시
    import('slick-carousel/slick/slick-theme.css').catch(() => console.warn('슬라이더 테마 CSS 로드 실패'));
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [slickLoaded, setSlickLoaded] = useState(false)
  const { user, userProfile, loading: authLoading, dataLoading, refreshUserProfile } = useAuth()

  // 슬라이더 CSS 지연 로딩
  useEffect(() => {
    loadSlickCSS()
    setSlickLoaded(true)
  }, [])

  // 건강 팁 자동 변경 - 최적화: 페이지가 포커스 상태일 때만 실행
  useEffect(() => {
    // 초기 로딩 시에는 팁 변경을 지연시킵니다
    if (loading) return

    let interval: NodeJS.Timeout | null = null;
    
    // 페이지가 활성화된 상태일 때만 인터벌 실행
    if (document.visibilityState === 'visible') {
      interval = setInterval(() => {
        setCurrentTipIndex((prevIndex) => (prevIndex + 1) % healthTips.length)
      }, 10000) // 10초마다 변경
    }

    // 페이지 가시성 변경 이벤트 리스너
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !interval) {
        interval = setInterval(() => {
          setCurrentTipIndex((prevIndex) => (prevIndex + 1) % healthTips.length)
        }, 10000)
      } else if (document.visibilityState === 'hidden' && interval) {
        clearInterval(interval)
        interval = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loading])

  // 로그아웃 함수 - useCallback으로 메모이제이션
  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('username')
      localStorage.removeItem('uid')
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }, [router])

  // 구독 상태 확인 함수 - useMemo로 메모이제이션
  const getSubscriptionStatus = useMemo(() => {
    if (!userProfile) return null
    
    // 구독 정보 표시 로직
    if (userProfile.subscription && userProfile.subscription.status === 'active') {
      return (
        <div className="text-green-600 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">프리미엄 구독 중</p>
            <p className="text-sm opacity-75">다음 결제일: {userProfile.subscription.nextBillingDate || '2023-12-31'}</p>
          </div>
        </div>
      )
    } else if (userProfile.subscription && userProfile.subscription.status === 'trial') {
      return (
        <div className="text-blue-600 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          <div>
            <p className="font-semibold">무료 체험 중</p>
            <p className="text-sm opacity-75">종료일: {userProfile.subscription.expiryDate || '2023-12-31'}</p>
          </div>
        </div>
      )
    } else {
      return (
        <div className="text-gray-600 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">기본 플랜</p>
            <button 
              onClick={() => router.push('/subscription')} 
              className="text-sm text-blue-600 hover:underline mt-1"
            >
              프리미엄으로 업그레이드
            </button>
          </div>
        </div>
      )
    }
  }, [userProfile, router])

  // 사용자 데이터 로드 useEffect
  useEffect(() => {
    // 인증 상태 체크 및 리디렉션
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // 프로필 데이터가 있으면 로컬 상태로 설정
    if (userProfile) {
      setUserData(userProfile);
      setLoading(false);
    } else if (!dataLoading && user) {
      // 프로필 데이터가 없고 로드 중이 아니면 데이터 새로고침 요청
      refreshUserProfile()
        .then(() => setLoading(false))
        .catch((err) => {
          console.error('프로필 데이터 로드 오류:', err);
          setLoading(false);
        });
    }
  }, [user, userProfile, authLoading, dataLoading, refreshUserProfile, router]);
  

  // 샘플 영양제 데이터 - useMemo로 메모이제이션
  const sampleSupplements = useMemo(() => [
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
  ], []);

  // 슬라이더 설정 - useMemo로 메모이제이션
  const sliderSettings = useMemo(() => ({
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
  }), []);

  // 오늘의 추천 영양제 섹션 렌더링 함수
  const renderSupplementsSection = () => {
    if (!slickLoaded) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
          <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
      );
    }

    return (
      <Slider
        dots={true}
        infinite={true}
        speed={500}
        slidesToShow={2}
        slidesToScroll={1}
        arrows={true}
        autoplay={true}
        autoplaySpeed={3000}
        pauseOnHover={true}
        responsive={[
          {
            breakpoint: 640,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1
            }
          }
        ]}
      >
        {sampleSupplements.map((supplement) => (
          <div key={supplement.id} className="px-2">
            <div 
              className={`bg-gradient-to-br ${supplement.color} rounded-xl p-4 text-white h-full`}
              onClick={() => router.push(`/nutrition-details?id=${supplement.id}`)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-full">
                  {supplement.icon}
                </div>
                <h3 className="text-lg font-bold">{supplement.name}</h3>
              </div>
              <p className="text-sm text-white/90">{supplement.description}</p>
            </div>
          </div>
        ))}
      </Slider>
    );
  };

  // 인증 상태 확인
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-3 text-gray-600">로딩 중...</p>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <p className="text-lg text-gray-700 mb-4">사용자 정보를 불러오지 못했습니다.</p>
          <button 
            onClick={() => router.push('/login')} 
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div
        className="max-w-4xl mx-auto p-4 md:p-8 space-y-8"
      >
        {/* 상단 헤더 */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              안녕하세요, {userData.name || userData.username}님!
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

        {/* AI 채팅 바로가기 카드 - 필수 애니메이션만 유지 */}
        <motion.section
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white cursor-pointer group transition-all duration-300 hover:shadow-xl"
          onClick={() => router.push('/chat')}
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
            {getSubscriptionStatus}
          </div>
        </section>

        {/* 오늘의 추천 영양제 - 지연 로딩된 슬라이더 사용 */}
        <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-800">오늘의 추천 영양제</h2>
          {renderSupplementsSection()}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 건강기록하기 카드 - 애니메이션 최소화 */}
          <div
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
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
          </div>

          {/* 내 건강기록 보기 카드 - 애니메이션 최소화 */}
          <div
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
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
          </div>
        </div>

        {/* 빠른 메뉴 그리드 - 애니메이션 최소화 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
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
          </div>

          <Link href="/health-mindmap" className="group block">
            <div
              className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
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
            </div>
          </Link>

          <div
            className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
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
          </div>
        </div>

        {/* 건강 팁 - 최적화된 애니메이션 */}
        <AnimatePresence mode="wait">
          <motion.section 
            key={currentTipIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center py-6"
          >
            <p className="text-sm text-gray-600">
              {healthTips[currentTipIndex]}
            </p>
          </motion.section>
        </AnimatePresence>
      </div>
    </main>
  )
}
