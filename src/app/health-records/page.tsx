// 리디자인된 건강기록 페이지 예시
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Line } from 'react-chartjs-2'
import { db } from '@/lib/firebase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function HealthRecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<any[]>([])
  const [newRecord, setNewRecord] = useState({
    date: '',
    weight: '',
    sleepHours: '',
    exercise: '',
    note: ''
  })

  const chartData = {
    labels: records.map((r) => r.date),
    datasets: [
      {
        label: '체중 (kg)',
        data: records.map((r) => parseFloat(r.weight)),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'BMI',
        data: records.map((r) => parseFloat(r.bmi || 0)),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: '건강 기록 변화 추이' }
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, 'healthRecords'))
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setRecords(docs)
    }
    fetchData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewRecord(prev => ({ ...prev, [name]: value }))
  }

  const handleAddRecord = async () => {
    try {
      const newBMI = newRecord.weight ? (parseFloat(newRecord.weight) / Math.pow(1.7, 2)).toFixed(2) : '0'
      const docRef = await addDoc(collection(db, 'healthRecords'), {
        ...newRecord,
        bmi: newBMI,
        createdAt: new Date().toISOString()
      })
      setRecords(prev => [...prev, { id: docRef.id, ...newRecord, bmi: newBMI }])
      setNewRecord({ date: '', weight: '', sleepHours: '', exercise: '', note: '' })
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

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-800 transition"
          >
            ← 대시보드로
          </button>
          <button
            onClick={() => router.push('/chat')}
            className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-5 py-2 rounded-full text-sm font-medium hover:brightness-110 transition"
          >
            AI 건강 상담하기
          </button>
        </div>

        <section className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">📈 건강 변화 추이</h2>
          <Line data={chartData} options={chartOptions} />
        </section>

        <section className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">📝 새 기록 추가</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="date" name="date" value={newRecord.date} onChange={handleInputChange} className="border border-gray-300 rounded-md p-2 text-sm" />
            <input type="number" name="weight" value={newRecord.weight} onChange={handleInputChange} placeholder="체중 (kg)" className="border border-gray-300 rounded-md p-2 text-sm" />
            <input type="number" name="sleepHours" value={newRecord.sleepHours} onChange={handleInputChange} placeholder="수면 시간" className="border border-gray-300 rounded-md p-2 text-sm" />
            <input type="text" name="exercise" value={newRecord.exercise} onChange={handleInputChange} placeholder="운동" className="border border-gray-300 rounded-md p-2 text-sm" />
            <input type="text" name="note" value={newRecord.note} onChange={handleInputChange} placeholder="메모" className="border border-gray-300 rounded-md p-2 text-sm md:col-span-2" />
          </div>
          <button
            onClick={handleAddRecord}
            className="mt-4 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 w-full transition"
          >
            기록 추가
          </button>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">📋 최근 건강 기록</h2>
          {[...records].reverse().map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-800 font-medium">📅 {r.date}</p>
                  <p className="text-sm text-gray-600">체중: <span className="font-semibold text-blue-600">{r.weight}kg</span></p>
                  <p className="text-sm text-gray-600">BMI: <span className="text-green-600">{r.bmi}</span></p>
                  {r.note && <p className="text-sm text-gray-500 mt-1">💬 메모: {r.note}</p>}
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-red-500 border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          💡 오늘의 건강 팁: 물을 충분히 마시고, 30분 이상 가볍게 움직여보세요!
        </div>
      </div>
    </main>
  )
}