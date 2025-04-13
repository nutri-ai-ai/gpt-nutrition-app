'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DebugPage() {
  const router = useRouter()
  const [storage, setStorage] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          data[key] = localStorage.getItem(key) || ''
        }
      }
      setStorage(data)
      setLoading(false)
    }
  }, [])

  const clearStorage = () => {
    localStorage.clear()
    setStorage({})
  }

  const setItem = (key: string, value: string) => {
    localStorage.setItem(key, value)
    setStorage(prev => ({...prev, [key]: value}))
  }

  const removeItem = (key: string) => {
    localStorage.removeItem(key)
    const newStorage = {...storage}
    delete newStorage[key]
    setStorage(newStorage)
  }

  const fixSession = () => {
    const now = Date.now()
    localStorage.setItem('last_active_time', now.toString())
    localStorage.setItem('email_verified', 'true')
    
    const newStorage = {...storage}
    newStorage['last_active_time'] = now.toString()
    newStorage['email_verified'] = 'true'
    setStorage(newStorage)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">세션 디버깅 페이지</h1>
      
      <div className="mb-6 space-x-2">
        <button 
          onClick={clearStorage}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          모든 세션 데이터 삭제
        </button>
        
        <button 
          onClick={fixSession}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          세션 데이터 복구
        </button>
        
        <button 
          onClick={() => router.push('/signup-v2/email')}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          이메일 페이지로 이동
        </button>
        
        <button 
          onClick={() => router.push('/signup-v2/intro')}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          인트로 페이지로 이동
        </button>
        
        <button 
          onClick={() => router.push('/signup-v2/survey')}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          설문 페이지로 이동
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">로컬 스토리지 데이터</h2>
        
        {Object.keys(storage).length === 0 ? (
          <p className="text-gray-500">저장된 데이터가 없습니다</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(storage).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2 border-b pb-2">
                <div className="flex-grow">
                  <div className="font-medium">{key}</div>
                  <div className="text-sm text-gray-500 break-all">{value}</div>
                </div>
                <div className="flex space-x-2">
                  {key === 'email_verified' && (
                    <>
                      <button 
                        onClick={() => setItem(key, 'true')}
                        className="bg-green-100 text-green-800 px-2 py-1 text-xs rounded"
                      >
                        true로 설정
                      </button>
                      <button 
                        onClick={() => setItem(key, 'false')}
                        className="bg-red-100 text-red-800 px-2 py-1 text-xs rounded"
                      >
                        false로 설정
                      </button>
                    </>
                  )}
                  {key === 'last_active_time' && (
                    <button 
                      onClick={() => setItem(key, Date.now().toString())}
                      className="bg-blue-100 text-blue-800 px-2 py-1 text-xs rounded"
                    >
                      지금으로 갱신
                    </button>
                  )}
                  <button 
                    onClick={() => removeItem(key)}
                    className="bg-red-100 text-red-800 px-2 py-1 text-xs rounded"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
} 