'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, updateDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '@/firebase/config'
import { 
  sendEmailVerification, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  fetchSignInMethodsForEmail,
  deleteUser 
} from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { v4 as uuidv4 } from 'uuid'
import { functions } from '@/firebase/config'

// 자주 사용하는 이메일 도메인 목록
const EMAIL_DOMAINS = [
  'naver.com',
  'gmail.com',
  'daum.net',
  'hanmail.net',
  'nate.com',
  'kakao.com',
  '직접입력'
]

export default function EmailVerificationPage() {
  const router = useRouter()
  // 컴포넌트 마운트 상태를 추적하는 ref
  const isMountedRef = useRef(true)
  const [emailLocal, setEmailLocal] = useState('')
  const [selectedDomain, setSelectedDomain] = useState(EMAIL_DOMAINS[0])
  const [customDomain, setCustomDomain] = useState('')
  const [isCustomDomain, setIsCustomDomain] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [isCheckingVerification, setIsCheckingVerification] = useState(false)
  const [error, setError] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [currentEmail, setCurrentEmail] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationTimer, setVerificationTimer] = useState(0)
  const [tempUserId, setTempUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const [resendEnabled, setResendEnabled] = useState(false)
  const [expiryTimeInMinutes, setExpiryTimeInMinutes] = useState(0)
  const [verificationCheckInProgress, setVerificationCheckInProgress] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [email, setEmail] = useState('')
  const [emailErrorMessage, setErrorMessage] = useState('')
  
  // 카운트다운 타이머 함수
  const startCountdown = (seconds: number) => {
    let remainingTime = seconds;
    const countdownInterval = setInterval(() => {
      remainingTime -= 1;
      setVerificationTimer(remainingTime);
      
      if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        setResendEnabled(true);
      }
    }, 1000);
  };
  
  // 이메일로 로그인 또는 회원가입 시도
  const loginOrSignUp = async () => {
    if (!emailLocal || !selectedDomain) return;
    
    const fullEmail = `${emailLocal}@${selectedDomain}`;
    try {
      setIsSubmitting(true);
      const success = await sendVerificationEmail(fullEmail);
      if (success) {
        setVerificationSent(true);
        setCurrentEmail(fullEmail);
      }
    } catch (error) {
      console.error('로그인/회원가입 시도 중 오류:', error);
      setError('인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 인증 이메일 재발송 처리
  const handleResendVerification = async () => {
    if (!currentEmail) {
      setError('이메일 정보가 없습니다. 다시 시작해주세요.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      // Firebase 로그아웃 후 재인증 시도
      if (auth) {
        await signOut(auth);
      }
      
      const success = await sendVerificationEmail(currentEmail);
      if (success) {
        setError('');
        setVerificationTimer(180);
        startCountdown(180);
      }
    } catch (error) {
      console.error('인증 메일 재발송 오류:', error);
      setError('인증 메일 재발송 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    // 컴포넌트 마운트시 설정
    isMountedRef.current = true
    
    // 클린업 함수에서 마운트 해제 처리
    return () => {
      isMountedRef.current = false
    }
  }, [])
  
  // 로컬 스토리지에서 인증 상태 확인
  useEffect(() => {
    // 페이지 로드 시 회원가입 진행 중임을 나타내는 쿠키 설정
    document.cookie = 'signup_in_progress=true; path=/; max-age=10800; SameSite=Lax';
    
    const verificationStatus = localStorage.getItem('email_verification_sent')
    const storedEmail = localStorage.getItem('email')
    const storedTempPw = localStorage.getItem('temp_password')
    
    if (verificationStatus === 'true' && storedEmail) {
      setVerificationSent(true)
      setCurrentEmail(storedEmail)
      if (storedTempPw) {
        setTempPassword(storedTempPw)
      }
    }
    
    // 세션이 있는지 확인
    const tempId = localStorage.getItem('tempId')
    const lastActiveTime = localStorage.getItem('last_active_time')
    const emailVerified = localStorage.getItem('email_verified')
    
    if (tempId && lastActiveTime && emailVerified === 'true') {
      // 30분 이내인지 확인
      const lastActive = parseInt(lastActiveTime)
      const now = Date.now()
      const diffMinutes = (now - lastActive) / (1000 * 60)
      
      if (diffMinutes <= 30) {
        // 1. 인증이 완료되고 세션이 유효하면 회원가입 진행 중 쿠키 먼저 설정
        document.cookie = 'signup_in_progress=true; path=/; max-age=10800; SameSite=Lax';
        
        // 2. 인증 토큰이 있으면 유지하고, 없으면 null 토큰 설정 방지
        if (auth && auth.currentUser) {
          auth.currentUser.getIdToken(true).then(idToken => {
            document.cookie = `auth_token=${idToken}; path=/; max-age=${50 * 60}; SameSite=Lax`;
            // 인증 토큰 설정 후 회원가입 진행 중 쿠키 재설정
            document.cookie = 'signup_in_progress=true; path=/; max-age=10800; SameSite=Lax';
            
            console.log('이미 인증된 세션 발견, 인트로 페이지로 이동 중...');
            // 인트로 페이지로 리다이렉트 - 지연 추가
            setTimeout(() => {
              router.push('/signup-v2/intro')
            }, 3000); // 3초 지연으로 증가
          });
        } else {
          console.log('이미 인증된 세션 발견, 인트로 페이지로 이동 중...');
          // 인트로 페이지로 리다이렉트 - 지연 추가
          setTimeout(() => {
            router.push('/signup-v2/intro')
          }, 3000); // 3초 지연으로 증가
        }
        return
      }
    }
    
    // 초기화 완료
    setIsInitialized(true)
  }, [router])
  
  // 도메인 선택 처리
  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSelectedDomain(value)
    setIsCustomDomain(value === '직접입력')
    setError('')
  }
  
  // 커스텀 도메인 입력 처리
  const handleCustomDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDomain(e.target.value)
    setError('')
  }
  
  // 이메일 로컬 부분 입력 처리
  const handleEmailLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailLocal(e.target.value)
    setError('')
  }

  // 이메일 중복 확인
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      // Firebase가 초기화되었는지 확인
      if (!auth || !db) {
        console.error('Firebase가 초기화되지 않았습니다');
        return true; // 확인 불가능하면 안전을 위해 true 반환
      }
      
      // 1. Firebase Auth에서 이메일 확인
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length > 0) {
        console.log('Firebase 인증에 이미 존재하는 이메일:', email);
        return true;
      }
      
      // 2. Firestore에서 이메일 중복 확인
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log('Firestore에 이미 존재하는 이메일:', email);
        return true;
      }
      
      return false; // 모든 검사를 통과하면 중복 없음
    } catch (error) {
      console.error('이메일 확인 오류:', error);
      // 오류 발생 시 안전을 위해 true 반환 (중복으로 간주)
      return true;
    }
  };

  // sendVerificationEmail 함수 구현
  const sendVerificationEmail = async (email: string): Promise<boolean> => {
    try {
      setEmailSending(true);
      setErrorMessage('');
      
      // Firebase Auth 초기화 확인
      if (!auth) {
        setErrorMessage('인증 시스템 초기화 오류가 발생했습니다.');
        return false;
      }
      
      // 이메일 형식 검사
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setErrorMessage('유효한 이메일 형식이 아닙니다');
        return false;
      }
      
      // 이메일 중복 확인 - 명시적 처리
      console.log('이메일 중복 확인 시작:', email);
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        console.log('이메일 중복 확인 결과: 중복됨');
        setErrorMessage('이미 사용 중인 이메일입니다. 다른 이메일을 사용해주세요.');
        return false;
      }
      console.log('이메일 중복 확인 결과: 사용 가능');
      
      // signup_name 가져오기
      const name = localStorage.getItem('signup_name') || '사용자';
      
      // 임시 비밀번호 생성
      const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      setTempPassword(randomPassword);
      
      try {
        // 임시 계정 생성 (가입 완료 전까지 사용)
        const tempCredential = await createUserWithEmailAndPassword(auth, email, randomPassword);
        const tempUser = tempCredential.user;
        
        // 이메일 인증 발송
        await sendEmailVerification(tempUser);
        
        // Firestore 초기화 확인
        if (!db) {
          setErrorMessage('데이터베이스 초기화 오류가 발생했습니다.');
          return false;
        }
        
        // Firestore에 임시 사용자 정보 저장
        await setDoc(doc(collection(db, 'users'), tempUser.uid), {
          email: email,
          name: name,
          tempUid: tempUser.uid, // 임시 Firebase UID 저장
          createdAt: serverTimestamp(),
          status: 'pending'
        });
        
        // 세션 관리용 로컬 스토리지 업데이트
        localStorage.setItem('tempId', tempUser.uid);
        localStorage.setItem('last_active_time', Date.now().toString());
        localStorage.setItem('email_sent_time', Date.now().toString());
        localStorage.setItem('email', email);
        localStorage.setItem('temp_password', randomPassword);
        localStorage.setItem('email_verification_sent', 'true');
        localStorage.setItem('email_verified', 'false');
        
        setVerificationSent(true);
        setCurrentEmail(email);
        
        // 3분 타이머 시작
        startCountdown(180);
        
        // 주기적으로 인증 상태 확인 (10초마다)
        const intervalId = setInterval(() => {
          if (isMountedRef.current) {
            checkVerificationStatus();
          } else {
            clearInterval(intervalId); // 컴포넌트 언마운트 시 인터벌 정리
          }
        }, 10000);
        
        return true;
      } catch (authError: any) {
        console.error('Firebase 인증 오류:', authError);
        
        // Firebase 인증 관련 오류 처리
        if (authError.code === 'auth/email-already-in-use') {
          setErrorMessage('이미 사용 중인 이메일입니다. 다른 이메일을 사용하거나 로그인해주세요.');
        } else {
          setErrorMessage(`인증 처리 중 오류가 발생했습니다: ${authError.message || '알 수 없는 오류'}`);
        }
        return false;
      }
    } catch (error: any) {
      console.error('이메일 인증 발송 오류:', error);
      
      // 오류 메시지 처리
      let errorMessage = '이메일 인증 발송 중 오류가 발생했습니다.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다. 다른 이메일을 사용하거나 로그인해주세요.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '유효하지 않은 이메일 형식입니다.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = '이메일/비밀번호 인증이 비활성화되어 있습니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다.';
      }
      
      setErrorMessage(errorMessage);
      return false;
    } finally {
      if (isMountedRef.current) {
        setEmailSending(false);
      }
    }
  };
  
  // 인증 성공 시 화면 렌더링
  const renderVerificationSuccess = () => {
    return (
      <div className="p-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">이메일 인증 완료!</h3>
        <p className="text-gray-600 mb-6">
          인증이 성공적으로 완료되었습니다. 곧 다음 단계로 자동 이동합니다.
        </p>
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  };

  // 인증 성공 시 처리 함수
  const handleVerificationSuccess = async () => {
    try {
      // 중복 실행 방지
      if (sessionStorage.getItem('verification_success_handled') === 'true') {
        console.log('이미 인증 성공 처리가 진행 중입니다');
        return;
      }
      
      // 인증 성공 처리 진행 중 표시
      sessionStorage.setItem('verification_success_handled', 'true');
      sessionStorage.setItem('redirect_in_progress', 'true');
      
      console.log('인증 성공 처리 시작');
      // 로컬 스토리지에 상태 저장
      localStorage.setItem('email_verified', 'true');
      
      // 현재 사용자 정보를 세션 스토리지에 저장 (페이지 새로고침에도 유지)
      if (auth && auth.currentUser) {
        sessionStorage.setItem('verified_email', auth.currentUser.email || '');
        sessionStorage.setItem('verification_completed', 'true');
      }
      
      // 인증 성공 상태 설정
      setVerified(true);
      setError('');
      
      // 필요한 쿠키 설정
      document.cookie = "signup_step=intro; path=/; max-age=3600";
      document.cookie = "signup_in_progress=true; path=/; max-age=3600";
      
      console.log('인증 완료 확인 - 인트로 페이지로 이동합니다');
      
      // 리디렉션 지연 시간을 0.5초로 단축
      try {
        setTimeout(() => {
          try {
            // 메인 리디렉션 시도
            console.log('인트로 페이지로 리디렉션 시작');
            window.location.href = '/signup-v2/intro';
          } catch (error) {
            console.error('리디렉션 시도 실패, 백업 방법 시도:', error);
            
            // 백업 리디렉션
            setTimeout(() => {
              try {
                router.push('/signup-v2/intro');
              } catch (routerError) {
                console.error('라우터 이동 실패:', routerError);
                // 최종 백업으로 링크 클릭 시뮬레이션
                const link = document.createElement('a');
                link.href = '/signup-v2/intro';
                link.click();
              }
            }, 500);
          }
        }, 500);
      } catch (error) {
        console.error('리디렉션 처리 중 오류:', error);
        setError('다음 페이지로 이동하는 데 문제가 발생했습니다. 직접 이동해주세요.');
      }
    } catch (err) {
      console.error('인증 성공 처리 중 오류:', err);
      setError('인증 성공 처리 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.');
      // 오류 발생 시 재시도할 수 있도록 플래그 초기화
      sessionStorage.removeItem('verification_success_handled');
      sessionStorage.removeItem('redirect_in_progress');
    }
  };

  // 이메일 인증 완료 확인 함수
  const checkVerificationStatus = async () => {
    console.log('이메일 인증 상태 확인 시작');
    
    // 이미 확인 중인 경우 중복 실행 방지
    if (isCheckingVerification) {
      console.log('이미 인증 확인 중입니다');
      return;
    }
    
    setIsCheckingVerification(true);
    setError('');
    
    // 진행 상태 기록
    sessionStorage.setItem('verification_check_started', 'true');
    
    try {
      // Firebase 초기화 확인
      if (!auth) {
        console.error('Firebase auth가 초기화되지 않았습니다');
        setError('인증 시스템이 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
        setIsCheckingVerification(false);
        return;
      }
      
      // 현재 로그인된 사용자가 있는지 확인
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        console.log('현재 로그인된 사용자 발견:', currentUser.email);
        sessionStorage.setItem('current_user_email', currentUser.email || '');
        
        // 사용자 정보 새로고침
        await currentUser.reload();
        
        // 이메일 인증 확인
        if (currentUser.emailVerified) {
          console.log('이메일이 인증되었습니다!');
          // 인증 성공 처리
          handleVerificationSuccess();
        } else {
          console.log('이메일이 아직 인증되지 않았습니다');
          setError('이메일이 아직 인증되지 않았습니다. 이메일의 인증 링크를 클릭한 후 다시 시도해주세요.');
        }
      } else {
        // 로그인된 사용자가 없는 경우, 임시 비밀번호로 로그인 시도
        console.log('로그인된 사용자가 없습니다. 재로그인 시도');
        
        if (!currentEmail || !tempPassword) {
          console.error('이메일 또는 임시 비밀번호가 없습니다');
          setError('인증 정보가 없습니다. 처음부터 다시 시작해주세요.');
          setIsCheckingVerification(false);
          return;
        }
        
        try {
          // 임시 비밀번호로 로그인
          const userCredential = await signInWithEmailAndPassword(auth, currentEmail, tempPassword);
          console.log('임시 비밀번호로 로그인 성공');
          
          // 사용자 정보 새로고침
          await userCredential.user.reload();
          
          // 이메일 인증 확인
          if (userCredential.user.emailVerified) {
            console.log('로그인 후 이메일 인증 확인됨!');
            // 인증 성공 처리
            handleVerificationSuccess();
          } else {
            console.log('로그인 후에도 이메일이 인증되지 않았습니다');
            setError('이메일이 아직 인증되지 않았습니다. 이메일의 인증 링크를 클릭한 후 다시 시도해주세요.');
          }
        } catch (loginErr) {
          console.error('로그인 시도 중 오류:', loginErr);
          setError('인증 확인 중 오류가 발생했습니다. 인증 메일을 재발송하거나 페이지를 새로고침해주세요.');
        }
      }
    } catch (err) {
      console.error('인증 상태 확인 중 오류:', err);
      setError('인증 상태 확인 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
    } finally {
      setIsCheckingVerification(false);
    }
  };
  
  // 이메일 인증 처리
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 유효성 검사
    if (!emailLocal.trim()) {
      setError('이메일 아이디를 입력해주세요')
      return
    }
    
    // 이메일 도메인 결정
    let domain = selectedDomain
    if (isCustomDomain) {
      if (!customDomain.trim()) {
        setError('이메일 도메인을 입력해주세요')
        return
      }
      domain = customDomain.trim()
    }
    
    // 이메일 조합
    const fullEmail = `${emailLocal.trim()}@${domain}`;
    setEmail(fullEmail);
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // 이메일 형식 검사
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(fullEmail)) {
        setError('유효한 이메일 형식이 아닙니다');
        return;
      }
      
      // 이메일 중복 확인 - 추가 확인
      console.log('이메일 중복 확인 시작:', fullEmail);
      try {
        // 1. Firebase Auth에서 이메일 확인
        if (auth) {
          const signInMethods = await fetchSignInMethodsForEmail(auth, fullEmail);
          if (signInMethods.length > 0) {
            console.log('이미 사용 중인 이메일입니다 (Firebase Auth)');
            setError('이미 사용 중인 이메일입니다. 다른 이메일을 사용하거나 로그인해주세요.');
            return;
          }
        }
        
        // 2. Firestore에서 이메일 중복 확인
        if (db) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', fullEmail));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            console.log('이미 사용 중인 이메일입니다 (Firestore)');
            setError('이미 사용 중인 이메일입니다. 다른 이메일을 사용하거나 로그인해주세요.');
            return;
          }
        }
      } catch (checkError) {
        console.error('이메일 확인 중 오류 발생:', checkError);
        // 오류 발생 시 진행하지 않음
        setError('이메일 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }
      
      console.log('이메일 인증 프로세스 시작:', fullEmail);
      
      // 이메일 인증 발송
      const success = await sendVerificationEmail(fullEmail);
      if (success) {
        console.log('이메일 인증 발송 성공');
        setEmailSent(true);
        setShowVerification(true);
      }
    } catch (error: any) {
      console.error('이메일 인증 요청 오류:', error);
      let errorMessage = '이메일 인증 요청 중 오류가 발생했습니다.';
      
      // Firebase 에러 코드에 따른 메시지 처리
      if (error.code) {
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = '이미 사용 중인 이메일입니다. 다른 이메일을 사용하거나 로그인해주세요.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = '유효하지 않은 이메일 형식입니다.';
        } else if (error.code.includes('auth/')) {
          errorMessage = `인증 오류: ${error.message || error.code}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 이메일 인증 프로세스 재시작
  const restartVerification = async () => {
    try {
      console.log('인증 과정 재시작...');
      // Firebase가 초기화되었는지 확인
      if (!auth) {
        console.error('Firebase 인증이 초기화되지 않았습니다');
        setError('인증 시스템을 초기화할 수 없습니다. 나중에 다시 시도해주세요.');
        return;
      }
      
      // 기존 사용자가 로그인 되어 있으면 로그아웃
      if (auth && auth.currentUser) {
        await signOut(auth);
      }
      
      // 로컬 스토리지에서 사용자 정보 삭제 (새로운 정보로 갱신하기 위함)
      localStorage.removeItem('email_verification_sent');
      localStorage.removeItem('email');
      localStorage.removeItem('temp_password');
      localStorage.removeItem('email_verified');
      localStorage.removeItem('tempId');
      localStorage.removeItem('firebaseAuthUid');
      localStorage.removeItem('redirecting_to_intro');
      localStorage.removeItem('intro_redirecting');
      
      // 상태 초기화
      setEmailSent(false);
      setShowVerification(false);
      setVerificationSent(false);
      setCurrentEmail('');
      setTempPassword('');
      setError('');
      
      console.log('인증 과정이 재시작됐습니다.');
    } catch (error) {
      console.error('인증 재시작 오류:', error);
      setError('인증 재시작 중 오류가 발생했습니다.');
    }
  };
  
  // 컴포넌트 초기화
  useEffect(() => {
    // 이미 리디렉션 중이면 중복 실행 방지
    if (sessionStorage.getItem('redirect_in_progress') === 'true') {
      console.log('이미 리디렉션 중입니다');
      return;
    }

    // URL에서 이메일 파라미터 가져오기
    const searchParams = new URLSearchParams(window.location.search);
    const emailParam = searchParams.get('email');

    // 인증된 사용자인지 확인하는 함수
    const checkIfAlreadyVerified = async () => {
      try {
        if (auth && auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            console.log('사용자가 이미 인증되어 있음');
            handleVerificationSuccess();
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error('인증 상태 확인 중 오류:', error);
        return false;
      }
    };

    // 초기화 함수
    const initialize = async () => {
      setLoading(true);
      
      try {
        // 이미 인증된 사용자인지 확인
        const isVerified = await checkIfAlreadyVerified();
        if (isVerified) {
          setLoading(false);
          return;
        }

        // URL에서 이메일 파라미터가 있으면 설정
        if (emailParam) {
          const [localPart, domain] = emailParam.split('@');
          if (localPart && domain) {
            setEmailLocal(localPart);
            setSelectedDomain(domain);
            
            // 로그인 시도 
            await loginOrSignUp();
          }
        }
      } catch (err) {
        console.error('초기화 중 오류:', err);
        setError('시스템 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    };

    initialize();

    // 이메일 인증 상태 주기적 확인
    let verificationCheckInterval: NodeJS.Timeout;
    
    if (!localStorage.getItem('email_verified')) {
      console.log('이메일 인증 상태 주기적 확인 시작 (1초 간격)');
      verificationCheckInterval = setInterval(async () => {
        try {
          if (auth && auth.currentUser) {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
              console.log('자동 인증 감지: 사용자 인증됨');
              clearInterval(verificationCheckInterval);
              handleVerificationSuccess();
            }
          }
        } catch (error) {
          console.error('인증 상태 자동 확인 중 오류:', error);
        }
      }, 1000); // 1초마다 확인
    }

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (verificationCheckInterval) {
        clearInterval(verificationCheckInterval);
      }
    };
  }, []);
  
  // 초기화 전에는 로딩 표시
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500">확인 중...</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white">
      {/* 로고 */}
      <div className="relative w-16 h-16 mb-8">
        <Image
          src="/logo-animation.svg"
          alt="Nutri AI Logo"
          width={64}
          height={64}
          className="animate-spin-slow"
        />
      </div>
      
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-xl font-semibold text-center mb-2">
          회원가입
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          이메일을 입력해주세요
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-lg">
            {error}
          </div>
        )}
        
        {verificationSent ? (
          <div className="space-y-4">
            {verified ? (
              renderVerificationSuccess()
            ) : (
              <>
                <div className="p-4 bg-green-50 text-green-600 text-sm rounded-lg">
                  <p className="font-semibold mb-2">인증 메일이 발송되었습니다!</p>
                  <p>이메일 <span className="font-medium">{currentEmail}</span>로 전송된 인증 링크를 클릭해주세요.</p>
                  <p className="mt-2">인증 완료 후 아래 버튼을 클릭하여 다음 단계로 진행하세요.</p>
                </div>
                
                <button
                  onClick={checkVerificationStatus}
                  disabled={isCheckingVerification}
                  className={`w-full py-3 rounded-lg text-white font-medium text-sm transition-colors ${
                    isCheckingVerification
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isCheckingVerification ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      인증 상태 확인 중...
                    </div>
                  ) : '인증 완료 확인하기'}
                </button>
                
                <button
                  onClick={handleResendVerification}
                  disabled={isSubmitting}
                  type="button"
                  className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  {isSubmitting ? '처리 중...' : '인증 이메일 다시 보내기'}
                </button>
                
                {error && (
                  <div className="mt-2 flex flex-col gap-2">
                    <button
                      onClick={() => window.location.reload()}
                      type="button"
                      className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      페이지 새로고침
                    </button>
                    
                    <button
                      onClick={restartVerification}
                      type="button"
                      className="w-full py-2 border border-red-200 rounded-lg text-red-600 text-sm font-medium hover:bg-red-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      처음부터 다시 시작
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleVerifyEmail} className="space-y-5">
            {/* 이메일 입력 */}
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    value={emailLocal}
                    onChange={handleEmailLocalChange}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이메일"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex items-center">
                  <span className="mr-2 text-gray-500">@</span>
                  {isCustomDomain ? (
                    <input
                      type="text"
                      value={customDomain}
                      onChange={handleCustomDomainChange}
                      className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="직접 입력"
                      disabled={isSubmitting}
                    />
                  ) : (
                    <select
                      value={selectedDomain}
                      onChange={handleDomainChange}
                      className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                    >
                      {EMAIL_DOMAINS.map(domain => (
                        <option key={domain} value={domain}>
                          {domain}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {isCustomDomain && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCustomDomain(false)}
                    className="text-xs text-blue-500 hover:text-blue-600 mt-1"
                  >
                    일반 도메인 선택하기
                  </button>
                </div>
              )}
            </div>
            
            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-lg text-white font-medium text-sm transition-colors ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isSubmitting ? '처리 중...' : '이메일 인증하기'}
            </button>
            
            <p className="text-xs text-gray-500 mt-2">
              입력하신 이메일로 인증 링크가 발송됩니다.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
