import { useAuth } from '@/context/auth-context';
import Link from 'next/link';

export default function Header() {
  // 헤더 컴포넌트 내에 로그아웃 함수 추가
  const { user, signOut } = useAuth();

  // 로그아웃 처리 함수
  const handleLogout = async () => {
    try {
      await signOut();
      // 로그아웃 후 홈페이지로 이동
      window.location.href = '/';
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="logo">
          <Link href="/" className="text-xl font-bold text-blue-600">
            Nutri AI
          </Link>
        </div>
        
        {/* 인증 상태에 따른 버튼 출력 */}
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700 hidden md:block">
              {user.username || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              로그인
            </Link>
            <Link
              href="/signup-v2"
              className="text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
            >
              회원가입
            </Link>
          </div>
        )}
      </div>
    </header>
  );
} 