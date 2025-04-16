import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type RouteType = string | RegExp;

// 보호된 경로 목록
const protectedRoutes: RouteType[] = [
  '/dashboard',
  '/chat',
  '/membership-info',
  '/nutrition-details',
  '/health-records',
  '/health-mindmap',
  '/view-health-records'
];

// 인증 없이 접근할 수 있는 경로
const publicRoutes: RouteType[] = [
  '/',
  '/login',
  '/signup-v2',
  '/signup-v2/email',
  '/signup-v2/intro',
  '/signup-v2/survey',
  '/signup-v2/account',
  '/forgot-password'
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 쿠키에서 인증 토큰 확인
  const authToken = request.cookies.get('auth_token')?.value;
  const signupInProgress = request.cookies.get('signup_in_progress')?.value;
  const pathname = request.nextUrl.pathname;

  console.log(`[미들웨어] 경로: ${pathname}, 인증토큰: ${authToken ? '있음' : '없음'}, 회원가입진행: ${signupInProgress}`);

  // API 요청은 무시
  if (pathname.startsWith('/api')) {
    return response;
  }

  // 보호된 경로 확인
  const isProtectedRoute = protectedRoutes.some(route => {
    if (typeof route === 'string') {
      return pathname === route || pathname.startsWith(route + '/');
    }
    return route instanceof RegExp && route.test(pathname);
  });

  // 공개 경로 확인
  const isPublicRoute = publicRoutes.some(route => {
    if (typeof route === 'string') {
      return pathname === route || pathname.startsWith(route + '/');
    }
    return route instanceof RegExp && route.test(pathname);
  });

  // 이메일 확인 페이지인지 확인
  const isEmailVerificationPage = pathname === '/signup-v2/email' || pathname.startsWith('/signup-v2/email/');

  // 인증 토큰이 없고 보호된 경로에 접근 시도
  if (!authToken && isProtectedRoute) {
    // 로그인 페이지로 리다이렉트
    console.log('로그인 페이지로 리다이렉트: 인증 토큰 없음');
    const redirect = NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
    return redirect;
  }

  // 인증 토큰이 있고 공개 경로에 접근 시도
  if (authToken && isPublicRoute) {
    // 회원가입 진행 중이면 회원가입 페이지 접근 허용
    if (signupInProgress === 'true' && pathname.startsWith('/signup-v2')) {
      console.log('회원가입 진행 중: 회원가입 페이지 접근 허용');
      return response;
    }

    // 인증 토큰이 있고 이메일 확인 페이지에 접근하는 경우, 회원가입 진행 중이 아니면 대시보드로 리다이렉트
    if (isEmailVerificationPage && signupInProgress !== 'true') {
      console.log('이메일 확인 페이지 접근 시도, 이미 인증됨: 대시보드로 리다이렉트');
      const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
      return redirect;
    }

    // 그 외의 경우 대시보드로 리다이렉트
    console.log('대시보드로 리다이렉트: 이미 인증됨');
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    return redirect;
  }

  // 혹시 사용자가 만료된 세션으로 접근하는 경우 (auth 토큰은 있지만 실제로는 만료됨)
  // Firebase getIdTokenResult() 같은 메서드를 사용하는 것이 이상적이지만 미들웨어에서 복잡한 검증은 어려움
  // 실제 앱 페이지에서 인증 상태를 다시 확인하게 됨

  return response;
}

export const config = {
  matcher: [
    /*
     * 미들웨어가 필요한 경로 목록
     * 주의: 모든 API 경로와 정적 파일 경로는 제외해야 함
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|logo-animation.svg|.*\\.png$).*)',
  ],
}; 