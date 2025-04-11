'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function MembershipInfoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    height: '',
    weight: '',
    visionLeft: '',
    visionRight: '',
    address: '',
    detailAddress: '',
    exerciseFrequency: '',
    dietType: '',
    sleepQuality: '',
    healthGoal: '',
    allergies: '',
  })

  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (!storedUsername) {
      router.push('/login')
      return
    }
    // Firestore에서 사용자 데이터 불러오기
    getDoc(doc(db, 'users', storedUsername))
      .then(docSnapshot => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data()
          setFormState({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            gender: data.gender || '',
            birthYear: data.birthYear || '',
            birthMonth: data.birthMonth || '',
            birthDay: data.birthDay || '',
            height: data.height || '',
            weight: data.weight || '',
            visionLeft: data.visionLeft || '',
            visionRight: data.visionRight || '',
            address: data.address || '',
            detailAddress: data.detailAddress || '',
            exerciseFrequency: data.exerciseFrequency || '',
            dietType: data.dietType || '',
            sleepQuality: data.sleepQuality || '',
            healthGoal: data.healthGoal || '',
            allergies: data.allergies || '',
          })
        } else {
          setError('해당 사용자 데이터를 찾을 수 없습니다.')
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('사용자 데이터 로드 실패:', err)
        setError('사용자 데이터를 로드하는 데 문제가 발생했습니다.')
        setLoading(false)
      })
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormState(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const storedUsername = localStorage.getItem('username')
    if (!storedUsername) return

    try {
      await updateDoc(doc(db, 'users', storedUsername), formState)
      alert('프로필 업데이트 성공!')
      router.push('/dashboard')
    } catch (err) {
      console.error('프로필 업데이트 실패:', err)
      setError('프로필 업데이트 중 문제가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>로딩중...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-4 text-blue-700">내 프로필 상세정보</h1>

        {error && (
          <div className="mb-4 text-red-600">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 기본 정보 */}
            <div>
              <label className="block text-gray-700">이름</label>
              <input
                type="text"
                name="name"
                value={formState.name}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700">이메일</label>
              <input
                type="email"
                name="email"
                value={formState.email}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700">휴대폰</label>
              <input
                type="tel"
                name="phone"
                value={formState.phone}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700">성별</label>
              <select
                name="gender"
                value={formState.gender}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">선택</option>
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </div>

            {/* 생년월일 */}
            <div className="md:col-span-2">
              <label className="block text-gray-700">생년월일 (YYYY-MM-DD)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="birthYear"
                  placeholder="YYYY"
                  value={formState.birthYear}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-1/3"
                />
                <input
                  type="text"
                  name="birthMonth"
                  placeholder="MM"
                  value={formState.birthMonth}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-1/3"
                />
                <input
                  type="text"
                  name="birthDay"
                  placeholder="DD"
                  value={formState.birthDay}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-1/3"
                />
              </div>
            </div>

            {/* 신체 정보 */}
            <div>
              <label className="block text-gray-700">키 (cm)</label>
              <input
                type="text"
                name="height"
                value={formState.height}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700">몸무게 (kg)</label>
              <input
                type="number"
                name="weight"
                value={formState.weight}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700">시력 (좌)</label>
              <input
                type="text"
                name="visionLeft"
                value={formState.visionLeft}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700">시력 (우)</label>
              <input
                type="text"
                name="visionRight"
                value={formState.visionRight}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>

            {/* 주소 */}
            <div className="md:col-span-2">
              <label className="block text-gray-700">주소</label>
              <input
                type="text"
                name="address"
                value={formState.address}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-700">상세 주소</label>
              <input
                type="text"
                name="detailAddress"
                value={formState.detailAddress}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>

            {/* 건강 및 생활습관 정보 */}
            <div>
              <label className="block text-gray-700">운동 빈도</label>
              <select
                name="exerciseFrequency"
                value={formState.exerciseFrequency}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">선택</option>
                <option value="없음">없음</option>
                <option value="주 1-2회">주 1-2회</option>
                <option value="주 3-4회">주 3-4회</option>
                <option value="주 5회 이상">주 5회 이상</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700">식습관</label>
              <select
                name="dietType"
                value={formState.dietType}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">선택</option>
                <option value="균형 잡힌 식사">균형 잡힌 식사</option>
                <option value="외식 빈번">외식 빈번</option>
                <option value="패스트푸드 위주">패스트푸드 위주</option>
                <option value="채식">채식</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700">수면의 질</label>
              <select
                name="sleepQuality"
                value={formState.sleepQuality}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">선택</option>
                <option value="매우 좋음">매우 좋음</option>
                <option value="좋음">좋음</option>
                <option value="보통">보통</option>
                <option value="나쁨">나쁨</option>
                <option value="매우 나쁨">매우 나쁨</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700">건강 목표</label>
              <select
                name="healthGoal"
                value={formState.healthGoal}
                onChange={handleInputChange}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">선택</option>
                <option value="체중 감량">체중 감량</option>
                <option value="근육 증가">근육 증가</option>
                <option value="에너지 향상">에너지 향상</option>
                <option value="면역력 강화">면역력 강화</option>
                <option value="종합 관리">종합 관리</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700">알레르기 정보</label>
              <input
                type="text"
                name="allergies"
                value={formState.allergies}
                onChange={handleInputChange}
                placeholder="예: 견과류, 해산물 등"
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-8 bg-blue-600 text-white font-semibold py-3 rounded hover:bg-blue-700 transition"
          >
            프로필 업데이트
          </button>
        </form>
      </div>
    </main>
  )
}
