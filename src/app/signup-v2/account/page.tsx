'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { doc, getDoc, query, where, collection, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { auth } from '@/firebase/config'

// 다음 주소 API를 위한 전역 변수 선언
declare global {
  interface Window {
    daum: any;
  }
}

export default function AccountSetupPage() {
  const router = useRouter()
  const { createAccount, checkUsername, checkPhoneNumber, signIn } = useAuth()

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    address: '',
    addressDetail: '',
    zonecode: '',
    phoneNumber: ''
  })
  const [tempUserId, setTempUserId] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isPhoneAvailable, setIsPhoneAvailable] = useState(false)
  const [isPhoneChecking, setIsPhoneChecking] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddressPopup, setShowAddressPopup] = useState(false)

  // 핸드폰 번호 3개 부분 분리하여 저장하기 위한 상태 추가
  const [phoneInputs, setPhoneInputs] = useState({
    first: '010',
    middle: '',
    last: ''
  })

  // 다음 주소 API를 필요할 때만 로드하는 함수
  const loadDaumAddressScript = useCallback(() => {
    if (scriptLoaded) return Promise.resolve();
    
    return new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.onload = () => {
        setScriptLoaded(true);
        resolve();
      };
      document.head.appendChild(script);
    });
  }, [scriptLoaded]);

  // 주소 검색 팝업 열기
  const openAddressSearch = useCallback(async () => {
    setShowAddressPopup(true);
    // 스크립트가 로드되지 않았다면 로드
    if (!scriptLoaded) {
      try {
        await loadDaumAddressScript();
      } catch (error) {
        setError('주소 검색 서비스를 로드하는데 실패했습니다.');
        setShowAddressPopup(false);
        return;
      }
    }

    // 스크립트 로딩 완료 후 주소 검색 팝업 열기
    new window.daum.Postcode({
      oncomplete: function (data: any) {
        const { roadAddress, jibunAddress, zonecode, buildingName } = data;
        const address = roadAddress || jibunAddress;
        
        // 건물명이 있으면 주소에 추가
        const fullAddress = buildingName ? `${address} (${buildingName})` : address;
        
        setFormData(prev => ({
          ...prev,
          address: fullAddress,
          zonecode
        }));
        
        setShowAddressPopup(false);
        
        // 주소 입력 후 상세주소 입력란에 포커스
        setTimeout(() => {
          document.getElementById('addressDetail')?.focus();
        }, 100);
      },
      onclose: function() {
        setShowAddressPopup(false);
      }
    }).open();
  }, [scriptLoaded, loadDaumAddressScript]);

  // 비밀번호 검증 함수를 메모이제이션
  const validatePassword = useMemo(() => (password: string) => {
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    return {
      isValid: hasLetter && hasNumber && hasSpecial && isLongEnough,
      messages: [
        { text: '8자 이상', isValid: isLongEnough },
        { text: '영문 포함', isValid: hasLetter },
        { text: '숫자 포함', isValid: hasNumber },
        { text: '특수문자 포함', isValid: hasSpecial }
      ]
    };
  }, []);

  // 핸드폰 번호 입력 필드 변경 핸들러 최적화
  const handlePhoneChange = useCallback((part: 'first' | 'middle' | 'last', value: string) => {
    // 숫자만 입력받기
    const numbersOnly = value.replace(/[^\d]/g, '');
    
    // 각 부분에 맞는 최대 길이 제한
    const maxLengths = {
      first: 3,
      middle: 4,
      last: 4
    };
    
    const trimmed = numbersOnly.slice(0, maxLengths[part]);
    
    // 입력 필드 자동 이동 처리
    if (trimmed.length === maxLengths[part]) {
      if (part === 'first') {
        document.getElementById('phone-middle')?.focus();
      } else if (part === 'middle') {
        document.getElementById('phone-last')?.focus();
      }
    }
    
    setPhoneInputs(prev => ({
      ...prev,
      [part]: trimmed
    }));
    
    // 핸드폰 번호가 변경되면 인증 상태 초기화
    setIsPhoneAvailable(false);
  }, []);

  // 폼 입력 변경 핸들러 최적화
  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, username: e.target.value }));
    setIsAvailable(false);
    setError('');
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, password: e.target.value }));
    setError('');
  }, []);

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
    setError('');
  }, []);

  const handleAddressDetailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, addressDetail: e.target.value }));
    setError('');
  }, []);

  // 사용자명 중복 확인 함수 최적화
  const checkUsernameAvailability = useCallback(async () => {
    const username = formData.username.trim();
    if (!username || username.length < 4 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('아이디 형식을 확인해주세요.');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const isAvailable = await checkUsername(username);
      setIsAvailable(isAvailable);
      if (!isAvailable) {
        setError('이미 사용 중인 아이디입니다.');
      }
    } catch {
      setError('중복 확인 중 오류가 발생했습니다.');
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, [checkUsername, formData.username]);

  // 전화번호 중복 확인 함수 최적화
  const checkPhoneAvailability = useCallback(async () => {
    // 모든 입력이 완료되었는지 확인
    if (!phoneInputs.first || !phoneInputs.middle || !phoneInputs.last) {
      setError('핸드폰 번호를 모두 입력해주세요.');
      setIsPhoneAvailable(false);
      return;
    }
    
    const phoneNumber = `${phoneInputs.first}-${phoneInputs.middle}-${phoneInputs.last}`;
    const phoneRegex = /^\d{3}-\d{3,4}-\d{4}$/;
    
    if (!phoneRegex.test(phoneNumber)) {
      setError('유효한 핸드폰번호 형식이 아닙니다.');
      setIsPhoneAvailable(false);
      return;
    }

    setIsPhoneChecking(true);
    setError('');

    try {
      // 전화번호 정보 업데이트
      setFormData(prev => ({ ...prev, phoneNumber }));
      const isAvailable = await checkPhoneNumber(phoneNumber);
      setIsPhoneAvailable(isAvailable);
      if (!isAvailable) {
        setError('이미 등록된 번호입니다.');
      }
    } catch {
      setError('번호 확인 중 오류가 발생했습니다.');
      setIsPhoneAvailable(false);
    } finally {
      setIsPhoneChecking(false);
    }
  }, [phoneInputs, checkPhoneNumber]);

  // 데이터 로드 및 페이지 초기화 - 한번만 실행되도록 의존성 최적화
  useEffect(() => {
    // 핸드폰 번호가 업데이트될 때 formData도 업데이트
    if (phoneInputs.first && phoneInputs.middle && phoneInputs.last) {
      const formattedNumber = `${phoneInputs.first}-${phoneInputs.middle}-${phoneInputs.last}`;
      setFormData(prev => ({ ...prev, phoneNumber: formattedNumber }));
    }
  }, [phoneInputs]);

  // 사용자 데이터 로드
  useEffect(() => {
    const checkAndLoadData = async () => {
      setIsLoading(true);
      const tempId = localStorage.getItem('tempId');
      const lastActiveTime = localStorage.getItem('last_active_time');

      if (!tempId || !lastActiveTime) {
        router.push('/signup-v2/email');
        return;
      }

      const lastActive = parseInt(lastActiveTime);
      const now = Date.now();
      const diffMinutes = (now - lastActive) / (1000 * 60);

      if (diffMinutes > 30) {
        localStorage.removeItem('tempId');
        localStorage.removeItem('last_active_time');
        router.push('/signup-v2/email');
        return;
      }

      localStorage.setItem('last_active_time', now.toString());
      setTempUserId(tempId);

      try {
        const userRef = doc(db, 'users', tempId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          setIsLoading(false);
          setError('사용자 데이터를 찾을 수 없습니다');
          setTimeout(() => {
            router.push('/signup-v2/email');
          }, 3000);
          return;
        }

        const data = userDoc.data();
        if (data.signupStep !== 'survey_completed') {
          setIsLoading(false);
          router.push('/signup-v2/survey');
          return;
        }

        setUserData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('데이터 로드 중 오류:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다');
        setIsLoading(false);
      }
    };

    checkAndLoadData();
  }, [router]);

  // 폼 제출 가능 여부 확인 함수 - useMemo로 최적화
  const canSubmit = useMemo(() => {
    const { username, password, confirmPassword, address, addressDetail } = formData;
    const validPw = validatePassword(password);
    
    // 핸드폰 번호 검증 (구성 요소가 모두 채워졌는지)
    const validPhone = 
      phoneInputs.first && 
      phoneInputs.middle && 
      phoneInputs.last && 
      phoneInputs.first.length === 3 && 
      phoneInputs.middle.length >= 3 && 
      phoneInputs.last.length === 4 &&
      isPhoneAvailable;
    
    return (
      username &&
      password === confirmPassword &&
      validPw.isValid &&
      address &&
      addressDetail &&
      validPhone &&
      isAvailable
    );
  }, [formData, phoneInputs, isPhoneAvailable, isAvailable, validatePassword]);

  // 회원가입 폼 제출 핸들러 최적화
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // 폼 데이터가 비어있는지 확인
      if (!formData.username || !formData.password || !formData.confirmPassword) {
        setError('모든 필수 항목을 입력해주세요.');
        setIsSubmitting(false);
        return;
      }

      // 비밀번호 일치 확인
      if (formData.password !== formData.confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        setIsSubmitting(false);
        return;
      }

      // 이메일 가져오기
      if (!userData?.email) {
        setError('이메일 정보가 없습니다. 회원가입 과정을 다시 시작해주세요.');
        setIsSubmitting(false);
        return;
      }
      const email = userData.email;

      // 임시 사용자 ID 확인
      if (!tempUserId) {
        setError('사용자 정보를 찾을 수 없습니다. 회원가입 과정을 다시 시작해주세요.');
        setIsSubmitting(false);
        return;
      }

      // Firebase Auth UID 확인 (중요)
      const firebaseAuthUid = localStorage.getItem('firebaseAuthUid');
      if (!firebaseAuthUid) {
        console.warn('Firebase Auth UID가 없습니다. 이메일 인증 단계에서 문제가 있었을 수 있습니다.');
      }

      // 사용자 계정 생성
      console.log('계정 생성 시작');
      const user = await createAccount(
        formData.username,
        formData.password,
        formData.phoneNumber,
        tempUserId,
        {
          address: formData.address,
          addressDetail: formData.addressDetail,
          zonecode: formData.zonecode
        }
      );

      console.log('계정 생성 결과:', !!user);

      if (user) {
        try {
          console.log('로그인 시도');
          await signIn(email, formData.password);
          console.log('로그인 성공, 로컬 스토리지 정리 시작');
          
          try {
            // 기존 회원가입 관련 로컬 스토리지 항목 정리
            localStorage.removeItem('signup_name');
            localStorage.removeItem('signupStep');
            localStorage.removeItem('redirecting_to_intro');
            localStorage.removeItem('intro_redirecting');
            localStorage.removeItem('current_signup_step');
            
            // 사용자 ID와 이메일은 유지
            const uid = localStorage.getItem('firebaseAuthUid') || '';
            if (uid) {
              localStorage.setItem('uid', uid);
            }
            
            // 회원가입 진행 중 쿠키 제거 - 계정 생성 완료 신호
            document.cookie = 'signup_in_progress=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            
            // 인증 토큰 설정
            if (auth.currentUser) {
              const idToken = await auth.currentUser.getIdToken(true);
              document.cookie = `auth_token=${idToken}; path=/; max-age=${60 * 60}; SameSite=Lax`;
            }
            
            // 대시보드로 이동 준비
            console.log('계정 생성 완료, 대시보드로 이동 준비');
            // Location 객체 직접 사용하여 실제 페이지 이동 (router.push가 동작하지 않을 경우 대비)
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000); // 2초 지연으로 감소
          } catch (cleanupError) {
            console.error('로컬 스토리지 정리 오류:', cleanupError);
            // 오류가 발생해도 대시보드로 이동
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
          }
        } catch (signInError: any) {
          console.error('로그인 오류:', signInError);
          
          // 계정은 생성되었지만 로그인에 문제가 있는 경우에도 쿠키 제거
          document.cookie = 'signup_in_progress=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          
          // 로그인 오류 상세 정보 로깅 (디버깅용)
          console.log('로그인 오류 상세:', {
            code: signInError.code, 
            message: signInError.message,
            email: email
          });
          
          // 대시보드로 이동 - 지연 시간 감소
          console.log('로그인 오류 발생, 대시보드로 강제 이동');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000); // 2초 지연으로 감소
        }
        return;
      } else {
        setError('계정 생성에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('회원가입 오류:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다. 로그인을 시도해보세요.');
      } else {
        setError(err.message || '알 수 없는 오류 발생');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, isSubmitting, formData, tempUserId, userData, createAccount, signIn]);

  if (!tempUserId) return null;

  return (
    <div className="min-h-screen flex flex-col bg-white px-0 pt-3 pb-4 sm:py-6 md:py-8">
      {/* 로고 및 제목 */}
      <div className="flex flex-col items-center">
        <div className="relative w-14 h-14 mb-1 sm:w-16 sm:h-16 sm:mb-2 md:w-20 md:h-20">
          <Image
            src="/logo-animation.svg"
            alt="Nutri AI Logo"
            width={56}
            height={56}
            className="animate-spin-slow w-full h-full"
          />
        </div>
        
        <h1 className="text-lg font-bold text-gray-800 mb-3 sm:text-xl md:text-2xl">사용자 계정 생성</h1>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin sm:w-10 sm:h-10 md:w-12 md:h-12"></div>
          <p className="mt-3 text-sm font-semibold text-gray-700 sm:text-base md:mt-4">데이터를 불러오는 중...</p>
        </div>
      ) : (
        <div className="px-4 w-full max-w-md mx-auto sm:px-6 md:max-w-lg">
          {error && (
            <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200 sm:p-3 sm:text-sm">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 flex-shrink-0 sm:h-4 sm:w-4 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="w-full space-y-3 sm:space-y-4 md:space-y-5">
            {/* 아이디 입력 */}
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">
                아이디
              </label>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base sm:py-2.5"
                  placeholder="영문, 숫자, 언더바(_)만 사용"
                  minLength={4}
                  maxLength={20}
                  required
                />
                <button
                  type="button"
                  onClick={checkUsernameAvailability}
                  disabled={isChecking || !formData.username}
                  className="px-2 py-2 bg-blue-500 text-white text-xs font-medium rounded-md disabled:bg-gray-300 sm:text-sm sm:py-2.5"
                >
                  {isChecking ? '확인 중' : '중복 확인'}
                </button>
              </div>
              {isAvailable && (
                <p className="mt-1 text-xs text-green-600 flex items-center sm:text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  사용 가능한 아이디입니다.
                </p>
              )}
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base sm:py-2.5"
                placeholder="8자 이상의 비밀번호"
                required
              />
              <div className="flex flex-wrap gap-1 mt-1 sm:gap-2">
                {validatePassword(formData.password).messages.map((item, index) => (
                  <div key={index} className="flex items-center bg-gray-50 px-1.5 py-0.5 rounded-full sm:px-2 sm:py-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.isValid ? 'bg-green-500' : 'bg-gray-300'} sm:w-2 sm:h-2`}></div>
                    <span className={`text-xs ml-1 ${item.isValid ? 'text-green-600' : 'text-gray-500'} sm:text-sm`}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">
                비밀번호 확인
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleConfirmPasswordChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base sm:py-2.5"
                placeholder="비밀번호 확인"
                required
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-xs text-red-500 flex items-center sm:text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  비밀번호가 일치하지 않습니다.
                </p>
              )}
            </div>

            {/* 핸드폰 번호 입력 - 3칸으로 나누기 */}
            <div>
              <label htmlFor="phoneNumber" className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">
                핸드폰 번호
              </label>
              <div className="grid grid-cols-5 gap-1 mb-1 sm:gap-2">
                <input
                  type="text"
                  id="phone-first"
                  value={phoneInputs.first}
                  onChange={(e) => handlePhoneChange('first', e.target.value)}
                  className="col-span-1 px-1 py-2 border border-gray-300 rounded-md text-center text-sm sm:text-base sm:py-2.5"
                  placeholder="010"
                  maxLength={3}
                  required
                />
                <span className="flex items-center justify-center text-gray-400 sm:text-lg">-</span>
                <input
                  type="text"
                  id="phone-middle"
                  value={phoneInputs.middle}
                  onChange={(e) => handlePhoneChange('middle', e.target.value)}
                  className="col-span-1 px-1 py-2 border border-gray-300 rounded-md text-center text-sm sm:text-base sm:py-2.5"
                  placeholder="1234"
                  maxLength={4}
                  required
                />
                <span className="flex items-center justify-center text-gray-400 sm:text-lg">-</span>
                <input
                  type="text"
                  id="phone-last"
                  value={phoneInputs.last}
                  onChange={(e) => handlePhoneChange('last', e.target.value)}
                  className="col-span-1 px-1 py-2 border border-gray-300 rounded-md text-center text-sm sm:text-base sm:py-2.5"
                  placeholder="5678"
                  maxLength={4}
                  required
                />
              </div>
              <button
                type="button"
                onClick={checkPhoneAvailability}
                disabled={isPhoneChecking || !phoneInputs.first || !phoneInputs.middle || !phoneInputs.last}
                className="w-full px-3 py-2 mb-1 bg-blue-500 text-white text-xs font-medium rounded-md disabled:bg-gray-300 sm:text-sm sm:py-2.5"
              >
                {isPhoneChecking ? '확인 중...' : '중복 확인'}
              </button>
              {isPhoneAvailable && (
                <p className="text-xs text-green-600 flex items-center sm:text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  중복된 번호가 없습니다.
                </p>
              )}
            </div>

            {/* 주소 입력 - UI 개선 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 sm:text-sm">주소</label>
              
              <div className="grid grid-cols-4 gap-1 mb-1 sm:gap-2">
                <input
                  type="text"
                  id="zonecode"
                  name="zonecode"
                  value={formData.zonecode}
                  readOnly
                  className="col-span-1 px-1 py-2 border border-gray-300 rounded-md text-center text-sm sm:text-base sm:py-2.5"
                  placeholder="우편번호"
                />
                <button
                  type="button"
                  onClick={openAddressSearch}
                  className="col-span-3 px-2 py-2 bg-blue-500 text-white text-xs font-medium rounded-md sm:text-sm sm:py-2.5"
                >
                  {showAddressPopup ? '주소 검색 중...' : '주소 검색'}
                </button>
              </div>
              
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-1 text-sm sm:text-base sm:py-2.5"
                placeholder="도로명 주소"
                required
              />
              
              <input
                type="text"
                id="addressDetail"
                name="addressDetail"
                value={formData.addressDetail}
                onChange={handleAddressDetailChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base sm:py-2.5"
                placeholder="상세 주소"
                required
              />
              {formData.address && (
                <p className="mt-1 text-xs text-gray-500 truncate sm:text-sm">
                  {formData.address}
                </p>
              )}
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mt-2 sm:text-base sm:py-3.5 md:py-4"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 sm:w-5 sm:h-5"></div>
                  처리 중...
                </div>
              ) : (
                '계정 생성하기'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
