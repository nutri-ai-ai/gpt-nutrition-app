'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/context/auth-context'

// 설문 단계 정의
type SurveyStep = 
  | 'BASIC_INFO_BIRTH'
  | 'BASIC_INFO_GENDER'
  | 'BASIC_INFO_HEIGHT'
  | 'BASIC_INFO_WEIGHT'
  | 'BASIC_INFO_DISEASE'
  | 'HEALTH_SURVEY_FATIGUE'
  | 'HEALTH_SURVEY_SLEEP'
  | 'HEALTH_SURVEY_DIGESTION'
  | 'HEALTH_SURVEY_IMMUNITY'
  | 'HEALTH_SURVEY_SKIN'
  | 'HEALTH_SURVEY_CONCENTRATION'
  | 'HEALTH_SURVEY_STRESS'
  | 'HEALTH_SURVEY_JOINT'
  | 'HEALTH_SURVEY_WEIGHT'
  | 'HEALTH_SURVEY_DIET'
  | 'HEALTH_GOALS'  // 건강목표 선택 단계 추가

// 설문 데이터 인터페이스
interface SurveyData {
  birthDate?: string
  gender?: 'male' | 'female'
  height?: number
  weight?: number
  diseases?: string[]
  customDisease?: string
  isCustomDiseaseActive?: boolean
  // 건강설문 데이터
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

// 단계별 제목 매핑
const stepTitles: Record<SurveyStep, string> = {
  BASIC_INFO_BIRTH: '기본 정보',
  BASIC_INFO_GENDER: '기본 정보',
  BASIC_INFO_HEIGHT: '기본 정보',
  BASIC_INFO_WEIGHT: '기본 정보',
  BASIC_INFO_DISEASE: '기본 정보',
  HEALTH_SURVEY_FATIGUE: '건강 설문',
  HEALTH_SURVEY_SLEEP: '건강 설문',
  HEALTH_SURVEY_DIGESTION: '건강 설문',
  HEALTH_SURVEY_IMMUNITY: '건강 설문',
  HEALTH_SURVEY_SKIN: '건강 설문',
  HEALTH_SURVEY_CONCENTRATION: '건강 설문',
  HEALTH_SURVEY_STRESS: '건강 설문',
  HEALTH_SURVEY_JOINT: '건강 설문',
  HEALTH_SURVEY_WEIGHT: '건강 설문',
  HEALTH_SURVEY_DIET: '건강 설문',
  HEALTH_GOALS: '건강목표 선택'
}

// 단계 그룹화
const stepGroups = {
  '기본 정보': ['BASIC_INFO_BIRTH', 'BASIC_INFO_GENDER', 'BASIC_INFO_HEIGHT', 'BASIC_INFO_WEIGHT', 'BASIC_INFO_DISEASE'],
  '건강 설문': [
    'HEALTH_SURVEY_FATIGUE',
    'HEALTH_SURVEY_SLEEP',
    'HEALTH_SURVEY_DIGESTION',
    'HEALTH_SURVEY_IMMUNITY',
    'HEALTH_SURVEY_SKIN',
    'HEALTH_SURVEY_CONCENTRATION',
    'HEALTH_SURVEY_STRESS',
    'HEALTH_SURVEY_JOINT',
    'HEALTH_SURVEY_WEIGHT',
    'HEALTH_SURVEY_DIET'
  ],
  '건강 목표': ['HEALTH_GOALS']
}

const DISEASES = [
  '고혈압',
  '당뇨병',
  '고지혈증',
  '심장질환',
  '뇌혈관질환',
  '관절염',
  '골다공증',
  '없음'
]

// 건강설문 질문 매핑
const healthSurveyQuestions: Record<string, string> = {
  HEALTH_SURVEY_FATIGUE: '평소에 느끼는 피로도를 선택하여 주세요',
  HEALTH_SURVEY_SLEEP: '평소 숙면을 잘 취하시나요?',
  HEALTH_SURVEY_DIGESTION: '소화기능은 어떠신가요?',
  HEALTH_SURVEY_IMMUNITY: '면역력은 어떠신가요?',
  HEALTH_SURVEY_SKIN: '피부/모발 상태는 어떠신가요?',
  HEALTH_SURVEY_CONCENTRATION: '집중력은 어떠신가요?',
  HEALTH_SURVEY_STRESS: '스트레스는 어느 정도인가요?',
  HEALTH_SURVEY_JOINT: '관절/근육 통증이 있으신가요?',
  HEALTH_SURVEY_WEIGHT: '체중/지방관리가 필요하신가요?',
  HEALTH_SURVEY_DIET: '식습관이 불균형한가요?'
}

// 건강설문 데이터 필드 매핑
const healthSurveyFields: Record<string, keyof SurveyData> = {
  HEALTH_SURVEY_FATIGUE: 'fatigueLevel',
  HEALTH_SURVEY_SLEEP: 'sleepQuality',
  HEALTH_SURVEY_DIGESTION: 'digestionLevel',
  HEALTH_SURVEY_IMMUNITY: 'immunityLevel',
  HEALTH_SURVEY_SKIN: 'skinCondition',
  HEALTH_SURVEY_CONCENTRATION: 'concentrationLevel',
  HEALTH_SURVEY_STRESS: 'stressLevel',
  HEALTH_SURVEY_JOINT: 'jointPainLevel',
  HEALTH_SURVEY_WEIGHT: 'weightManagement',
  HEALTH_SURVEY_DIET: 'dietBalance'
}

// 건강목표 카테고리 및 키워드 정의
const healthGoalCategories = {
  ENERGY: {
    title: '에너지/피로 관련',
    keywords: ['피로 회복', '활력 증진', '에너지 향상', '아침 컨디션 개선', '무기력 해소', '체력 유지', '만성피로 개선']
  },
  IMMUNITY: {
    title: '면역 관련',
    keywords: ['면역력 강화', '감기 예방', '자주 아픈 체질 개선', '염증 억제', '항산화 케어']
  },
  SLEEP: {
    title: '수면 관련',
    keywords: ['수면 질 개선', '불면증 완화', '숙면 유도', '야간 각성 감소', '자율신경 안정']
  },
  BRAIN: {
    title: '두뇌/인지/집중',
    keywords: ['집중력 향상', '기억력 개선', '학습능력 향상', '뇌건강 유지', '치매 예방', '멍한 상태 개선']
  },
  STRESS: {
    title: '스트레스/기분',
    keywords: ['스트레스 완화', '기분 안정', '긴장 완화', '우울감 케어', '호르몬 균형 유지']
  },
  DIGESTION: {
    title: '소화/장 건강',
    keywords: ['소화기능 개선', '변비 해소', '설사 완화', '장내 유익균 증가', '복부 팽만감 감소']
  },
  LIVER: {
    title: '디톡스/간 건강',
    keywords: ['간 해독', '음주 후 회복', '간 기능 개선', '알코올 대사 촉진']
  },
  NUTRITION: {
    title: '영양 보충/기본관리',
    keywords: ['종합 영양 보충', '비타민 균형', '미네랄 보충', '식사 불균형 보완', '성장기 영양 보강']
  },
  MUSCLE: {
    title: '근육/체력/운동',
    keywords: ['근육 성장', '운동 회복', '근육통 완화', '지구력 향상', '단백질 보충', 'BCAA 케어']
  },
  JOINT: {
    title: '관절/뼈 건강',
    keywords: ['관절통 완화', '연골 보호', '관절 유연성 유지', '골밀도 유지', '골다공증 예방']
  },
  EYE: {
    title: '눈 건강',
    keywords: ['시력 보호', '눈 피로 해소', '블루라이트 보호', '황반변성 예방']
  },
  CARDIOVASCULAR: {
    title: '심혈관/혈액 건강',
    keywords: ['혈액순환 개선', '고지혈 예방', '콜레스테롤 관리', '혈압 안정', '혈관 건강 강화']
  },
  BEAUTY: {
    title: '피부/미용',
    keywords: ['피부 트러블 개선', '피부 탄력 강화', '보습 유지', '여드름 완화', '피부톤 개선', '모발 건강', '손톱 강화']
  },
  ANTIOXIDANT: {
    title: '항산화/노화방지',
    keywords: ['노화 예방', '세포 손상 보호', '프리래디컬 억제', '주름 예방', '항산화 활성']
  },
  DIET: {
    title: '체형/다이어트',
    keywords: ['체중 감량', '체지방 감소', '식욕 억제', '지방 대사 촉진', '근육 유지형 감량']
  },
  WOMENS_HEALTH: {
    title: '여성 건강',
    keywords: ['생리통 완화', '생리불순 개선', 'PMS 완화', '갱년기 증상 완화', '여성 호르몬 균형', '질 건강 유지']
  },
  MENS_HEALTH: {
    title: '남성 건강',
    keywords: ['전립선 건강', '남성 호르몬 유지', '활력 유지', '정자 건강', '성기능 보조']
  },
  PREGNANCY: {
    title: '임신/육아기',
    keywords: ['태아 발달 지원', '엽산 보충', '임신 준비', '수유기 영양 보강']
  }
}

type HealthGoalCategory = keyof typeof healthGoalCategories

export default function SurveyPage() {
  const router = useRouter()
  const { updateUserSignupData } = useAuth()
  const [currentStep, setCurrentStep] = useState<SurveyStep>('BASIC_INFO_BIRTH')
  const [surveyData, setSurveyData] = useState<SurveyData>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [tempUserId, setTempUserId] = useState<string | null>(null)
  
  // 선택된 건강 목표
  const [selectedHealthGoals, setSelectedHealthGoals] = useState<string[]>([])
  // 카테고리별 선택 상태 저장
  const [categorySelections, setCategorySelections] = useState<Record<HealthGoalCategory, string[]>>({} as Record<HealthGoalCategory, string[]>)
  // 현재 보여주는 건강 목표 카테고리
  const [currentCategory, setCurrentCategory] = useState<HealthGoalCategory>('ENERGY')
  const [showCategorySelection, setShowCategorySelection] = useState(false)

  // 컴포넌트 마운트 시 임시 사용자 ID와 세션 상태 확인
  useEffect(() => {
    console.log('설문 페이지 초기화 시작')
    // 세션 체크
    const lastActiveTime = localStorage.getItem('last_active_time')
    const tempId = localStorage.getItem('tempId')
    const emailVerified = localStorage.getItem('email_verified')
    const email = localStorage.getItem('email')

    console.log('세션 상태:', { lastActiveTime, tempId, emailVerified, email })

    if (!lastActiveTime || !tempId || emailVerified !== 'true') {
      console.log('세션 검증 실패:', { lastActiveTime, tempId, emailVerified })
      router.push('/signup-v2/email')
      return
    }

    const now = Date.now()
    const diff = now - parseInt(lastActiveTime)
    
    console.log('세션 유효 시간(분):', Math.round(diff / (60 * 1000)))
    
    if (diff >= 30 * 60 * 1000) {
      console.log('세션 만료:', diff)
      localStorage.removeItem('last_active_time')
      localStorage.removeItem('tempId')
      localStorage.removeItem('email_verified')
      router.push('/signup-v2/email')
      return
    }
    
    // 세션 활성 시간 업데이트
    localStorage.setItem('last_active_time', now.toString())
    console.log('세션 활성 시간 업데이트:', now)
    setTempUserId(tempId)
    setIsLoading(false)
    
  }, [router])

  // 현재 단계 그룹 (기본 정보/건강 설문/건강 목표) 가져오기
  const getCurrentGroup = () => {
    return stepTitles[currentStep] || '기본 정보'
  }

  // 진행률 계산 함수
  const calculateProgress = () => {
    const allSteps = [
      ...stepGroups['기본 정보'],
      ...stepGroups['건강 설문'],
      ...stepGroups['건강 목표']
    ]
    const currentIndex = allSteps.indexOf(currentStep)
    return Math.floor((currentIndex / (allSteps.length - 1)) * 100)
  }

  // 카테고리 변경 시 선택 상태 관리
  const changeCategory = (newCategory: HealthGoalCategory) => {
    if (!currentCategory) return
    
    // 현재 카테고리의 선택 상태 저장
    setCategorySelections(prev => ({
      ...prev,
      [currentCategory]: [...selectedHealthGoals]
    }))
    
    // 새 카테고리로 변경
    setCurrentCategory(newCategory)
    
    // 새 카테고리의 이전 선택 상태 로드
    const prevSelections = categorySelections[newCategory] || []
    setSelectedHealthGoals(prevSelections)
  }

  // 건강목표 선택 페이지로 이동
  const moveToHealthGoals = async () => {
    if (!tempUserId) {
      setError('사용자 정보를 찾을 수 없습니다.')
      return
    }
    
    try {
      // 여기까지 입력된 설문 데이터 저장
      const userRef = doc(db, 'users', tempUserId)
      await updateDoc(userRef, {
        surveyData: surveyData,
        updatedAt: new Date().toISOString()
      })
      
      // 이전 선택 상태를 새로운 상태로 설정
      setSelectedHealthGoals([])
      
      // 카테고리 선택 상태 초기화 - 완전히 새로 시작하도록 수정
      setCategorySelections({} as Record<HealthGoalCategory, string[]>)
      
      // 초기 카테고리 설정
      const filteredCategories = getFilteredCategories()
      if (filteredCategories.length > 0) {
        setCurrentCategory(filteredCategories[0])
      }
      
      // 건강목표 선택 단계로 이동
      setCurrentStep('HEALTH_GOALS')
    } catch (error) {
      console.error('데이터 저장 중 오류:', error)
      setError('데이터 저장 중 오류가 발생했습니다.')
    }
  }

  // 최종 제출 함수
  const handleSubmit = async () => {
    if (!tempUserId) {
      setError('사용자 정보를 찾을 수 없습니다.')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // 현재 카테고리의 선택 상태를 저장
      const updatedSelections = {
        ...categorySelections,
        [currentCategory]: selectedHealthGoals
      }
      
      // 모든 카테고리의 선택을 종합
      let allSelections: string[] = []
      Object.values(updatedSelections).forEach(selections => {
        if (selections && selections.length > 0) {
          allSelections = [...allSelections, ...selections]
        }
      })
      
      // 중복 제거
      allSelections = [...new Set(allSelections)]
      
      // '관심없음'이 하나라도 있으면 그것만 남김
      if (allSelections.includes('관심없음')) {
        allSelections = ['관심없음']
      }

      console.log('최종 선택된 건강 목표:', allSelections)
      
      // 설문 데이터 업데이트 (건강 목표 포함)
      const finalSurveyData = { ...surveyData }; // 기존 surveyData 복사

      // Firestore 업데이트 (healthGoals를 별도 필드로 전달)
      await updateUserSignupData({
        surveyData: finalSurveyData, // 기존 설문 데이터만 전달
        healthGoals: allSelections,   // healthGoals는 별도 필드로 전달
        signupStep: 'survey_completed',
        updatedAt: new Date().toISOString(),
      });

      // 데이터 저장 확인을 위한 로그
      console.log('Firebase에 저장 요청한 데이터 구조:', {
         surveyData: finalSurveyData,
         healthGoals: allSelections, // healthGoals가 별도로 전달되는지 확인
         signupStep: 'survey_completed',
         updatedAt: new Date().toISOString(),
      });

      // 계정 생성 페이지로 이동
      router.push('/signup-v2/account');
    } catch (error) {
      console.error('데이터 제출 중 오류:', error);
      setError('데이터를 저장하는 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  // 다음 단계로 이동 함수
  const handleNext = async () => {
    const allSteps = [
      ...stepGroups['기본 정보'],
      ...stepGroups['건강 설문'],
      ...stepGroups['건강 목표']
    ]
    const currentIndex = allSteps.indexOf(currentStep)
    
    if (!tempUserId) {
      setError('사용자 정보를 찾을 수 없습니다.')
      return
    }
    
    // 현재 단계에 따른 유효성 검사
    switch (currentStep) {
      case 'BASIC_INFO_BIRTH':
        if (!surveyData.birthDate) {
          setError('생년월일을 입력해주세요.')
          return
        }
        break
      case 'BASIC_INFO_GENDER':
        if (!surveyData.gender) {
          setError('성별을 선택해주세요.')
          return
        }
        break
      case 'BASIC_INFO_HEIGHT':
        if (!surveyData.height || surveyData.height < 100 || surveyData.height > 250) {
          setError('키를 올바르게 입력해주세요 (100~250cm).')
          return
        }
        break
      case 'BASIC_INFO_WEIGHT':
        if (!surveyData.weight || surveyData.weight < 30 || surveyData.weight > 200) {
          setError('체중을 올바르게 입력해주세요 (30~200kg).')
          return
        }
        break
      case 'HEALTH_GOALS':
        if (selectedHealthGoals.length === 0) {
          setError('하나 이상의 건강 목표를 선택해주세요.')
          return
        }
        await handleSubmit()
        return
      default:
        break
    }
    
    // 다음 단계로 이동
    setError(null)
    
    // 기본 정보 단계가 끝나면 중간 저장
    if (currentStep === 'BASIC_INFO_DISEASE') {
      try {
        const userRef = doc(db, 'users', tempUserId)
        await updateDoc(userRef, {
          surveyData: {
            ...surveyData
          },
          updatedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error('데이터 저장 중 오류:', error)
      }
    }
    
    // 건강 설문 마지막 단계에서 건강 목표로 이동
    if (currentStep === 'HEALTH_SURVEY_DIET') {
      moveToHealthGoals()
      return
    }
    
    // 정상적인 다음 단계 이동
    if (currentIndex < allSteps.length - 1) {
      setCurrentStep(allSteps[currentIndex + 1] as SurveyStep)
      
      // 각 단계 이동 시 활동 시간 업데이트
      localStorage.setItem('last_active_time', Date.now().toString())
    }
  }

  // 이전 단계로 이동
  const handlePrev = () => {
    if (currentStep === 'HEALTH_GOALS') {
      setCurrentStep('HEALTH_SURVEY_DIET')
      return
    }

    const allSteps = [
      ...stepGroups['기본 정보'],
      ...stepGroups['건강 설문'],
      ...stepGroups['건강 목표']
    ]
    const currentIndex = allSteps.indexOf(currentStep)
    
    if (currentIndex > 0) {
      setError(null)
      setCurrentStep(allSteps[currentIndex - 1] as SurveyStep)
    }
  }

  // 성별에 따른 카테고리 필터링
  const getFilteredCategories = () => {
    const categories = Object.keys(healthGoalCategories) as HealthGoalCategory[]
    if (surveyData.gender === 'male') {
      return categories.filter(cat => cat !== 'WOMENS_HEALTH' && cat !== 'PREGNANCY')
    }
    if (surveyData.gender === 'female') {
      return categories.filter(cat => cat !== 'MENS_HEALTH')
    }
    return categories
  }

  // 키워드 선택/해제 처리
  const toggleKeyword = (keyword: string) => {
    if (!currentCategory) return

    // '관심없음'을 선택한 경우 다른 키워드는 모두 제거
    if (keyword === '관심없음') {
      // 이미 '관심없음'이 선택되어 있으면 제거
      if (selectedHealthGoals.includes('관심없음')) {
        setSelectedHealthGoals([])
      } else {
        // 그렇지 않으면 '관심없음'만 선택
        setSelectedHealthGoals(['관심없음'])
      }
      return
    }

    // 다른 키워드를 선택한 경우
    setSelectedHealthGoals(prev => {
      // '관심없음'이 선택되어 있으면 제거하고 새 키워드만 선택
      if (prev.includes('관심없음')) {
        return [keyword]
      }
      
      // 이미 선택된 키워드라면 제거
      if (prev.includes(keyword)) {
        return prev.filter(k => k !== keyword)
      }
      
      // 아니면 추가
      return [...prev, keyword]
    })
  }

  // 해당없음 선택 처리
  const selectNone = () => {
    if (!currentCategory) return

    setSelectedHealthGoals(['관심없음'])
  }

  // 다음 카테고리로 이동
  const moveToNextCategory = () => {
    if (!currentCategory) return

    // 현재 카테고리의 선택 상태를 저장
    setCategorySelections(prev => ({
      ...prev,
      [currentCategory]: [...selectedHealthGoals]
    }))

    const categories = getFilteredCategories()
    const currentIndex = categories.indexOf(currentCategory)
    
    if (currentIndex === categories.length - 1) {
      // 마지막 카테고리인 경우 완료 처리
      handleSubmit()
    } else {
      // 다음 카테고리로 이동
      const nextCategory = categories[currentIndex + 1] as HealthGoalCategory
      
      // 다음 카테고리로 변경
      setCurrentCategory(nextCategory)
      
      // 새 카테고리의 이전 선택 상태 로드
      const prevSelections = categorySelections[nextCategory] || []
      setSelectedHealthGoals(prevSelections)
    }
  }

  // 이전 카테고리로 이동
  const moveToPrevCategory = () => {
    if (!currentCategory) return

    // 현재 카테고리의 선택 상태를 저장
    setCategorySelections(prev => ({
      ...prev,
      [currentCategory]: [...selectedHealthGoals]
    }))

    const categories = getFilteredCategories()
    const currentIndex = categories.indexOf(currentCategory)
    
    if (currentIndex > 0) {
      const prevCategory = categories[currentIndex - 1] as HealthGoalCategory
      
      // 이전 카테고리로 변경
      setCurrentCategory(prevCategory)
      
      // 이전 카테고리의 선택 상태 로드
      const prevSelections = categorySelections[prevCategory] || []
      setSelectedHealthGoals(prevSelections)
    } else {
      // 첫 번째 카테고리에서는 건강설문으로 돌아가기
      setCurrentStep('HEALTH_SURVEY_DIET')
    }
  }

  // 현재 카테고리의 선택 여부 확인
  const canProceed = () => {
    if (!currentCategory) return false
    
    // '관심없음'이 선택되었거나, 현재 카테고리에 해당하는 키워드 중 하나라도 선택된 경우
    if (selectedHealthGoals.includes('관심없음')) {
      return true
    }
    
    // 현재 카테고리의 키워드들
    const categoryKeywords = healthGoalCategories[currentCategory].keywords
    
    // 현재 카테고리에서 선택된 키워드가 있는지 확인
    const hasSelectedKeywordsInCurrentCategory = selectedHealthGoals.some(
      keyword => categoryKeywords.includes(keyword)
    )
    
    return hasSelectedKeywordsInCurrentCategory
  }

  const renderHealthSurvey = (step: SurveyStep) => {
    const field = healthSurveyFields[step]
    const value = surveyData[field]

    const getScoreText = (score: number) => {
      if (step === 'HEALTH_SURVEY_FATIGUE') {
        switch (score) {
          case 1: return '활력 넘침'
          case 2: return '약간 피곤'
          case 3: return '보통'
          case 4: return '많이 피곤'
          case 5: return '매우 피곤'
        }
      } else if (step === 'HEALTH_SURVEY_SLEEP') {
        switch (score) {
          case 1: return '매우 잘잠'
          case 2: return '잘 자는편'
          case 3: return '보통'
          case 4: return '잘 못잠'
          case 5: return '매우 못잠'
        }
      } else if (step === 'HEALTH_SURVEY_DIGESTION') {
        switch (score) {
          case 1: return '매우 좋음'
          case 2: return '좋은 편'
          case 3: return '보통'
          case 4: return '나쁜 편'
          case 5: return '매우 나쁨'
        }
      } else if (step === 'HEALTH_SURVEY_IMMUNITY') {
        switch (score) {
          case 1: return '매우 강함'
          case 2: return '강한 편'
          case 3: return '보통'
          case 4: return '약한 편'
          case 5: return '매우 약함'
        }
      } else if (step === 'HEALTH_SURVEY_SKIN') {
        switch (score) {
          case 1: return '매우 좋음'
          case 2: return '좋은 편'
          case 3: return '보통'
          case 4: return '나쁜 편'
          case 5: return '매우 나쁨'
        }
      } else if (step === 'HEALTH_SURVEY_CONCENTRATION') {
        switch (score) {
          case 1: return '매우 좋음'
          case 2: return '좋은 편'
          case 3: return '보통'
          case 4: return '나쁜 편'
          case 5: return '매우 나쁨'
        }
      } else if (step === 'HEALTH_SURVEY_STRESS') {
        switch (score) {
          case 1: return '거의 없음'
          case 2: return '약한 편'
          case 3: return '보통'
          case 4: return '심한 편'
          case 5: return '매우 심함'
        }
      } else if (step === 'HEALTH_SURVEY_JOINT') {
        switch (score) {
          case 1: return '전혀 없음'
          case 2: return '가끔 있음'
          case 3: return '보통'
          case 4: return '자주 있음'
          case 5: return '매우 심함'
        }
      } else if (step === 'HEALTH_SURVEY_WEIGHT') {
        switch (score) {
          case 1: return '필요없음'
          case 2: return '약간 필요'
          case 3: return '보통'
          case 4: return '필요함'
          case 5: return '매우 필요'
        }
      } else if (step === 'HEALTH_SURVEY_DIET') {
        switch (score) {
          case 1: return '매우 균형'
          case 2: return '균형잡힘'
          case 3: return '보통'
          case 4: return '불균형함'
          case 5: return '매우 불균형'
        }
      }
      return ''
    }

    const getScaleLabels = (step: SurveyStep) => {
      switch (step) {
        case 'HEALTH_SURVEY_FATIGUE':
          return ['전혀 피곤하지 않음', '매우 피곤함']
        case 'HEALTH_SURVEY_SLEEP':
          return ['숙면을 잘 취함', '숙면을 못 취함']
        case 'HEALTH_SURVEY_DIGESTION':
          return ['소화가 잘됨', '소화가 안됨']
        case 'HEALTH_SURVEY_IMMUNITY':
          return ['면역력이 좋음', '면역력이 나쁨']
        case 'HEALTH_SURVEY_SKIN':
          return ['피부상태가 좋음', '피부상태가 나쁨']
        case 'HEALTH_SURVEY_CONCENTRATION':
          return ['집중력이 좋음', '집중력이 나쁨']
        case 'HEALTH_SURVEY_STRESS':
          return ['스트레스 없음', '스트레스 많음']
        case 'HEALTH_SURVEY_JOINT':
          return ['통증이 없음', '통증이 심함']
        case 'HEALTH_SURVEY_WEIGHT':
          return ['관리 불필요', '관리 필요']
        case 'HEALTH_SURVEY_DIET':
          return ['균형잡힌 식단', '불균형한 식단']
        default:
          return ['', '']
      }
    }

    return (
      <div className="w-full space-y-12">
        <div>
          <div className="flex justify-center mb-12">
            <div className="relative w-16 h-16">
              <Image
                src="/logo-animation.svg"
                alt="Nutri AI Logo"
                width={64}
                height={64}
                className={isLoading ? "animate-spin-slow" : ""}
              />
            </div>
          </div>
          <h3 className="text-2xl font-semibold mb-10 text-center text-gray-800">
            {healthSurveyQuestions[step]}
          </h3>
          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}
          <div className="flex justify-center gap-4">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                className={`w-24 h-24 rounded-xl transition-all duration-300 text-lg font-medium flex flex-col items-center justify-center gap-1 ${
                  value === score
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-110'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setSurveyData(prev => ({ ...prev, [field]: score }))}
              >
                <span className="text-xl font-bold">{score}</span>
                <span className="text-xs px-1 text-center">
                  {getScoreText(score)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-6 px-2 text-sm text-gray-500">
            <span>{getScaleLabels(step)[0]}</span>
            <span>{getScaleLabels(step)[1]}</span>
            {step === 'HEALTH_SURVEY_FATIGUE' && (
              <>
                <span>전혀 피곤하지 않음</span>
                <span>매우 피곤함</span>
              </>
            )}
            {step === 'HEALTH_SURVEY_SLEEP' && (
              <>
                <span>숙면을 잘 취함</span>
                <span>숙면을 못 취함</span>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <button
            className="w-32 py-4 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors duration-200 text-lg"
            onClick={handlePrev}
          >
            이전
          </button>
          <button
            className="w-32 py-4 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors duration-200 shadow-lg shadow-blue-500/30 text-lg"
            onClick={handleNext}
          >
            다음
          </button>
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'BASIC_INFO_BIRTH':
        return (
          <div className="w-full space-y-12">
            <div>
              <div className="flex justify-center mb-12">
                <div className="relative w-16 h-16">
                  <Image
                    src="/logo-animation.svg"
                    alt="Nutri AI Logo"
                    width={64}
                    height={64}
                    className={isLoading ? "animate-spin-slow" : ""}
                  />
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-10 text-center text-gray-800">
                생년월일을 알려주세요
              </h3>
              {error && (
                <p className="text-red-500 text-sm text-center mb-4">
                  {error}
                </p>
              )}
              <div className="flex justify-center gap-4">
                <div className="relative w-28">
                  <select 
                    className="w-full p-4 border-2 rounded-xl appearance-none bg-white text-center cursor-pointer hover:border-blue-500 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                    value={surveyData.birthDate?.split('-')[0] || ''}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, birthDate: e.target.value + '-01-01' }))}
                  >
                    <option value="">년</option>
                    {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
                <div className="relative w-24">
                  <select 
                    className="w-full p-4 border-2 rounded-xl appearance-none bg-white text-center cursor-pointer hover:border-blue-500 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                    value={surveyData.birthDate?.split('-')[1] || ''}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, birthDate: prev.birthDate?.split('-')[0] + '-' + e.target.value + '-01' }))}
                  >
                    <option value="">월</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
                <div className="relative w-24">
                  <select 
                    className="w-full p-4 border-2 rounded-xl appearance-none bg-white text-center cursor-pointer hover:border-blue-500 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                    value={surveyData.birthDate?.split('-')[2] || ''}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, birthDate: prev.birthDate?.split('-')[0] + '-' + prev.birthDate?.split('-')[1] + '-' + e.target.value }))}
                  >
                    <option value="">일</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex flex-col items-center gap-4 px-4">
              <button
                className="w-64 py-4 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors duration-200 shadow-lg shadow-blue-500/30 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (!surveyData.birthDate) {
                    setError('생년월일을 입력해주세요')
                    return
                  }
                  setCurrentStep('BASIC_INFO_GENDER')
                }}
                disabled={!surveyData.birthDate}
              >
                다음
              </button>
            </div>
          </div>
        )

      case 'BASIC_INFO_GENDER':
        return (
          <div className="w-full space-y-12">
            <div>
              <div className="flex justify-center mb-12">
                <div className="relative w-16 h-16">
                  <Image
                    src="/logo-animation.svg"
                    alt="Nutri AI Logo"
                    width={64}
                    height={64}
                    className={isLoading ? "animate-spin-slow" : ""}
                  />
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-10 text-center text-gray-800">
                성별을 선택해주세요
              </h3>
              {error && (
                <p className="text-red-500 text-sm text-center mb-4">{error}</p>
              )}
              <div className="flex justify-center gap-8">
                <button
                  className={`w-40 py-6 rounded-xl transition-all duration-300 text-lg font-medium flex flex-col items-center gap-3 ${
                    surveyData.gender === 'male'
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setSurveyData(prev => ({ ...prev, gender: 'male' }))}
                >
                  <svg
                    className={`w-12 h-12 ${
                      surveyData.gender === 'male' ? 'text-white' : 'text-blue-500'
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="6" />
                    <path d="M18 6l4-4m0 0h-4m4 0v4" strokeLinecap="round" />
                  </svg>
                  남성
                </button>
                <button
                  className={`w-40 py-6 rounded-xl transition-all duration-300 text-lg font-medium flex flex-col items-center gap-3 ${
                    surveyData.gender === 'female'
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setSurveyData(prev => ({ ...prev, gender: 'female' }))}
                >
                  <svg
                    className={`w-12 h-12 ${
                      surveyData.gender === 'female' ? 'text-white' : 'text-pink-500'
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="10" r="7" />
                    <path d="M12 17v5M9 19h6" strokeLinecap="round" />
                  </svg>
                  여성
                </button>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <button
                className="w-32 py-4 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors duration-200 text-lg"
                onClick={handlePrev}
              >
                이전
              </button>
              <button
                className="w-32 py-4 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors duration-200 shadow-lg shadow-blue-500/30 text-lg"
                onClick={() => {
                  if (!surveyData.gender) {
                    setError('성별을 선택해주세요')
                    return
                  }
                  setCurrentStep('BASIC_INFO_HEIGHT')
                }}
                disabled={!surveyData.gender}
              >
                다음
              </button>
            </div>
          </div>
        )

      case 'BASIC_INFO_HEIGHT':
        return (
          <div className="w-full space-y-12">
            <div>
              <div className="flex justify-center mb-12">
                <div className="relative w-16 h-16">
                  <Image
                    src="/logo-animation.svg"
                    alt="Nutri AI Logo"
                    width={64}
                    height={64}
                    className={isLoading ? "animate-spin-slow" : ""}
                  />
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-10 text-center text-gray-800">
                키를 입력해주세요
              </h3>
              {error && (
                <p className="text-red-500 text-sm text-center mb-4">{error}</p>
              )}
              <div className="flex justify-center items-center gap-2">
                <input
                  type="number"
                  value={surveyData.height || ''}
                  onChange={(e) => setSurveyData(prev => ({ ...prev, height: Number(e.target.value) }))}
                  className="w-32 px-4 py-4 border-2 rounded-xl text-center text-lg"
                  placeholder="170"
                />
                <span className="text-lg text-gray-600">cm</span>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <button
                className="w-32 py-4 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors duration-200 text-lg"
                onClick={handlePrev}
              >
                이전
              </button>
              <button
                className="w-32 py-4 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors duration-200 shadow-lg shadow-blue-500/30 text-lg"
                onClick={handleNext}
              >
                다음
              </button>
            </div>
          </div>
        )

      case 'BASIC_INFO_WEIGHT':
        return (
          <div className="w-full space-y-12">
            <div>
              <div className="flex justify-center mb-12">
                <div className="relative w-16 h-16">
                  <Image
                    src="/logo-animation.svg"
                    alt="Nutri AI Logo"
                    width={64}
                    height={64}
                    className="animate-spin-slow"
                  />
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-10 text-center text-gray-800">
                몸무게를 입력해주세요
              </h3>
              {error && (
                <p className="text-red-500 text-sm text-center mb-4">{error}</p>
              )}
              <div className="flex justify-center items-center gap-2">
                <input
                  type="number"
                  value={surveyData.weight || ''}
                  onChange={(e) => setSurveyData(prev => ({ ...prev, weight: Number(e.target.value) }))}
                  className="w-32 px-4 py-4 border-2 rounded-xl text-center text-lg"
                  placeholder="65"
                />
                <span className="text-lg text-gray-600">kg</span>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <button
                className="w-32 py-4 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors duration-200 text-lg"
                onClick={handlePrev}
              >
                이전
              </button>
              <button
                className="w-32 py-4 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors duration-200 shadow-lg shadow-blue-500/30 text-lg"
                onClick={handleNext}
              >
                다음
              </button>
            </div>
          </div>
        )

      case 'BASIC_INFO_DISEASE':
        return (
          <div className="w-full space-y-12">
            <div>
              <div className="flex justify-center mb-12">
                <div className="relative w-16 h-16">
                  <Image
                    src="/logo-animation.svg"
                    alt="Nutri AI Logo"
                    width={64}
                    height={64}
                    className="animate-spin-slow"
                  />
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-10 text-center text-gray-800">
                보유하고 계신 질병을 선택해주세요
              </h3>
              {error && (
                <p className="text-red-500 text-sm text-center mb-4">{error}</p>
              )}
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {DISEASES.map((disease) => (
                  <button
                    key={disease}
                    className={`w-full py-3 px-4 rounded-xl transition-colors duration-200 text-base font-medium ${
                      surveyData.diseases?.includes(disease)
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => {
                      if (disease === '없음') {
                        setSurveyData(prev => ({ 
                          ...prev, 
                          diseases: ['없음'],
                          customDisease: '',
                          isCustomDiseaseActive: false
                        }))
                      } else {
                        setSurveyData(prev => ({
                          ...prev,
                          diseases: prev.diseases?.includes(disease)
                            ? prev.diseases.filter(d => d !== disease)
                            : [...(prev.diseases?.filter(d => d !== '없음') || []), disease]
                        }))
                      }
                    }}
                  >
                    {disease}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <button
                className="w-32 py-4 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors duration-200 text-lg"
                onClick={handlePrev}
              >
                이전
              </button>
              <button
                className="w-32 py-4 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors duration-200 shadow-lg shadow-blue-500/30 text-lg"
                onClick={handleNext}
              >
                다음
              </button>
            </div>
          </div>
        )

      // 건강설문 케이스 추가
      case 'HEALTH_SURVEY_FATIGUE':
      case 'HEALTH_SURVEY_SLEEP':
      case 'HEALTH_SURVEY_DIGESTION':
      case 'HEALTH_SURVEY_IMMUNITY':
      case 'HEALTH_SURVEY_SKIN':
      case 'HEALTH_SURVEY_CONCENTRATION':
      case 'HEALTH_SURVEY_STRESS':
      case 'HEALTH_SURVEY_JOINT':
      case 'HEALTH_SURVEY_WEIGHT':
      case 'HEALTH_SURVEY_DIET':
        return renderHealthSurvey(currentStep)

      case 'HEALTH_GOALS':
        return (
          <div className="w-full space-y-8">
            <div>
              <div className="flex justify-center mb-12">
                <div className="relative w-16 h-16">
                  <Image
                    src="/logo-animation.svg"
                    alt="Nutri AI Logo"
                    width={64}
                    height={64}
                    className="animate-spin-slow"
                  />
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  {currentCategory && healthGoalCategories[currentCategory].title}
                </h2>
                <p className="text-sm text-gray-600">
                  관심 있는 키워드를 모두 선택해주세요
                </p>
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg mt-4">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-8">
                {currentCategory && [
                  ...healthGoalCategories[currentCategory].keywords,
                  '관심없음'
                ].map((keyword) => {
                  // 관심없음이 선택된 경우 다른 키워드 비활성화
                  const isNoneSelected = selectedHealthGoals.includes('관심없음')
                  // 다른 키워드가 선택된 경우 관심없음 비활성화
                  const hasOtherSelections = selectedHealthGoals.length > 0 && !selectedHealthGoals.includes('관심없음')
                  
                  // 초기 상태에서는 모두 활성화, 선택 후에만 조건부 비활성화
                  const isDisabled = 
                    (keyword === '관심없음' && hasOtherSelections) || 
                    (keyword !== '관심없음' && isNoneSelected)
                    
                  return (
                    <button
                      key={keyword}
                      onClick={() => {
                        if (keyword === '관심없음') {
                          setSelectedHealthGoals(['관심없음'])
                        } else {
                          toggleKeyword(keyword)
                        }
                      }}
                      className={`p-3 rounded-xl text-sm font-medium transition-all ${
                        isDisabled 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : keyword === '관심없음'
                            ? selectedHealthGoals.includes('관심없음')
                              ? 'bg-gray-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : selectedHealthGoals.includes(keyword)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {keyword}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={moveToPrevCategory}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  이전
                </button>
                <button
                  onClick={moveToNextCategory}
                  disabled={!canProceed()}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    canProceed()
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {getFilteredCategories().indexOf(currentCategory as HealthGoalCategory) === getFilteredCategories().length - 1 ? '완료' : '다음'}
                </button>
              </div>

              <div className="mt-8">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{getFilteredCategories().indexOf(currentCategory as HealthGoalCategory) + 1}</span>
                  <span>{getFilteredCategories().length}</span>
                </div>
                <div className="h-1 bg-gray-200 rounded-full mt-2">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${((getFilteredCategories().indexOf(currentCategory as HealthGoalCategory) + 1) / getFilteredCategories().length) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )

      // 다른 단계들은 추후 구현
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto">
            <Image
              src="/logo-animation.svg"
              alt="Nutri AI Logo"
              width={96}
              height={96}
              className="animate-spin-slow"
              style={{ animation: 'spin-slow 20s linear infinite' }}
            />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
            NUTRI - AI
          </h1>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="w-full bg-gray-200 h-2 rounded-full relative">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${calculateProgress()}%` }}
                />
                <span 
                  className="absolute -top-6 text-sm font-medium text-gray-600 transform -translate-x-1/2 whitespace-nowrap"
                  style={{ 
                    left: `${calculateProgress() / 2}%`
                  }}
                >
                  {stepTitles[currentStep]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="min-h-screen flex flex-col">
        {/* 입력 영역 */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            {renderStep()}
          </div>
        </div>

        {/* 푸터 */}
        <footer className="py-8 bg-gradient-to-t from-blue-50/50">
          <p className="text-center text-gray-600 text-sm leading-relaxed">
            AI-개인맞춤형 건강설계로<br />
            스마트한 건강생활을 시작하세요
          </p>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  )
}