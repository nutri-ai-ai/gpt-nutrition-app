'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/context/auth-context'
import Link from 'next/link'
import { doc, getDoc } from 'firebase/firestore'
import { db } from "@/lib/firebase"  

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이메일 변경 핸들러
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
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
    
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 모두 입력해주세요');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Firebase Authentication으로 로그인
      await signIn(email.trim(), password);
      
      // 대시보드로 이동
      router.push('/dashboard');
    } catch (error) {
      console.error('로그인 오류:', error);
      // error는 unknown 타입이므로 타입 안전하게 처리
      let errorMessage = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
      if (error instanceof Error) {
        if (error.message.includes('user-not-found')) {
          errorMessage = '등록되지 않은 이메일입니다.';
        } else if (error.message.includes('wrong-password')) {
          errorMessage = '비밀번호가 일치하지 않습니다.';
        } else if (error.message.includes('too-many-requests')) {
          errorMessage = '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.message.includes('invalid-email')) {
          errorMessage = '유효하지 않은 이메일 형식입니다.';
        } else {
          errorMessage = error.message || errorMessage;
        }
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <input
                id="email"
                type="email"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={handleEmailChange}
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
