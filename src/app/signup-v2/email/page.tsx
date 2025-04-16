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
        return false;
      }
      
      // 1. Firebase Auth에서 이메일 확인
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length > 0) {
        return true;
      }
      
      // 2. Firestore에서 이메일 중복 확인
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('이메일 확인 오류:', error);
      return false;
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
      
      // 이메일 중복 확인
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        setErrorMessage('이미 사용 중인 이메일입니다');
        return false;
      }
      
      // signup_name 가져오기
      const name = localStorage.getItem('signup_name') || '사용자';
      
      // 임시 비밀번호 생성
      const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      setTempPassword(randomPassword);
      
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
      const docRef = await setDoc(doc(collection(db, 'users'), tempUser.uid), {
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
    } catch (error: any) {
      console.error('이메일 인증 발송 오류:', error);
      
      // 오류 메시지 처리
      let errorMessage = '이메일 인증 발송 중 오류가 발생했습니다.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다.';
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
    
    const completeEmail = `${emailLocal.trim()}@${domain}`
    
    setIsSubmitting(true)
    setError('')
    
    // 공통 이메일 인증 함수 사용
    const success = await sendVerificationEmail(completeEmail)
    
    // 결과에 따라 상태 업데이트
    if (!success) {
      setError(emailErrorMessage || '이메일 인증 처리 중 오류가 발생했습니다')
    }
    
    setIsSubmitting(false)
  }
  
  // 이메일 인증 상태 확인
  const checkVerificationStatus = async () => {
    if (!currentEmail || !tempPassword || verificationCheckInProgress) return;
    
    try {
      setVerificationCheckInProgress(true);
      
      // 만약 auth가 없다면 로그 출력하고 리턴
      if (!auth) {
        console.error('Firebase 인증이 초기화되지 않았습니다');
        setVerificationCheckInProgress(false);
        return;
      }
      
      // Firebase에 로그인 시도
      const userCredential = await signInWithEmailAndPassword(auth, currentEmail, tempPassword);
      const user = userCredential.user;
      
      if (user) {
        // 현재 사용자 인증 토큰 갱신
        const token = await user.getIdToken(true);
        
        // 인증 쿠키 설정과 회원가입 진행 쿠키 설정 순서 중요
        document.cookie = `auth_token=${token}; path=/; max-age=${50 * 60}; SameSite=Lax`;
        document.cookie = 'signup_in_progress=true; path=/; max-age=10800; SameSite=Lax';
        
        if (user.emailVerified) {
          // 이메일 인증 완료 상태 저장
          localStorage.setItem('email_verified', 'true');
          localStorage.setItem('last_active_time', Date.now().toString());
          
          // 컴포넌트가 마운트된 상태인지 확인
          if (isMountedRef.current) {
            setVerified(true);
            
            // 인증 완료 후 인트로 페이지로 이동 (타이머 설정)
            const timer = setTimeout(() => {
              if (isMountedRef.current) {
                router.push('/signup-v2/intro');
              }
            }, 2000);
            
            // 컴포넌트 언마운트 시 타이머 정리
            return () => clearTimeout(timer);
          }
        } else {
          // 인증되지 않은 상태
          if (isMountedRef.current) {
            setVerified(false);
            
            // 이메일 토큰 만료 여부 확인
            const lastActiveTime = localStorage.getItem('email_sent_time');
            const remainingTimeInMinutes = calculateRemainingTime(lastActiveTime);
            setExpiryTimeInMinutes(remainingTimeInMinutes);
            
            if (remainingTimeInMinutes <= 0) {
              // 토큰이 만료된 경우
              setResendEnabled(true);
            } else {
              // 토큰이 유효한 경우 타이머 시작
              if (verificationTimer === 0) {
                startCountdown(Math.floor(remainingTimeInMinutes * 60));
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('인증 상태 확인 중 오류:', error);
    } finally {
      if (isMountedRef.current) {
        setVerificationCheckInProgress(false);
      }
    }
  };

  // 이메일 인증 프로세스 재시작
  const restartVerification = async () => {
    try {
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
  
  // 이메일 인증 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isVerifying && verificationTimer > 0) {
      interval = setInterval(() => {
        setVerificationTimer((prev) => prev - 1)
      }, 1000)
    } else if (verificationTimer === 0 && isVerifying) {
      checkEmailVerification()
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isVerifying, verificationTimer])

  // 이메일 인증 확인
  const checkEmailVerification = async () => {
    if (isVerifying || !auth) return;
    
    try {
      setIsVerifying(true);
      
      // 현재 로그인된 사용자 가져오기
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        // 사용자가 로그인되어 있지 않은 경우 재로그인 시도
        if (currentEmail && tempPassword) {
          try {
            await signInWithEmailAndPassword(auth, currentEmail, tempPassword);
          } catch (error) {
            console.error('로그인 실패:', error);
            if (isMountedRef.current) {
              setError('인증 상태 확인 중 로그인 오류가 발생했습니다. 다시 시도해주세요.');
              setIsVerifying(false);
            }
            return;
          }
        } else {
          if (isMountedRef.current) {
            setError('인증 정보가 없습니다. 처음부터 다시 시도해주세요.');
            setIsVerifying(false);
          }
          return;
        }
      }
      
      // 사용자 정보 갱신
      await auth.currentUser?.reload();
      
      // 이메일 인증 여부 확인
      if (auth.currentUser?.emailVerified) {
        // 인증 완료 표시
        localStorage.setItem('email_verified', 'true');
        localStorage.setItem('last_active_time', Date.now().toString());
        
        // 인증 토큰 갱신 및 쿠키 설정
        const token = await auth.currentUser.getIdToken(true);
        document.cookie = `auth_token=${token}; path=/; max-age=${50 * 60}; SameSite=Lax`;
        document.cookie = 'signup_in_progress=true; path=/; max-age=10800; SameSite=Lax';
        
        if (isMountedRef.current) {
          setVerified(true);
          
          // 인증 완료 후 인트로 페이지로 이동 (타이머 설정)
          setTimeout(() => {
            if (isMountedRef.current) {
              router.push('/signup-v2/intro');
            }
          }, 2000);
        }
      } else {
        if (isMountedRef.current) {
          setError('아직 이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.');
        }
      }
    } catch (error) {
      console.error('이메일 인증 확인 오류:', error);
      if (isMountedRef.current) {
        setError('인증 상태 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsVerifying(false);
      }
    }
  };

  // 이메일 인증 메일 재전송
  const handleResendVerification = async () => {
    setError('');
    setIsSubmitting(true);
    
    try {
      // 현재 state가 비어있으면 localStorage에서 값을 가져옴
      let currentEmailToUse = currentEmail || localStorage.getItem('email') || '';
      
      if (!currentEmailToUse) {
        setError('이메일 정보를 찾을 수 없습니다. 다시 시도해주세요.');
        setIsSubmitting(false);
        return;
      }
      
      // 기존 사용자가 로그인 되어 있으면 로그아웃
      if (auth && auth.currentUser) {
        await signOut(auth);
      }
      
      // 로컬 스토리지에서 사용자 정보 삭제 (새로운 정보로 갱신하기 위함)
      localStorage.removeItem('temp_password');
      localStorage.removeItem('firebaseAuthUid');
      
      // 이메일 인증 재시도
      await sendVerificationEmail(currentEmailToUse);
      
      // 타이머 설정
      setVerificationTimer(60); // 1분 타이머 설정
    } catch (error: any) {
      console.error('이메일 인증 재전송 오류:', error);
      setError('이메일 인증을 다시 보내는 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // 누락된 calculateRemainingTime 함수 추가
  const calculateRemainingTime = (lastActiveTimeStr: string | null): number => {
    if (!lastActiveTimeStr) return 0;
    
    try {
      const lastActive = parseInt(lastActiveTimeStr);
      const now = Date.now();
      // 30분(1800초) 타이머에서 남은 시간(초)
      const diffSeconds = 1800 - (now - lastActive) / 1000;
      return Math.max(0, Math.floor(diffSeconds));
    } catch (e) {
      console.error('남은 시간 계산 오류:', e);
      return 0;
    }
  };

  // 누락된 startCountdown 함수 추가
  const startCountdown = (seconds: number) => {
    if (seconds <= 0) {
      setResendEnabled(true);
      return;
    }
    
    // 카운트다운 로직은 실제로 구현할 필요 없음 (빈 함수로 대체)
    console.log(`카운트다운 시작: ${seconds}초`);
  };
  
  // 컴포넌트 마운트 시 초기화 로직
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        console.log('[이메일] 컴포넌트 초기화');
        
        // 항상 회원가입 진행 중 쿠키 설정
        document.cookie = 'signup_in_progress=true; path=/; max-age=10800; SameSite=Lax';
        
        // 인증 토큰이 있는 경우에도 회원가입 진행 중 쿠키 함께 설정
        if (auth && auth.currentUser) {
          try {
            const idToken = await auth.currentUser.getIdToken(true);
            document.cookie = `auth_token=${idToken}; path=/; max-age=${50 * 60}; SameSite=Lax`;
            document.cookie = 'signup_in_progress=true; path=/; max-age=10800; SameSite=Lax';
          } catch (tokenError) {
            console.error('토큰 설정 오류:', tokenError);
            // 토큰 설정 실패 시에도 쿠키 설정 시도
            document.cookie = 'signup_in_progress=true; path=/; max-age=10800; SameSite=Lax';
          }
        }
        
        // URL에서 이메일 파라미터 확인
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const emailParam = params.get('email');
          
          if (emailParam && emailParam.includes('@')) {
            console.log('[이메일] URL에서 이메일 파라미터 발견:', emailParam);
            setEmail(emailParam);
            const [localPart, domainPart] = emailParam.split('@');
            setEmailLocal(localPart || '');
            
            // 도메인이 기본 도메인 목록에 있는지 확인
            if (domainPart && EMAIL_DOMAINS.includes(domainPart)) {
              setSelectedDomain(domainPart);
              setIsCustomDomain(false);
            } else if (domainPart) {
              setSelectedDomain('직접입력');
              setCustomDomain(domainPart);
              setIsCustomDomain(true);
            }
            
            // 자동으로 이메일 인증 시도 (URL에서 왔을 경우)
            if (!localStorage.getItem('email_verification_sent') === true) {
              // 잠시 지연 후 이메일 인증 실행
              setTimeout(async () => {
                await sendVerificationEmail(emailParam);
              }, 1000); // 1초 지연
            }
          }
          
          // 이미 인증 완료된 상태인지 확인
          const emailVerified = localStorage.getItem('email_verified') === 'true';
          const tempId = localStorage.getItem('tempId');
          const lastActiveTime = localStorage.getItem('last_active_time');
          
          if (emailVerified && tempId && lastActiveTime) {
            console.log('[이메일] 이미 인증 완료된 상태, 상태 확인 시작');
            
            // 리다이렉션 상태 초기화
            localStorage.removeItem('redirecting_to_intro');
            
            // 인증 상태 확인
            checkVerificationStatus();
          } else {
            // 남은 시간 계산
            if (lastActiveTime) {
              const remainingTime = calculateRemainingTime(lastActiveTime);
              setExpiryTimeInMinutes(remainingTime);
              
              if (remainingTime <= 0) {
                setResendEnabled(true);
              } else if (remainingTime > 0) {
                startCountdown(remainingTime);
              }
            }
          }
        }
      } catch (error) {
        console.error('[이메일] 초기화 중 오류:', error);
      }
    };
    
    initializeComponent();
    
    // 인증 상태 주기적 확인 (이메일 발송 후)
    let intervalId: NodeJS.Timeout | null = null;
    
    if (emailSent && !verified) {
      console.log('[이메일] 주기적 인증 상태 확인 시작');
      intervalId = setInterval(() => {
        if (!verified) {
          checkVerificationStatus();
        } else {
          if (intervalId) {
            clearInterval(intervalId);
          }
        }
      }, 10000); // 10초마다 확인
    }
    
    // 언마운트 시 정리
    return () => {
      isMountedRef.current = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [emailSent, verified]);
  
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
              {isCheckingVerification ? '확인 중...' : '인증 완료 확인하기'}
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
                  onClick={() => {
                    // 인증 관련 로컬 스토리지 초기화
                    localStorage.removeItem('email_verification_sent');
                    localStorage.removeItem('email_verified');
                    localStorage.removeItem('temp_password');
                    localStorage.removeItem('firebaseAuthUid');
                    
                    // Firebase 로그아웃
                    if (auth) {
                      signOut(auth).then(() => {
                        // 페이지 새로고침
                        window.location.href = '/signup-v2/email';
                      }).catch(err => {
                        console.error('로그아웃 오류:', err);
                        // 오류가 있어도 페이지 리로드
                        window.location.href = '/signup-v2/email';
                      });
                    } else {
                      // auth가 null이면 그냥 페이지 리로드
                      window.location.href = '/signup-v2/email';
                    }
                  }}
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
