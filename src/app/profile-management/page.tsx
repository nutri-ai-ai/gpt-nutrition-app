'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Profile {
  profileId?: string
  name: string
  phone: string
  address: string
  detailAddress: string
  gender: string
  birthYear: string
  birthMonth: string
  birthDay: string
  height: string
  weight: string
  visionLeft: string
  visionRight: string
  exerciseFrequency: string
  dietType: string
  sleepQuality: string
  healthGoal: string
  allergies: string
}

export default function ProfileManagementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [newProfile, setNewProfile] = useState<Profile>({
    name: '',
    phone: '',
    address: '',
    detailAddress: '',
    gender: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    height: '',
    weight: '',
    visionLeft: '',
    visionRight: '',
    exerciseFrequency: '',
    dietType: '',
    sleepQuality: '',
    healthGoal: '',
    allergies: '',
  })

  // Firestore 사용자 데이터 불러오기
  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (!storedUsername) {
      router.push('/login')
      return
    }
    getDoc(doc(db, 'users', storedUsername))
      .then((docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data()
          // profiles 배열이 존재하면 설정, 없으면 빈 배열
          setProfiles(data.profiles || [])
        } else {
          setError('사용자 데이터를 찾을 수 없습니다.')
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('데이터 로드 실패:', err)
        setError('데이터 로드 중 문제가 발생했습니다.')
        setLoading(false)
      })
  }, [router])

  // 입력값 변경 핸들러 (newProfile)
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setNewProfile((prev) => ({ ...prev, [name]: value }))
  }

  // 새 프로필 추가 함수
  const addProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const storedUsername = localStorage.getItem('username')
    if (!storedUsername) return

    // 추가 프로필에 식별용 profileId를 간단히 타임스탬프로 부여 (원하는 방식으로 생성 가능)
    const profileWithId = { ...newProfile, profileId: Date.now().toString() }
    const updatedProfiles = [...profiles, profileWithId]

    try {
      await updateDoc(doc(db, 'users', storedUsername), {
        profiles: updatedProfiles,
      })
      alert('새 프로필이 추가되었습니다.')
      setProfiles(updatedProfiles)
      // 폼 리셋 (필요한 경우)
      setNewProfile({
        name: '',
        phone: '',
        address: '',
        detailAddress: '',
        gender: '',
        birthYear: '',
        birthMonth: '',
        birthDay: '',
        height: '',
        weight: '',
        visionLeft: '',
        visionRight: '',
        exerciseFrequency: '',
        dietType: '',
        sleepQuality: '',
        healthGoal: '',
        allergies: '',
      })
    } catch (err) {
      console.error('프로필 추가 실패:', err)
      setError('새 프로필을 추가하는 데 문제가 발생했습니다.')
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
        <h1 className="text-3xl font-bold mb-4 text-blue-700">프로필 관리하기</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}

        {/* 현재 추가 프로필 목록 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">추가 프로필 목록</h2>
          {profiles.length === 0 ? (
            <p>등록된 추가 프로필이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {profiles.map((profile) => (
                <li key={profile.profileId} className="p-3 border rounded">
                  <p>
                    <strong>이름:</strong> {profile.name}
                  </p>
                  <p>
                    <strong>전화번호:</strong> {profile.phone}
                  </p>
                  <p>
                    <strong>주소:</strong> {profile.address} {profile.detailAddress}
                  </p>
                  <p>
                    <strong>건강 목표:</strong> {profile.healthGoal}
                  </p>
                  {/* 편집이나 삭제 기능도 추가 가능 */}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 새 프로필 추가 폼 */}
        <section>
          <h2 className="text-2xl font-semibold mb-2">새 프로필 추가</h2>
          <form onSubmit={addProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 기본 정보 */}
              <div>
                <label className="block text-gray-700">이름 *</label>
                <input
                  type="text"
                  name="name"
                  value={newProfile.name}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700">전화번호 *</label>
                <input
                  type="tel"
                  name="phone"
                  value={newProfile.phone}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-full"
                  required
                />
              </div>
              {/* 주소 */}
              <div className="md:col-span-2">
                <label className="block text-gray-700">주소 *</label>
                <input
                  type="text"
                  name="address"
                  value={newProfile.address}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-full"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700">상세 주소 *</label>
                <input
                  type="text"
                  name="detailAddress"
                  value={newProfile.detailAddress}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-full"
                  required
                />
              </div>

              {/* 건강 및 생활습관 정보 */}
              <div>
                <label className="block text-gray-700">성별</label>
                <select
                  name="gender"
                  value={newProfile.gender}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-full"
                >
                  <option value="">선택</option>
                  <option value="남">남</option>
                  <option value="여">여</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700">생년월일 (YYYY-MM-DD)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="birthYear"
                    placeholder="YYYY"
                    value={newProfile.birthYear}
                    onChange={handleInputChange}
                    className="mt-1 p-2 border rounded w-1/3"
                  />
                  <input
                    type="text"
                    name="birthMonth"
                    placeholder="MM"
                    value={newProfile.birthMonth}
                    onChange={handleInputChange}
                    className="mt-1 p-2 border rounded w-1/3"
                  />
                  <input
                    type="text"
                    name="birthDay"
                    placeholder="DD"
                    value={newProfile.birthDay}
                    onChange={handleInputChange}
                    className="mt-1 p-2 border rounded w-1/3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700">키 (cm)</label>
                <input
                  type="text"
                  name="height"
                  value={newProfile.height}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
              <div>
                <label className="block text-gray-700">몸무게 (kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={newProfile.weight}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
              <div>
                <label className="block text-gray-700">시력 (좌)</label>
                <input
                  type="text"
                  name="visionLeft"
                  value={newProfile.visionLeft}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
              <div>
                <label className="block text-gray-700">시력 (우)</label>
                <input
                  type="text"
                  name="visionRight"
                  value={newProfile.visionRight}
                  onChange={handleInputChange}
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
              <div>
                <label className="block text-gray-700">운동 빈도</label>
                <select
                  name="exerciseFrequency"
                  value={newProfile.exerciseFrequency}
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
                  value={newProfile.dietType}
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
                  value={newProfile.sleepQuality}
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
                  value={newProfile.healthGoal}
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
                  value={newProfile.allergies}
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
              새 프로필 추가
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
