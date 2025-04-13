'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { onAuthStateChanged } from 'firebase/auth'

interface UserProfile {
  name: string
  email: string
  gender: string
  birthDate: string
  height: string
  weight: string
  healthGoals: string[]
  healthConditions: string[]
  allergies: string[]
  medications: string[]
  dietaryRestrictions: string[]
  activityLevel: string
  sleepHours: string
  stressLevel: string
  waterIntake: string
  smoking: string
  alcohol: string
  caffeine: string
}

const healthGoals = [
  '체중 감량',
  '체중 증가',
  '근육 증가',
  '체력 향상',
  '면역력 강화',
  '스트레스 관리',
  '수면 개선',
  '소화 기능 개선',
  '피부 건강',
  '두뇌 기능 향상',
]

const healthConditions = [
  '당뇨병',
  '고혈압',
  '고지혈증',
  '심장 질환',
  '갑상선 질환',
  '골다공증',
  '관절염',
  '빈혈',
  '알레르기',
  '소화기 질환',
]

const activityLevels = [
  '거의 운동하지 않음',
  '가벼운 운동 (주 1-3일)',
  '중간 정도 운동 (주 3-5일)',
  '적극적인 운동 (주 6-7일)',
  '매우 적극적인 운동 (하루 2회 이상)',
]

const stressLevels = ['매우 낮음', '낮음', '보통', '높음', '매우 높음']

export default function MembershipInfoPage() {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    gender: '',
    birthDate: '',
    height: '',
    weight: '',
    healthGoals: [],
    healthConditions: [],
    allergies: [],
    medications: [],
    dietaryRestrictions: [],
    activityLevel: '',
    sleepHours: '',
    stressLevel: '',
    waterIntake: '',
    smoking: '',
    alcohol: '',
    caffeine: '',
  })

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const storedUsername = localStorage.getItem('username')
        if (!storedUsername) {
          setIsLoading(false)
          router.replace('/login')
          return
        }

        const userDoc = await getDoc(doc(db, 'users', storedUsername))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setProfile(prev => ({
            ...prev,
            ...data,
          }))
        }
      } catch (error) {
        console.error('프로필 로드 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfile()
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target
    setProfile(prev => ({
      ...prev,
      [name]: checked
        ? [...(prev[name as keyof UserProfile] as string[]), value]
        : (prev[name as keyof UserProfile] as string[]).filter((item: string) => item !== value),
    }))
  }

  const handleUpdateProfile = async () => {
    try {
      const storedUsername = localStorage.getItem('username')
      if (!storedUsername) {
        console.error('사용자가 로그인되어 있지 않습니다.')
        router.replace('/login')
        return
      }

      const profileData = {
        ...profile,
        updatedAt: new Date().toISOString(),
      }

      await updateDoc(doc(db, 'users', storedUsername), profileData)
      setIsEditing(false)
      alert('프로필이 성공적으로 업데이트되었습니다.')
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
      alert('프로필 업데이트 중 오류가 발생했습니다.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">회원 정보</h1>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditing ? '취소' : '프로필 변경'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">기본 정보</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                <select
                  name="gender"
                  value={profile.gender}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">선택하세요</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
                <input
                  type="date"
                  name="birthDate"
                  value={profile.birthDate}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* 신체 정보 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">신체 정보</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">키 (cm)</label>
                <input
                  type="number"
                  name="height"
                  value={profile.height}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">체중 (kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={profile.weight}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* 건강 목표 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">건강 목표</h2>
              <div className="grid grid-cols-2 gap-2">
                {healthGoals.map(goal => (
                  <label key={goal} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="healthGoals"
                      value={goal}
                      checked={profile.healthGoals.includes(goal)}
                      onChange={handleCheckboxChange}
                      disabled={!isEditing}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <span className="text-sm text-gray-700">{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 건강 상태 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">건강 상태</h2>
              <div className="grid grid-cols-2 gap-2">
                {healthConditions.map(condition => (
                  <label key={condition} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="healthConditions"
                      value={condition}
                      checked={profile.healthConditions.includes(condition)}
                      onChange={handleCheckboxChange}
                      disabled={!isEditing}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <span className="text-sm text-gray-700">{condition}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 생활 습관 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">생활 습관</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">활동 수준</label>
                <select
                  name="activityLevel"
                  value={profile.activityLevel}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">선택하세요</option>
                  {activityLevels.map(level => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">평균 수면 시간 (시간)</label>
                <input
                  type="number"
                  name="sleepHours"
                  value={profile.sleepHours}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">스트레스 수준</label>
                <select
                  name="stressLevel"
                  value={profile.stressLevel}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">선택하세요</option>
                  {stressLevels.map(level => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleUpdateProfile}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                저장하기
              </button>
            </div>
          )}
        </motion.div>
      </div>

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
