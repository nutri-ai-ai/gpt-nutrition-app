// 리디자인된 건강기록 페이지 예시
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { db } from '@/lib/firebase'
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { FaHeartbeat, FaWeight, FaBed, FaRunning, FaBrain } from 'react-icons/fa'
import { GiMuscleUp } from 'react-icons/gi'
import { BsWater } from 'react-icons/bs'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

interface HealthRecord {
  id: string
  date: string
  // 신체 측정
  weight: string
  height: string
  bodyFat: string
  muscleMass: string
  // 활동 & 운동
  sleepHours: string
  exerciseType: string
  customExerciseType: string
  exerciseDuration: string
  exerciseIntensity: string
  steps: string
  // 영양 & 식사
  waterIntake: string
  meals: {
    breakfast: string
    lunch: string
    dinner: string
    snacks: string
  }
  supplements: string[]
  // 컨디션
  stressLevel: string
  mood: string
  energyLevel: string
  // 증상 & 특이사항
  symptoms: string[]
  note: string
  createdAt: string
}

export default function HealthRecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [newRecord, setNewRecord] = useState({
    date: '',
    // 신체 측정
    weight: '',
    height: '',
    bodyFat: '',
    muscleMass: '',
    // 활동 & 운동
    sleepHours: '',
    exerciseType: '',
    customExerciseType: '',
    exerciseDuration: '',
    exerciseIntensity: '',
    steps: '',
    // 영양 & 식사
    waterIntake: '',
    meals: {
      breakfast: '',
      lunch: '',
      dinner: '',
      snacks: ''
    },
    supplements: [] as string[],
    // 컨디션
    stressLevel: '',
    mood: '',
    energyLevel: '',
    // 증상 & 특이사항
    symptoms: [] as string[],
    note: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, 'healthRecords'))
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HealthRecord[]
      setRecords(docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    }
    fetchData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name.startsWith('meals.')) {
      const mealType = name.split('.')[1]
      setNewRecord(prev => ({
        ...prev,
        meals: {
          ...prev.meals,
          [mealType]: value
        }
      }))
    } else {
      setNewRecord(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleArrayInputChange = (name: 'supplements' | 'symptoms', value: string[]) => {
    setNewRecord(prev => ({ ...prev, [name]: value }))
  }

  const handleAddRecord = async () => {
    try {
      const recordToSave = {
        ...newRecord,
        exerciseType: newRecord.exerciseType === '기타' ? newRecord.customExerciseType : newRecord.exerciseType,
        createdAt: new Date().toISOString()
      }
      const docRef = await addDoc(collection(db, 'healthRecords'), recordToSave)
      
      // 기록 추가 후 내 건강기록 보기 페이지로 이동
      router.push('/view-health-records')
      
    } catch (err) {
      console.error('기록 추가 실패:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'healthRecords', id))
      setRecords(prev => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('기록 삭제 실패:', err)
    }
  }

  const getRecordsForDate = (date: Date | null) => {
    if (!date) return []
    return records.filter(record => {
      const recordDate = new Date(record.date)
      return recordDate.toDateString() === date.toDateString()
    })
  }

  const tileContent = ({ date }: { date: Date }) => {
    const recordsForDate = getRecordsForDate(date)
    if (recordsForDate.length > 0) {
      return (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
        </div>
      )
    }
    return null
  }

  const handleDateChange = (value: any) => {
    if (value instanceof Date) {
      setSelectedDate(value)
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      setSelectedDate(value[0])
    } else {
      setSelectedDate(null)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 헤더 */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-lg">뒤로가기</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">건강기록하기</h1>
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        {/* 새 기록 추가 섹션 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <span className="text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </span>
            오늘의 건강 기록하기
          </h2>

          <div className="space-y-8">
            {/* 신체 측정 섹션 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">신체 측정</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">날짜</label>
                  <input
                    type="date"
                    name="date"
                    value={newRecord.date}
                    onChange={handleInputChange}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">체중 (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={newRecord.weight}
                    onChange={handleInputChange}
                    placeholder="체중을 입력하세요"
                    step="0.1"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">신장 (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={newRecord.height}
                    onChange={handleInputChange}
                    placeholder="신장을 입력하세요"
                    step="0.1"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">체지방률 (%)</label>
                  <input
                    type="number"
                    name="bodyFat"
                    value={newRecord.bodyFat}
                    onChange={handleInputChange}
                    placeholder="체지방률을 입력하세요"
                    step="0.1"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">근육량 (kg)</label>
                  <input
                    type="number"
                    name="muscleMass"
                    value={newRecord.muscleMass}
                    onChange={handleInputChange}
                    placeholder="근육량을 입력하세요"
                    step="0.1"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
              </div>
            </div>

            {/* 활동 & 운동 섹션 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">활동 & 운동</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">수면 시간 (시간)</label>
                  <input
                    type="number"
                    name="sleepHours"
                    value={newRecord.sleepHours}
                    onChange={handleInputChange}
                    placeholder="수면 시간을 입력하세요"
                    step="0.5"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">운동 종류</label>
                  <div className="space-y-3">
                    <select
                      name="exerciseType"
                      value={newRecord.exerciseType}
                      onChange={handleInputChange}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    >
                      <option value="">운동 종류 선택</option>
                      <option value="걷기">걷기</option>
                      <option value="달리기">달리기</option>
                      <option value="수영">수영</option>
                      <option value="자전거">자전거</option>
                      <option value="웨이트">웨이트</option>
                      <option value="요가">요가</option>
                      <option value="필라테스">필라테스</option>
                      <option value="기타">기타 (직접 입력)</option>
                    </select>
                    {newRecord.exerciseType === '기타' && (
                      <input
                        type="text"
                        name="customExerciseType"
                        value={newRecord.customExerciseType}
                        onChange={handleInputChange}
                        placeholder="운동 종류를 직접 입력하세요"
                        className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">운동 시간 (분)</label>
                  <input
                    type="number"
                    name="exerciseDuration"
                    value={newRecord.exerciseDuration}
                    onChange={handleInputChange}
                    placeholder="운동 시간을 입력하세요"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
          </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">운동 강도</label>
                  <select
                    name="exerciseIntensity"
                    value={newRecord.exerciseIntensity}
                    onChange={handleInputChange}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  >
                    <option value="">운동 강도 선택</option>
                    <option value="가벼움">가벼움 (숨이 약간 가빠짐)</option>
                    <option value="보통">보통 (대화 가능한 정도)</option>
                    <option value="격렬함">격렬함 (대화 어려움)</option>
                    <option value="매우 격렬함">매우 격렬함 (숨쉬기 힘듦)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">걸음 수</label>
                  <input
                    type="number"
                    name="steps"
                    value={newRecord.steps}
                    onChange={handleInputChange}
                    placeholder="걸음 수를 입력하세요"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
              </div>
            </div>

            {/* 영양 & 식사 섹션 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">영양 & 식사</h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">아침 식사</label>
                  <textarea
                    name="meals.breakfast"
                    value={newRecord.meals.breakfast}
                    onChange={handleInputChange}
                    placeholder="아침 식사 내용을 입력하세요"
                    rows={2}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">점심 식사</label>
                  <textarea
                    name="meals.lunch"
                    value={newRecord.meals.lunch}
                    onChange={handleInputChange}
                    placeholder="점심 식사 내용을 입력하세요"
                    rows={2}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">저녁 식사</label>
                  <textarea
                    name="meals.dinner"
                    value={newRecord.meals.dinner}
                    onChange={handleInputChange}
                    placeholder="저녁 식사 내용을 입력하세요"
                    rows={2}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">간식</label>
                  <textarea
                    name="meals.snacks"
                    value={newRecord.meals.snacks}
                    onChange={handleInputChange}
                    placeholder="간식 내용을 입력하세요"
                    rows={2}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">물 섭취량 (L)</label>
                  <input
                    type="number"
                    name="waterIntake"
                    value={newRecord.waterIntake}
                    onChange={handleInputChange}
                    placeholder="물 섭취량을 입력하세요"
                    step="0.1"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
              </div>
            </div>

            {/* 컨디션 섹션 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">컨디션</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">스트레스 수준 (1-10)</label>
                  <input
                    type="number"
                    name="stressLevel"
                    value={newRecord.stressLevel}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    placeholder="스트레스 수준을 입력하세요"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">기분</label>
                  <select
                    name="mood"
                    value={newRecord.mood}
                    onChange={handleInputChange}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  >
                    <option value="">기분 선택</option>
                    <option value="매우 좋음">매우 좋음</option>
                    <option value="좋음">좋음</option>
                    <option value="보통">보통</option>
                    <option value="나쁨">나쁨</option>
                    <option value="매우 나쁨">매우 나쁨</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">에너지 수준</label>
                  <select
                    name="energyLevel"
                    value={newRecord.energyLevel}
                    onChange={handleInputChange}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  >
                    <option value="">컨디션 선택</option>
                    <option value="매우 좋음">매우 좋음 (활기차고 건강함)</option>
                    <option value="좋음">좋음 (평소보다 좋은 상태)</option>
                    <option value="보통">보통 (평소와 비슷한 상태)</option>
                    <option value="나쁨">나쁨 (피곤하고 지친 상태)</option>
                    <option value="매우 나쁨">매우 나쁨 (몸이 좋지 않고 무기력함)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 증상 & 특이사항 섹션 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">증상 & 특이사항</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">특이 증상</label>
                  <textarea
                    name="symptoms"
                    value={newRecord.symptoms.join(', ')}
                    onChange={(e) => handleArrayInputChange('symptoms', e.target.value.split(',').map(s => s.trim()))}
                    placeholder="특이 증상을 입력하세요 (쉼표로 구분)"
                    rows={2}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">복용 중인 영양제</label>
                  <textarea
                    name="supplements"
                    value={newRecord.supplements.join(', ')}
                    onChange={(e) => handleArrayInputChange('supplements', e.target.value.split(',').map(s => s.trim()))}
                    placeholder="복용 중인 영양제를 입력하세요 (쉼표로 구분)"
                    rows={2}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">추가 메모</label>
                  <textarea
                    name="note"
                    value={newRecord.note}
                    onChange={handleInputChange}
                    placeholder="추가 메모를 입력하세요"
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAddRecord}
              className="mt-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl px-8 py-4 text-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-colors flex-1 shadow-lg hover:shadow-xl"
            >
              기록 추가하기
            </button>
            <button
              onClick={() => router.push('/view-health-records')}
              className="mt-8 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl px-8 py-4 text-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-colors flex-1 shadow-lg hover:shadow-xl"
            >
              내 건강기록 보기
            </button>
        </div>
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