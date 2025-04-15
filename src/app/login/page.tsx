'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/context/auth-context'
import Link from 'next/link'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, getFirestore, query, where, collection, getDocs } from 'firebase/firestore'
import { db } from "@/lib/firebase"  

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 아이디 변경 핸들러
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setError(null);
  };

  // 비밀번호 변경 핸들러
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  };

  // 로그인 처리 핸들러
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 모두 입력해주세요');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 1. Firebase에서 사용자 정보 확인
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username.trim()));
      const querySnapshot = await getDocs(q);

      // 사용자가 존재하지 않는 경우
      if (querySnapshot.empty) {
        throw new Error('존재하지 않는 아이디입니다');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // 2. 비밀번호 확인 (Firebase에 저장된 plaintext 비밀번호와 비교)
      if (userData.password !== password) {
        throw new Error('비밀번호가 일치하지 않습니다');
      }

      // 3. 로그인 상태 업데이트
      await updateDoc(doc(db, 'users', userId), {
        lastLoginAt: serverTimestamp(),
      });
      console.log('로그인 시간 업데이트 완료');
      
      // 4. Auth Context의 signIn 메서드 호출
      await signIn(username.trim(), password);
      
      // 5. 사용자 정보를 로컬 스토리지에 저장 (chat 페이지 호환을 위해)
      try {
        // username은 사용자 식별용
        localStorage.setItem('username', username.trim());
        // docId는 Firestore 문서 ID (기존 uid와 구분)
        localStorage.setItem('docId', userId);
        // 이전 코드와의 호환성을 위해 uid도 저장
        localStorage.setItem('uid', userId);
        
        // 프로필 정보 로컬 스토리지에 저장
        if (userData.gender) localStorage.setItem('gender', userData.gender);
        if (userData.height) localStorage.setItem('height', userData.height.toString());
        if (userData.weight) localStorage.setItem('weight', userData.weight.toString());
        if (userData.birthDate) localStorage.setItem('birthDate', userData.birthDate);
        if (userData.name) localStorage.setItem('name', userData.name);
        
        console.log('로그인 성공! 사용자:', username.trim(), '/ 문서 ID:', userId);
        console.log('모든 사용자 정보 로컬 스토리지에 저장됨');
      } catch (storageError) {
        console.error('로컬 스토리지 저장 실패:', storageError);
        // 로컬 스토리지 오류는 치명적이지 않으므로 계속 진행
      }
      
      // 6. 대시보드로 리다이렉트
      router.push('/dashboard');
    } catch (error) {
      console.error('로그인 오류:', error);
      // error는 unknown 타입이므로 타입 안전하게 처리
      let errorMessage = '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white">
      {/* 로고 */}
      <div className="relative w-16 h-16 mb-8">
        <Image
          src="/logo-animation.svg"
          alt="Nutri AI Logo"
          width={64}
          height={64}
          className={loading ? "animate-spin-slow" : ""}
        />
      </div>
      
      <div className="w-full max-w-md">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h1 className="text-xl font-semibold text-center mb-6">
            로그인
          </h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-lg">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                아이디
              </label>
              <input
                id="username"
                type="text"
                placeholder="아이디를 입력하세요"
                value={username}
                onChange={handleUsernameChange}
                disabled={loading}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  비밀번호
                </label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-500 hidden">
                  비밀번호 찾기
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={handlePasswordChange}
                disabled={loading}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg text-white font-medium text-sm transition-colors ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <Link href="/signup-v2" className="text-blue-600 hover:text-blue-500 font-medium">
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
