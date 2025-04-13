// AI 맞춤 건강관리 시스템 UI
'use client'

import { useEffect, useState, ReactNode } from 'react'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { IoMdArrowBack, IoMdClose } from 'react-icons/io'
import { FaRunning, FaShoppingCart, FaUtensils } from 'react-icons/fa'
import { BiBed } from 'react-icons/bi'
import { GiMedicines } from 'react-icons/gi'
import { products } from '@/lib/products'

interface Product {
  id: string
  name: string
  description: string
  category: string
  pricePerUnit: number
  tags: string[]
  imageUrl?: string
}

interface HealthRecommendation {
  category: string
  title: string
  description: string
  benefits: string[]
  actionItems: string[]
  supplements?: {
    name: string
    description: string
  }[]
}

interface UserHealthProfile {
  age: number;
  gender: string;
  height: number;
  weight: number;
  activityLevel: string;
  healthGoals: string[];
  restrictions: string[];
  preferences: string[];
}

interface MealPlan {
  breakfast: string;
  lunch: string;
  dinner: string;
  calories: number;
  nutrients: {
    name: string;
    amount: string;
    percentage: number; // 일일 권장량 대비 비율
  }[];
  tags: string[]; // 예: "저탄고단", "채식", "저칼로리" 등
  healthBenefits: string[];
}

interface DietPlan {
  date: string;
  meals: MealPlan;
}

interface SupplementRecommendation {
  id: string
  name: string
  reason: string
  benefits: string[]
  dosage: string
  price: number
  imageUrl?: string
}

interface CartItem {
  product: Product
  quantity: number
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (productId: string) => void;
}

const CartItem = ({ item, onRemove }: { item: CartItem; onRemove: () => void }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <h3 className="font-medium">{item.product.name}</h3>
        <p className="text-sm text-gray-500">{item.product.description}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-lg font-semibold">{(item.product.pricePerUnit * 30).toLocaleString()}원/월</p>
          <p className="text-sm text-gray-500">구독중</p>
        </div>
        <button
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <IoMdClose className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

const Cart = ({ isOpen, onClose, items, onRemove }: CartProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const total = items.reduce((sum, item) => sum + (item.product.pricePerUnit * 30), 0)

  // 장바구니를 숨길 페이지 목록
  const hideCartPages = [
    '/login',
    '/signup-v2',
    '/signup-v2/phone',
    '/signup-v2/survey',
    '/signup-v2/intro',
    '/signup-v2/account',
    '/signup-v2/phone/',
    '/signup-v2/survey/',
    '/signup-v2/intro/',
    '/signup-v2/account/',
    '/signup-v2/phone/page',
    '/signup-v2/survey/page',
    '/signup-v2/intro/page',
    '/signup-v2/account/page'
  ]

  // 현재 페이지가 장바구니를 숨길 페이지인지 확인
  const shouldHideCart = hideCartPages.some(page => pathname?.startsWith(page))

  if (shouldHideCart) return null

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">구독 장바구니</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <IoMdArrowBack className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">장바구니가 비어있습니다</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {items.map(item => (
                <CartItem
                  key={item.product.id}
                  item={item}
                  onRemove={() => onRemove(item.product.id)}
                />
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">총 구독 금액</span>
                <span className="text-xl font-bold text-blue-600">
                  {total.toLocaleString()}원/월
                </span>
              </div>
              <button
                onClick={() => router.push('/subscription')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                구독하기
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

export default function AIHealthRecommendPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [healthData, setHealthData] = useState<{[key: string]: number}>({})
  const [recommendations, setRecommendations] = useState<HealthRecommendation[]>([])
  const [supplements, setSupplements] = useState<SupplementRecommendation[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>('exercise')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dietPlans, setDietPlans] = useState<{ [key: string]: MealPlan }>({})
  const [userProfile, setUserProfile] = useState<UserHealthProfile | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (!storedUsername) {
      router.push('/login')
      return
    }

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', storedUsername)
        const snapshot = await getDoc(userRef)
        if (snapshot.exists()) {
          const data = snapshot.data()
          setHealthData(data.mindmapKeywords || {})
          setUserProfile(data.healthProfile || null)
          
          // 사용자 프로필이 있으면 AI 식단 추천 시작
          if (data.healthProfile) {
            await generateAIDietPlan(data.healthProfile)
          }
          
          await generateRecommendations(data.mindmapKeywords || {})
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  const generateRecommendations = async (healthData: {[key: string]: number}) => {
    const mockRecommendations: HealthRecommendation[] = [
      {
        category: 'exercise',
        title: '맞춤형 운동 추천',
        description: '당신의 건강 상태에 맞는 최적의 운동 프로그램입니다.',
        benefits: [
          '심폐 기능 강화로 기초 체력 향상',
          '근력 운동을 통한 기초 대사량 증가',
          '유연성 향상으로 부상 위험 감소'
        ],
        actionItems: [
          '아침: 전신 스트레칭 15분',
          '점심: 가벼운 걷기 30분',
          '저녁: 근력 운동 40분 (초급자 난이도)'
        ]
      },
      {
        category: 'sleep',
        title: '수면 패턴 개선 가이드',
        description: '수면의 질 향상을 위한 맞춤형 솔루션입니다.',
        benefits: [
          '깊은 수면으로 신체 회복력 증가',
          '수면 호르몬 분비 최적화',
          '아침 활력 증진'
        ],
        actionItems: [
          '취침 2시간 전 블루라이트 차단',
          '일정한 수면 시간 유지 (23:00 - 07:00 권장)',
          '실내 온도 18-22도 유지'
        ]
      }
    ]

    const mockSupplements: SupplementRecommendation[] = [
      ...products
        .filter(product => product.category === '수면')
        .map(product => ({
          id: product.id,
          name: product.name,
          reason: product.description,
          benefits: [
            '수면 품질 개선',
            '근육 이완',
            '스트레스 감소'
          ],
          dosage: '1일 1회, 취침 30분 전 1정',
          price: product.pricePerUnit,
          imageUrl: product.imageUrl || undefined
        })),
      {
        id: 'omega3',
        name: '오메가3',
        reason: '심혈관 건강 개선이 필요해 보입니다.',
        benefits: ['혈행 개선', '염증 감소', '인지 기능 향상'],
        dosage: '1일 2회, 식사 직후 1정씩',
        price: 35000,
        imageUrl: '/supplements/omega3.jpg'
      },
      {
        id: 'vitamin-d',
        name: '비타민D',
        reason: '실내 활동이 많아 보충이 필요합니다.',
        benefits: ['뼈 건강', '면역력 강화', '피로 감소'],
        dosage: '1일 1회, 아침 식사와 함께 1정',
        price: 28000,
        imageUrl: '/supplements/vitamin-d.jpg'
      }
    ]

    setRecommendations(mockRecommendations)
    setSupplements(mockSupplements)
  }

  const generateAIDietPlan = async (profile: UserHealthProfile) => {
    setIsGenerating(true)
    try {
      const today = new Date()
      const monthDietPlans: { [key: string]: MealPlan } = {}

      // 한 달치 식단 생성
      for (let i = 0; i < 30; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        // 날짜 형식을 YYYY-MM-DD로 통일
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        
        // 사용자 프로필 기반 맞춤 식단 생성
        const dailyPlan = generateDailyPlan(profile, i % 7)
        monthDietPlans[dateStr] = dailyPlan
      }

      console.log('생성된 식단 계획:', monthDietPlans) // 디버깅용 로그
      setDietPlans(monthDietPlans)
    } catch (error) {
      console.error('AI 식단 생성 실패:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateDailyPlan = (profile: UserHealthProfile, dayOffset: number): MealPlan => {
    // 사용자 프로필에 따른 식단 패턴 결정
    const isLowCarb = profile.healthGoals.includes('체중감량')
    const isHighProtein = profile.healthGoals.includes('근력증진')
    const isVegetarian = profile.restrictions.includes('채식')

    const mealPatterns = {
      breakfast: [
        '그릭요거트 + 견과류 + 계절과일',
        '통곡물 오트밀 + 프로틴 파우더 + 바나나',
        '전grain 토스트 + 아보카도 + 달걀',
        '현미죽 + 삶은 계란 + 채소',
        '두유 + 견과류 시리얼 + 베리믹스',
        '단백질 팬케이크 + 메이플시럽',
        '퀴노아 볼 + 요거트 + 치아씨드'
      ],
      lunch: [
        '현미밥 + 닭가슴살 샐러드 + 된장국',
        '잡곡밥 + 연어스테이크 + 채소찜',
        '퀴노아 볼 + 두부스테이크 + 미소국',
        '고구마 + 닭가슴살 + 그린샐러드',
        '현미밥 + 고등어구이 + 나물무침',
        '렌틸콩 카레 + 통밀난 + 샐러드',
        '병아리콩 샐러드 + 통밀빵 + 스프'
      ],
      dinner: [
        '연어포케 + 현미밥 + 미소국',
        '닭가슴살 스테이크 + 고구마 + 브로콜리',
        '두부 스테이크 + 퀴노아 + 채소스프',
        '돌곱창 + 현미밥 + 된장찌개',
        '콩고기 버거 + 고구마웨지 + 샐러드',
        '새우 스테이크 + 퀴노아 + 아스파라거스',
        '닭가슴살 커리 + 현미밥 + 채소'
      ]
    }

    const baseCalories = profile.gender === '여성' ? 2000 : 2500
    const activityMultiplier = {
      '거의 없음': 1.2,
      '가벼운 활동': 1.375,
      '보통 활동': 1.55,
      '활발한 활동': 1.725,
      '매우 활발한 활동': 1.9
    }[profile.activityLevel] || 1.375

    const dailyCalories = Math.round(baseCalories * activityMultiplier)

    return {
      breakfast: mealPatterns.breakfast[dayOffset],
      lunch: mealPatterns.lunch[dayOffset],
      dinner: mealPatterns.dinner[dayOffset],
      calories: dailyCalories,
      nutrients: [
        {
          name: '단백질',
          amount: `${Math.round(dailyCalories * 0.3 / 4)}g`,
          percentage: 100
        },
        {
          name: '탄수화물',
          amount: `${Math.round(dailyCalories * 0.4 / 4)}g`,
          percentage: 100
        },
        {
          name: '지방',
          amount: `${Math.round(dailyCalories * 0.3 / 9)}g`,
          percentage: 100
        }
      ],
      tags: [
        isLowCarb ? '저탄수화물' : '일반탄수화물',
        isHighProtein ? '고단백' : '일반단백',
        isVegetarian ? '채식' : '일반식'
      ],
      healthBenefits: [
        '영양 균형 개선',
        '면역력 강화',
        '체중 관리',
        '근력 향상 지원'
      ]
    }
  }

  const handleDateChange = (value: any) => {
    if (value instanceof Date) {
      setCurrentMonth(value)
    }
  }

  const renderCustomCalendar = () => {
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const startDay = startDate.getDay()
    const totalDays = endDate.getDate()
    
    const weeks: ReactNode[] = []
    let days: ReactNode[] = []
    let day = 1

    // 달력 헤더 (요일)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']

    // 이전 달의 날짜들로 첫 주 채우기
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="border bg-gray-50 p-2 h-32"></div>)
    }

    // 현재 달의 날짜들 채우기
    for (let i = 1; i <= totalDays; i++) {
      const currentDate = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const dayMeals = dietPlans[currentDate]
      
      console.log(`날짜: ${currentDate}, 식단:`, dayMeals) // 디버깅용 로그

      days.push(
        <div key={i} className="border p-2 h-40 hover:bg-blue-50 transition-colors">
          <div className="text-sm font-semibold mb-1 flex justify-between items-center">
            <span>{i}</span>
            {dayMeals && (
              <span className="text-xs font-normal text-blue-600">
                {dayMeals.calories.toLocaleString()}kcal
              </span>
            )}
          </div>
          {dayMeals ? (
            <div className="space-y-1 text-xs">
              <div className="text-green-600 flex justify-between">
                <span>아침</span>
                <span className="text-gray-500">{dayMeals.breakfast.length > 12 ? dayMeals.breakfast.slice(0, 12) + '...' : dayMeals.breakfast}</span>
              </div>
              <div className="text-orange-600 flex justify-between">
                <span>점심</span>
                <span className="text-gray-500">{dayMeals.lunch.length > 12 ? dayMeals.lunch.slice(0, 12) + '...' : dayMeals.lunch}</span>
              </div>
              <div className="text-blue-600 flex justify-between">
                <span>저녁</span>
                <span className="text-gray-500">{dayMeals.dinner.length > 12 ? dayMeals.dinner.slice(0, 12) + '...' : dayMeals.dinner}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {dayMeals.tags.map((tag, index) => (
                  <span key={index} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">식단 정보 없음</div>
          )}
        </div>
      )

      if (days.length === 7) {
        weeks.push(
          <div key={`week-${weeks.length}`} className="grid grid-cols-7">
            {days}
          </div>
        )
        days = []
      }
    }

    // 마지막 주 남은 칸 채우기
    if (days.length > 0) {
      for (let i = days.length; i < 7; i++) {
        days.push(<div key={`empty-end-${i}`} className="border bg-gray-50 p-2 h-32"></div>)
      }
      weeks.push(
        <div key={`week-${weeks.length}`} className="grid grid-cols-7">
          {days}
        </div>
      )
    }

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월 식단
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              오늘
            </button>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              →
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold py-2 border-b">
              {day}
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {weeks}
        </div>
      </div>
    )
  }

  const renderCategoryContent = () => {
    switch (selectedCategory) {
      case 'exercise':
        const exerciseRec = recommendations.find(r => r.category === 'exercise')
        if (!exerciseRec) return null
        return (
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{exerciseRec.title}</h2>
            <p className="text-lg text-gray-600 mb-6">{exerciseRec.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="font-semibold text-xl text-gray-800 mb-4">운동의 장점</h3>
                <ul className="space-y-3">
                  {exerciseRec.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-base text-gray-700">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="font-semibold text-xl text-gray-800 mb-4">추천 운동 루틴</h3>
                <ul className="space-y-3">
                  {exerciseRec.actionItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-base text-gray-700">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )

      case 'sleep':
        const sleepRec = recommendations.find(r => r.category === 'sleep')
        if (!sleepRec) return null
        return (
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{sleepRec.title}</h2>
            <p className="text-lg text-gray-600 mb-6">{sleepRec.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="font-semibold text-xl text-gray-800 mb-4">수면의 중요성</h3>
                <ul className="space-y-3">
                  {sleepRec.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-base text-gray-700">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="font-semibold text-xl text-gray-800 mb-4">수면 개선 방법</h3>
                <ul className="space-y-3">
                  {sleepRec.actionItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-base text-gray-700">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <motion.button
              onClick={() => setSelectedCategory('nutrition')}
              className="mt-8 w-full text-blue-600 hover:text-blue-700 text-lg font-medium"
              whileHover={{ scale: 1.02 }}
            >
              수면 개선에 도움되는 영양제 보러가기 →
            </motion.button>
          </div>
        )

      case 'nutrition':
        return (
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">추천 영양제</h2>
            <p className="text-lg text-gray-600 mb-6">
              건강 상태에 맞는 맞춤형 영양제를 추천합니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{product.name}</h3>
                    <p className="text-gray-600 mb-2">{product.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {product.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-700">
                        <span className="text-sm">일일 1회</span>
                        <span className="text-lg font-bold ml-2">{product.pricePerUnit.toLocaleString()}원</span>
                      </div>
                      <div className="text-gray-700">
                        <span className="text-sm">월</span>
                        <div className="flex flex-col items-end">
                          <span className="text-sm line-through text-gray-400">{(product.pricePerUnit * 30).toLocaleString()}원</span>
                          <span className="text-lg font-bold text-red-500">
                            {Math.floor(product.pricePerUnit * 30 * 0.85).toLocaleString()}원
                          </span>
                          <span className="text-xs text-red-500">15% 할인</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <motion.button
                        onClick={() => addToGlobalCart(product)}
                        className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                        whileHover={{ scale: 1.05 }}
                      >
                        건강구독함에 추가
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const addToGlobalCart = (product: any) => {
    const event = new CustomEvent('addToHealthSubscription', {
      detail: {
        id: product.id,
        name: product.name,
        description: product.description,
        category: 'supplements',
        pricePerUnit: product.pricePerUnit,
        tags: product.tags,
      }
    })
    window.dispatchEvent(event)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">AI가 맞춤 추천을 분석중입니다...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <IoMdArrowBack className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">AI 맞춤 건강관리</h1>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 카테고리 탭 */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'exercise', icon: FaRunning, label: '운동' },
            { id: 'sleep', icon: BiBed, label: '수면' },
            { id: 'nutrition', icon: GiMedicines, label: '영양' }
          ].map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-8 py-4 rounded-full transition-colors text-lg
                ${selectedCategory === category.id 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <category.icon className="w-6 h-6" />
              {category.label}
            </button>
          ))}
        </div>

        {/* 선택된 카테고리 컨텐츠 */}
        {renderCategoryContent()}
      </div>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-100 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
                NUTRI-AI
              </h3>
              <p className="mt-2 text-gray-600">당신의 건강한 삶을 위한 AI 영양 파트너</p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2">
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
