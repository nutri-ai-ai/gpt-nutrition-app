// 건강마인드맵 말풍선 시각화 UI - Firestore 연동
'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

const getSizeClass = (count: number) => {
  if (count >= 10) return 'text-4xl'
  if (count >= 5) return 'text-2xl'
  return 'text-sm'
}

const getRandomPosition = () => {
  const top = Math.floor(Math.random() * 70 + 10) // 10% ~ 80%
  const left = Math.floor(Math.random() * 70 + 10)
  return { top, left }
}

export default function HealthMindmapPage() {
  const router = useRouter()
  const [keywords, setKeywords] = useState<{ [key: string]: number }>({})
  const [positions, setPositions] = useState<{ [key: string]: { top: number; left: number } }>({})

  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (!storedUsername) {
      router.push('/login')
      return
    }

    const fetchMindmap = async () => {
      const userRef = doc(db, 'users', storedUsername)
      const snapshot = await getDoc(userRef)
      if (snapshot.exists()) {
        const data = snapshot.data()
        const map = data.mindmapKeywords || {}
        setKeywords(map)

        const generatedPositions: any = {}
        Object.keys(map).forEach((key) => {
          generatedPositions[key] = getRandomPosition()
        })
        setPositions(generatedPositions)
      }
    }

    fetchMindmap()
  }, [router])

  return (
    <main className="relative w-full min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 overflow-hidden">
      <h1 className="text-center text-xl font-semibold pt-6 text-blue-700">🧠 건강 마인드맵</h1>

      {Object.entries(keywords).map(([keyword, count]) => {
        const pos = positions[keyword] || { top: 50, left: 50 }
        return (
          <div
            key={keyword}
            style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            className={`absolute px-4 py-2 rounded-full shadow bg-white border border-gray-200 text-gray-800 ${getSizeClass(count)} hover:scale-105 transition whitespace-nowrap`}
          >
            {keyword}
          </div>
        )
      })}
    </main>
  )
}
