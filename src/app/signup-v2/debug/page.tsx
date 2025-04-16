'use client'

import { useState, useEffect } from 'react'
import { db } from '@/firebase/config'
import { collection, getDocs, query, limit, where } from 'firebase/firestore'
import { useAuth } from '@/context/auth-context'

export default function DebugPage() {
  const [storage, setStorage] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginResult, setLoginResult] = useState<any>(null)
  const [loginError, setLoginError] = useState('')
  
  const { signIn } = useAuth()

  useEffect(() => {
    const allStorage: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        allStorage[key] = localStorage.getItem(key) || ''
      }
    }
    setStorage(allStorage)
  }, [])

  // 세션 리셋 핸들러
  const handleResetSession = () => {
    localStorage.removeItem('tempId')
    localStorage.removeItem('last_active_time')
    localStorage.setItem('email_verified', 'true')
    
    const newStorage: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        newStorage[key] = localStorage.getItem(key) || ''
      }
    }
    
    setStorage(newStorage)
  }
  
  // 모든 사용자 조회 핸들러
  const fetchAllUsers = async () => {
    setLoading(true)
    try {
      if (!db) {
        console.error('Firestore가 초기화되지 않았습니다')
        return
      }
      const usersRef = collection(db, 'users')
      const q = query(usersRef, limit(10))
      const querySnapshot = await getDocs(q)
      
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setUsers(usersData)
    } catch (error) {
      console.error('사용자 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // 특정 사용자 검색 핸들러
  const searchUser = async () => {
    if (!username.trim()) return
    
    setLoading(true)
    try {
      if (!db) {
        console.error('Firestore가 초기화되지 않았습니다')
        return
      }
      // username으로 검색
      const usersRef = collection(db, 'users')
      const usernameQuery = query(usersRef, where('username', '==', username.trim()))
      let querySnapshot = await getDocs(usernameQuery)
      
      // 결과가 없으면 name으로 검색
      if (querySnapshot.empty) {
        const nameQuery = query(usersRef, where('name', '==', username.trim()))
        querySnapshot = await getDocs(nameQuery)
      }
      
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setUsers(usersData)
    } catch (error) {
      console.error('사용자 검색 오류:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // 로그인 테스트 핸들러
  const testLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setLoginError('아이디와 비밀번호를 모두 입력하세요')
      return
    }
    
    setLoginError('')
    setLoginResult(null)
    setLoading(true)
    
    try {
      const result = await signIn(username.trim(), password)
      setLoginResult({
        success: true,
        user: {
          uid: result.uid,
          email: result.email,
          displayName: result.displayName
        }
      })
    } catch (error: any) {
      console.error('로그인 테스트 실패:', error)
      setLoginError(error.message || '로그인 실패')
      setLoginResult({
        success: false,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">디버그 페이지</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">로컬 스토리지</h2>
        <div className="bg-gray-100 p-4 rounded mb-2">
          {Object.entries(storage).map(([key, value]) => (
            <div key={key} className="mb-1">
              <strong>{key}: </strong>
              {key === 'email_verified' && (
                <span className={value === 'true' ? 'text-green-600' : 'text-red-600'}>
                  {value}
                </span>
              )} 
              {key !== 'email_verified' && <span>{value}</span>}
            </div>
          ))}
        </div>
        <button
          onClick={handleResetSession}
          className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          세션 리셋
        </button>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">로그인 테스트</h2>
        <div className="bg-gray-100 p-4 rounded mb-4">
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-medium">아이디</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="아이디 입력"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="비밀번호 입력"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={testLogin}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? '처리 중...' : '로그인 테스트'}
            </button>
            <button
              onClick={searchUser}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              disabled={loading || !username.trim()}
            >
              사용자 검색
            </button>
          </div>
          
          {loginError && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
              {loginError}
            </div>
          )}
          
          {loginResult && (
            <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded">
              <div className="font-semibold">
                {loginResult.success ? '로그인 성공!' : '로그인 실패'}
              </div>
              <pre className="text-xs mt-2 overflow-auto">
                {JSON.stringify(loginResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">사용자 데이터</h2>
        <button
          onClick={fetchAllUsers}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
          disabled={loading}
        >
          {loading ? '로딩 중...' : '사용자 목록 조회'}
        </button>
        
        {users.length > 0 ? (
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-500">{user.id}</td>
                    <td className="px-4 py-2 text-sm">{user.username || '-'}</td>
                    <td className="px-4 py-2 text-sm">{user.name || '-'}</td>
                    <td className="px-4 py-2 text-sm">{user.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500">사용자 데이터가 없습니다.</div>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <button
          onClick={() => window.location.href = '/signup-v2/email'}
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          이메일 페이지
        </button>
        <button
          onClick={() => window.location.href = '/signup-v2/intro'}
          className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          인트로 페이지
        </button>
        <button
          onClick={() => window.location.href = '/signup-v2/survey'}
          className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          설문 페이지
        </button>
        <button
          onClick={() => window.location.href = '/signup-v2/account'}
          className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          계정 페이지
        </button>
        <button
          onClick={() => window.location.href = '/login'}
          className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          로그인 페이지
        </button>
      </div>
    </div>
  )
} 