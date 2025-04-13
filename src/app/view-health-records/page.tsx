'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/lib/firebase'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { FaHeartbeat, FaWeight, FaBed, FaRunning, FaBrain } from 'react-icons/fa'
import { GiMuscleUp } from 'react-icons/gi'
import { BsWater } from 'react-icons/bs'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { exerciseTips } from '@/data/exerciseTips'

interface HealthRecord {
  id: string
  date: string
  weight: string
  height: string
  bodyFat: string
  muscleMass: string
  sleepHours: string
  exerciseType: string
  exerciseDuration: string
  exerciseIntensity: string
  steps: string
  waterIntake: string
  meals: {
    breakfast: string
    lunch: string
    dinner: string
    snacks: string
  }
  supplements: string[]
  stressLevel: string
  mood: string
  energyLevel: string
  symptoms: string[]
  note: string
  createdAt: string
}

export default function ViewHealthRecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, 'healthRecords'))
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HealthRecord[]
      setRecords(docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    }
    fetchData()
  }, [])

  // 10초마다 다음 팁으로 변경
  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % exerciseTips.length)
        setIsAnimating(false)
      }, 500)
    }, 10000)

    return () => clearInterval(timer)
  }, [])

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
          <h1 className="text-2xl font-bold text-gray-800">내 건강기록</h1>
          <button
            onClick={() => router.push('/health-records')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">기록하기</span>
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        {/* 캘린더 섹션 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <span className="text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </span>
            건강 기록 캘린더
          </h2>
          <div className="flex justify-center">
            <Calendar
              onChange={handleDateChange}
              value={selectedDate}
              tileContent={tileContent}
              className="w-full max-w-4xl shadow-lg rounded-xl border-2 border-gray-100"
              calendarType="gregory"
              formatDay={(locale, date) => date.toLocaleDateString('ko-KR', { day: 'numeric' })}
              formatMonth={(locale, date) => date.toLocaleDateString('ko-KR', { month: 'long' })}
              formatYear={(locale, date) => date.toLocaleDateString('ko-KR', { year: 'numeric' })}
            />
          </div>
        </motion.div>

        {/* 선택된 날짜의 기록 목록 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </span>
            {selectedDate ? selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '날짜를 선택하세요'}의 건강 기록
          </h2>
          {getRecordsForDate(selectedDate).map((record) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-4 w-full">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {record.weight && (
                      <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
                        <FaWeight className="text-blue-500 text-2xl" />
                        <div>
                          <p className="text-sm text-blue-600 font-medium">체중</p>
                          <p className="text-lg font-bold text-gray-900">{record.weight}kg</p>
                        </div>
                      </div>
                    )}
                    {record.sleepHours && (
                      <div className="flex items-center gap-3 bg-purple-50 rounded-xl p-4">
                        <FaBed className="text-purple-500 text-2xl" />
                        <div>
                          <p className="text-sm text-purple-600 font-medium">수면</p>
                          <p className="text-lg font-bold text-gray-900">{record.sleepHours}시간</p>
                        </div>
                      </div>
                    )}
                    {record.exerciseType && (
                      <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4">
                        <FaRunning className="text-green-500 text-2xl" />
                        <div>
                          <p className="text-sm text-green-600 font-medium">운동</p>
                          <p className="text-lg font-bold text-gray-900">{record.exerciseType}</p>
                        </div>
                      </div>
                    )}
                    {record.waterIntake && (
                      <div className="flex items-center gap-3 bg-cyan-50 rounded-xl p-4">
                        <BsWater className="text-cyan-500 text-2xl" />
                        <div>
                          <p className="text-sm text-cyan-600 font-medium">물 섭취</p>
                          <p className="text-lg font-bold text-gray-900">{record.waterIntake}L</p>
                        </div>
                      </div>
                    )}
                    {record.stressLevel && (
                      <div className="flex items-center gap-3 bg-orange-50 rounded-xl p-4">
                        <FaBrain className="text-orange-500 text-2xl" />
                        <div>
                          <p className="text-sm text-orange-600 font-medium">스트레스</p>
                          <p className="text-lg font-bold text-gray-900">{record.stressLevel}/10</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {record.note && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-gray-900">💬 {record.note}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(record.id)}
                  className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
          {getRecordsForDate(selectedDate).length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-xl text-gray-500 font-medium">
                {selectedDate ? '이 날짜의 건강 기록이 없습니다.' : '날짜를 선택하여 건강 기록을 확인하세요.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 운동 팁 슬라이더 */}
      <div className="bg-white shadow-md py-6 mt-16">
        <div className="max-w-5xl mx-auto px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTipIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="bg-gray-100 p-3 rounded-xl">
                <FaRunning className="text-3xl text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-600 mb-1">오늘의 운동 팁</h3>
                <p className="text-xl font-medium text-gray-700">{exerciseTips[currentTipIndex]}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
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

      <style jsx global>{`
        .react-calendar {
          width: 100% !important;
          max-width: 100% !important;
          padding: 1.5rem;
          background: white;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.125em;
        }
        .react-calendar__navigation {
          margin-bottom: 1.5rem;
        }
        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 1.2rem;
          padding: 0.5rem;
        }
        .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        .react-calendar__month-view__days__day {
          padding: 1rem 0;
          font-size: 1.1rem;
        }
        .react-calendar__tile {
          position: relative;
          padding: 1.5rem 0.5rem;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: #e6e6e6;
          border-radius: 0.5rem;
        }
        .react-calendar__tile--now {
          background: #d1e9ff !important;
          border-radius: 0.5rem;
        }
        .react-calendar__tile--active {
          background: #3b82f6 !important;
          color: white;
          border-radius: 0.5rem;
        }
        .react-calendar__tile--active:enabled:hover,
        .react-calendar__tile--active:enabled:focus {
          background: #2563eb !important;
        }
        .react-calendar__navigation button:disabled {
          background-color: #f0f0f0;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: #e6e6e6;
          border-radius: 0.5rem;
        }
      `}</style>
    </main>
  )
} 