'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'

interface UserData {
  username?: string
  email?: string
  name?: string
  surveyData?: {
    gender?: string
    birthDate?: string
    height?: number
    weight?: number
    diseases?: string[]
    customDisease?: string
    fatigueLevel?: number
    sleepQuality?: number
    digestionLevel?: number
    immunityLevel?: number
    skinCondition?: number
    concentrationLevel?: number
    stressLevel?: number
    jointPainLevel?: number
    weightManagement?: number
    dietBalance?: number
  }
  healthGoals?: string[]
  // 다른 필요한 필드 타입 추가 가능
}

// 건강 설문 필드와 레이블 매핑
const healthSurveyLabels: Record<string, string> = {
  fatigueLevel: '평소 피로도',
  sleepQuality: '수면의 질',
  digestionLevel: '소화 기능',
  immunityLevel: '면역력',
  skinCondition: '피부/모발 상태',
  concentrationLevel: '집중력',
  stressLevel: '스트레스',
  jointPainLevel: '관절/근육 통증',
  weightManagement: '체중/지방 관리 필요성',
  dietBalance: '식습관 균형'
};

export default function MembershipInfoPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      const fetchUserData = async (userId: string) => {
        console.log('Fetching data for UID:', userId);
        setIsLoading(true);
        try {
          const userRef = doc(db, 'users', userId)
          const userDoc = await getDoc(userRef)

          if (userDoc.exists()) {
            const fetchedData = userDoc.data() as UserData;
            console.log('Fetched User Data:', fetchedData);
            setUserData(fetchedData);
          } else {
            setError('사용자 정보를 찾을 수 없습니다. 계정이 완전히 생성되지 않았을 수 있습니다.')
            // 필요시 로그인 페이지로 리디렉션
            // router.push('/login') 
          }
        } catch (err) {
          console.error('사용자 정보 로드 오류:', err)
          setError('정보를 불러오는 중 오류가 발생했습니다.')
        } finally {
          setIsLoading(false)
        }
      }
      fetchUserData(user.uid)
    } else {
        setIsLoading(authLoading);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router])

  // 정보 항목 렌더링 함수
  const renderInfoItem = (label: string, value: string | number | string[] | undefined | null, isSurveyScore: boolean = false) => {
    let displayValue: React.ReactNode = '-' // 기본값

    // '선택한 건강 목표' 레이블일 때 값과 타입 확인용 로그 추가
    if (label === '선택한 건강 목표') {
      console.log(`Rendering '선택한 건강 목표' with value:`, value);
      console.log(`Type: ${typeof value}, Is Array: ${Array.isArray(value)}`);
    }

    if (isSurveyScore && typeof value === 'number') {
      // 건강 설문 점수는 1~5점으로 표시
      displayValue = `${value}점`;
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        displayValue = value.join(', ')
      } else {
        displayValue = '선택 안 함'
      }
    } else if (value !== undefined && value !== null && value !== '') {
      displayValue = String(value)
      if (label === '키') displayValue += ' cm'
      if (label === '체중') displayValue += ' kg'
      if (label === '이메일') {
        // 간단한 이메일 마스킹
        const parts = String(value).split('@')
        if (parts.length === 2) {
          displayValue = `${parts[0].substring(0, 3)}***@${parts[1]}`
        }
      }
    } else if (value === '') {
        displayValue = '입력 안 함'
    }

    return (
      <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100 last:border-b-0">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{displayValue}</dd>
      </div>
    )
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="relative w-16 h-16 mb-8">
        <Image
          src="/logo-animation.svg"
          alt="Nutri AI Logo"
          width={64}
          height={64}
          className="animate-spin-slow"
        />
      </div>

      <div className="max-w-2xl mx-auto w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <h1 className="text-xl font-semibold text-center mb-8 text-gray-800">
          회원 정보
        </h1>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-500 text-sm rounded-lg">
            {error}
          </div>
        )}

        {userData ? (
          <dl>
            {/* 기본 정보 */}
            <div className="mb-4">
                <h2 className="text-md font-semibold text-gray-700 mb-2">기본 정보</h2>
                {renderInfoItem('이름', userData.name)}
                {renderInfoItem('아이디', userData.username)}
                {renderInfoItem('이메일', userData.email)}
            </div>
            
            {/* 기본 신체 정보 */}
            <div className="mb-4">
                <h2 className="text-md font-semibold text-gray-700 mb-2">기본 신체 정보</h2>
                {renderInfoItem('성별', userData.surveyData?.gender === 'male' ? '남성' : userData.surveyData?.gender === 'female' ? '여성' : undefined)}
                {renderInfoItem('생년월일', userData.surveyData?.birthDate)}
                {renderInfoItem('키', userData.surveyData?.height)}
                {renderInfoItem('체중', userData.surveyData?.weight)}
                {renderInfoItem('보유 질환', userData.surveyData?.diseases)}
                {userData.surveyData?.customDisease && renderInfoItem('기타 질환', userData.surveyData.customDisease)}
            </div>
            
            {/* 건강 설문 응답 */}
            <div className="mb-4">
                <h2 className="text-md font-semibold text-gray-700 mb-2">건강 설문 응답</h2>
                {Object.entries(healthSurveyLabels).map(([key, label]) => (
                  <div key={key}>
                    {renderInfoItem(label, userData.surveyData?.[key as keyof UserData['surveyData']], true)}
                  </div>
                ))}
            </div>
            
            {/* 건강 목표 */}
            <div>
                 <h2 className="text-md font-semibold text-gray-700 mb-2">건강 목표</h2>
                {renderInfoItem('선택한 건강 목표', userData.healthGoals)}
            </div>
          </dl>
        ) : (
          !error && <p className="text-center text-gray-500">표시할 사용자 정보가 없습니다.</p>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.back()} // 이전 페이지로 이동
            className="px-6 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            뒤로가기
          </button>
        </div>
      </div>
    </div>
  )
}
