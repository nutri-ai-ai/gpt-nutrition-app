'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

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

// 편집 가능한 필드 타입
interface EditableUserData {
  name?: string
  height?: number
  weight?: number
  birthDate?: string
  customDisease?: string
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
  const { user, userProfile, loading: authLoading, dataLoading, refreshUserProfile, updateUserProfile } = useAuth()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<EditableUserData>({})
  const [isSaving, setIsSaving] = useState(false)

  // 사용자 인증 및 데이터 로드
  useEffect(() => {
    // 인증 상태 체크
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    // 사용자 프로필 데이터 로드 및 상태 설정
    if (userProfile) {
      setUserData(userProfile)
      
      // 편집 가능한 데이터 초기화
      setEditData({
        name: userProfile.name,
        height: userProfile.surveyData?.height,
        weight: userProfile.surveyData?.weight,
        birthDate: userProfile.surveyData?.birthDate,
        customDisease: userProfile.surveyData?.customDisease
      })
      
      setIsLoading(false)
    } else if (!dataLoading && user) {
      // 프로필 데이터 새로고침 시도
      refreshUserProfile()
        .then(() => setIsLoading(false))
        .catch(err => {
          console.error('사용자 정보 로드 오류:', err)
          setError('정보를 불러오는 중 오류가 발생했습니다.')
          setIsLoading(false)
        })
    } else {
      setIsLoading(authLoading || dataLoading)
    }
  }, [user, userProfile, authLoading, dataLoading, refreshUserProfile, router])

  // 정보 저장 핸들러
  const handleSave = async () => {
    if (!user) {
      toast.error('로그인 정보를 찾을 수 없습니다.')
      return
    }
    
    setIsSaving(true)
    try {
      // 업데이트할 데이터 준비
      const updatedData = {
        name: editData.name,
        surveyData: {
          ...userData?.surveyData,
          height: editData.height,
          weight: editData.weight,
          birthDate: editData.birthDate,
          customDisease: editData.customDisease
        }
      }
      
      // useAuth의 updateUserProfile 함수 사용
      await updateUserProfile(user.uid, updatedData)
      
      // 상태 업데이트
      setIsEditing(false)
      toast.success('회원정보가 성공적으로 업데이트되었습니다.')
    } catch (err) {
      console.error('정보 저장 오류:', err)
      toast.error('정보 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 편집 취소 핸들러
  const handleCancelEdit = () => {
    // 원래 데이터로 되돌리기
    setEditData({
      name: userProfile?.name,
      height: userProfile?.surveyData?.height,
      weight: userProfile?.surveyData?.weight,
      birthDate: userProfile?.surveyData?.birthDate,
      customDisease: userProfile?.surveyData?.customDisease
    });
    setIsEditing(false);
  };

  // 입력 필드 변경 핸들러
  const handleInputChange = (field: keyof EditableUserData, value: string | number) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 정보 항목 렌더링 함수 (편집 모드 지원)
  const renderInfoItem = (label: string, value: string | number | string[] | undefined | null, isSurveyScore: boolean = false, editField?: keyof EditableUserData) => {
    let displayValue: React.ReactNode = '-' // 기본값

    // 편집 모드이고 해당 필드가 편집 가능한 경우 편집 폼 렌더링
    if (isEditing && editField) {
      // 필드별 적절한 입력 컴포넌트 반환
      switch (editField) {
        case 'name':
          return (
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100 last:border-b-0">
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2">
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </dd>
            </div>
          );
        case 'height':
          return (
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100 last:border-b-0">
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2">
                <div className="flex items-center">
                  <input
                    type="number"
                    value={editData.height || ''}
                    onChange={(e) => handleInputChange('height', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2">cm</span>
                </div>
              </dd>
            </div>
          );
        case 'weight':
          return (
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100 last:border-b-0">
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2">
                <div className="flex items-center">
                  <input
                    type="number"
                    value={editData.weight || ''}
                    onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2">kg</span>
                </div>
              </dd>
            </div>
          );
        case 'birthDate':
          return (
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100 last:border-b-0">
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2">
                <input
                  type="date"
                  value={editData.birthDate || ''}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </dd>
            </div>
          );
        case 'customDisease':
          return (
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100 last:border-b-0">
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2">
                <input
                  type="text"
                  value={editData.customDisease || ''}
                  onChange={(e) => handleInputChange('customDisease', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </dd>
            </div>
          );
        default:
          break;
      }
    }

    // 일반 표시 모드
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

      <div className="max-w-2xl mx-auto w-full bg-white p-4 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
            회원 정보
          </h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 sm:px-4 sm:py-2 bg-blue-500 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              정보 수정
            </button>
          )}
        </div>

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
              {renderInfoItem('이름', userData.name, false, 'name')}
              {renderInfoItem('아이디', userData.username)}
              {renderInfoItem('이메일', userData.email)}
            </div>
            
            {/* 기본 신체 정보 */}
            <div className="mb-4">
              <h2 className="text-md font-semibold text-gray-700 mb-2">기본 신체 정보</h2>
              {renderInfoItem('성별', userData.surveyData?.gender === 'male' ? '남성' : userData.surveyData?.gender === 'female' ? '여성' : undefined)}
              {renderInfoItem('생년월일', userData.surveyData?.birthDate, false, 'birthDate')}
              {renderInfoItem('키', userData.surveyData?.height, false, 'height')}
              {renderInfoItem('체중', userData.surveyData?.weight, false, 'weight')}
              {renderInfoItem('보유 질환', userData.surveyData?.diseases)}
              {renderInfoItem('기타 질환', userData.surveyData?.customDisease, false, 'customDisease')}
            </div>
            
            {/* 건강 설문 응답 */}
            <div className="mb-4">
              <h2 className="text-md font-semibold text-gray-700 mb-2">건강 설문 응답</h2>
              <div className="max-h-[300px] overflow-y-auto p-1 rounded-lg">
                {Object.entries(healthSurveyLabels).map(([key, label]) => (
                  <div key={key}>
                    {renderInfoItem(label, userData.surveyData?.[key as keyof UserData['surveyData']], true)}
                  </div>
                ))}
              </div>
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

        {isEditing && (
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
              disabled={isSaving}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </button>
          </div>
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
