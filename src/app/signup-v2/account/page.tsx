'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { auth } from '@/firebase/config'
import Script from 'next/script'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'

// 다음 주소 API를 위한 전역 변수 선언
declare global {
  interface Window {
    daum: any;
  }
}

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

export default function AccountSetupPage() {
  const router = useRouter()
  const { createAccount, checkUsername, checkEmail, checkPhoneNumber } = useAuth()
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
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(false)
  const [isUsernameChecking, setIsUsernameChecking] = useState(false)

  // 컴포넌트 마운트 시 임시 사용자 ID와 설문 완료 여부 확인
  useEffect(() => {
    const checkAndLoadData = async () => {
      setIsLoading(true)
      const tempId = localStorage.getItem('tempId')
      const lastActiveTime = localStorage.getItem('last_active_time')
      const emailVerified = localStorage.getItem('email_verified')
      
      if (!tempId || !lastActiveTime || !emailVerified) {
        router.push('/signup-v2/email')
        return
      }

      // 30분 초과 시 세션 만료
      const lastActive = parseInt(lastActiveTime)
      const now = Date.now()
      const diffMinutes = (now - lastActive) / (1000 * 60)
      
      if (diffMinutes > 30) {
        localStorage.removeItem('tempId')
        localStorage.removeItem('last_active_time')
        localStorage.removeItem('email_verified')
        router.push('/signup-v2/email')
        return
      }
      
      // 세션 활성 시간 업데이트
      localStorage.setItem('last_active_time', now.toString())
      setTempUserId(tempId)

      try {
        // Firestore에서 임시 사용자 데이터 확인
        const userRef = doc(db, 'users', tempId)
        const userDoc = await getDoc(userRef)
        
        if (!userDoc.exists()) {
          setError('사용자 데이터를 찾을 수 없습니다')
          setTimeout(() => {
            router.push('/signup-v2/email')
          }, 3000)
          return
        }
        
        const data = userDoc.data()
        // 설문 단계 확인
        if (data.signupStep !== 'survey_completed') {
          router.push('/signup-v2/survey')
          return
        }
        
        // 사용자 데이터 저장
        setUserData(data)
        setIsLoading(false)
      } catch (error) {
        console.error('데이터 로드 중 오류:', error)
        setError('데이터를 불러오는 중 오류가 발생했습니다')
        setIsLoading(false)
      }
    }
    
    checkAndLoadData()
  }, [router])

  // 다음 주소 API를 사용하여 주소 검색
  const openAddressSearch = () => {
    if (!scriptLoaded) {
      setError('주소 검색 서비스를 로드 중입니다. 잠시만 기다려주세요.')
      return
    }

    new window.daum.Postcode({
      oncomplete: function(data: any) {
        // 검색 결과에서 정보 추출
        const { roadAddress, jibunAddress, zonecode } = data
        const address = roadAddress || jibunAddress

        // 주소 데이터 저장
        setFormData(prev => ({
          ...prev,
          address,
          zonecode
        }))
      }
    }).open()
  }

  // 비밀번호 유효성 검사 함수
  const validatePassword = (password: string) => {
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    const isLongEnough = password.length >= 8

    return {
      isValid: hasLetter && hasNumber && hasSpecial && isLongEnough,
      messages: [
        { text: '8자 이상', isValid: isLongEnough },
        { text: '영문 포함', isValid: hasLetter },
        { text: '숫자 포함', isValid: hasNumber },
        { text: '특수문자 포함', isValid: hasSpecial }
      ]
    }
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, username: e.target.value }))
    setIsAvailable(false)
    setError('')
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, password: e.target.value }))
    setError('')
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))
    setError('')
  }

  const handleAddressDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, addressDetail: e.target.value }))
    setError('')
  }

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value)
    setFormData(prev => ({ ...prev, phoneNumber: formattedValue }))
    setIsPhoneAvailable(false)
    setError('')
  }

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  const checkUsernameAvailability = async () => {
    const username = formData.username.trim()
    
    if (!username) {
      setError('아이디를 입력해주세요')
      return
    }

    if (username.length < 4) {
      setError('아이디는 4자 이상이어야 합니다')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다')
      return
    }

    setIsChecking(true)
    setError('')
    
    try {
      const isAvailable = await checkUsername(username)
      
      if (isAvailable) {
        setIsAvailable(true)
      } else {
        setError('이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.')
        setIsAvailable(false)
      }
    } catch (err) {
      setError('중복 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setIsAvailable(false)
    } finally {
      setIsChecking(false)
    }
  }

  const checkPhoneAvailability = async () => {
    if (!formData.phoneNumber.trim()) {
      setError('핸드폰번호를 입력해주세요')
      setIsPhoneAvailable(false)
      return
    }

    // 핸드폰번호 형식 확인
    const phoneRegex = /^\d{3}-\d{3,4}-\d{4}$/
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError('유효한 핸드폰번호 형식이 아닙니다 (예: 010-1234-5678)')
      setIsPhoneAvailable(false)
      return
    }

    setIsPhoneChecking(true)
    setError('')

    try {
      // 핸드폰번호 중복 확인
      const isAvailable = await checkPhoneNumber(formData.phoneNumber)
      
      if (isAvailable) {
        setIsPhoneAvailable(true)
      } else {
        setError('이미 등록된 핸드폰번호입니다')
        setIsPhoneAvailable(false)
      }
    } catch (err) {
      console.error('핸드폰번호 확인 중 오류:', err)
      setError('핸드폰번호 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setIsPhoneAvailable(false)
    } finally {
      setIsPhoneChecking(false)
    }
  }

  // 제출 가능 여부 확인
  const canSubmit = () => {
    const { username, password, confirmPassword, address, addressDetail, phoneNumber } = formData
    const passwordValidation = validatePassword(password)
    
    return (
      username.trim() !== '' &&
      isAvailable &&
      passwordValidation.isValid &&
      password === confirmPassword &&
      address.trim() !== '' &&
      addressDetail.trim() !== '' &&
      phoneNumber.trim() !== '' &&
      isPhoneAvailable
    )
  }

  // 계정 생성 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canSubmit()) {
      setError('모든 필수 항목을 입력하고 중복 확인을 완료해주세요.')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      if (!tempUserId) {
        setError('세션 정보가 유효하지 않습니다. 다시 시도해주세요.')
        setIsLoading(false)
        return
      }
      
      // 비밀번호 불일치 확인
      if (formData.password !== formData.confirmPassword) {
        setError('비밀번호가 일치하지 않습니다')
        setIsLoading(false)
        return
      }
      
      // 유저네임, 패스워드, 주소 정보로 계정 생성
      const addressInfo = {
        address: formData.address,
        addressDetail: formData.addressDetail,
        zonecode: formData.zonecode
      }

      // 핸드폰 번호가 입력된 경우에만 전달
      const phoneNumber = formData.phoneNumber.trim() || ''
      
      // 계정 생성
      const success = await createAccount(
        formData.username,
        formData.password,
        phoneNumber,
        tempUserId,
        addressInfo
      )
      
      if (success) {
        // 로컬 스토리지 데이터 제거
        localStorage.removeItem('tempId')
        localStorage.removeItem('last_active_time')
        localStorage.removeItem('email_verified')
        localStorage.removeItem('email')
        
        // 대시보드로 이동
        router.push('/dashboard')
      } else {
        setError('계정 생성 중 오류가 발생했습니다')
      }
    } catch (error: any) {
      console.error('계정 생성 오류:', error)
      setError(`계정 생성 중 오류: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 임시 사용자 ID가 없으면 로딩 표시 또는 리다이렉트
  if (!tempUserId) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white">
      {/* 다음 주소 API 스크립트 */}
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        onLoad={() => setScriptLoaded(true)}
      />
      
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

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      ) : (
        <div className="max-w-md mx-auto py-8 w-full">
          <h1 className="text-xl font-semibold text-center mb-2">
            로그인에 사용할 계정을 설정해주세요
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            이메일은 회원가입을 위한 인증 수단이며, 로그인은 아이디와 비밀번호로 진행됩니다.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-lg">
              {error}
              {error.includes('Firebase Authentication') && (
                <p className="mt-2 text-xs">
                  <b>해결 방법:</b> Firebase 데이터베이스와 인증 시스템 간 동기화 문제입니다. 
                  다른 이메일 주소를 사용하거나 Firebase 콘솔에서 기존 계정을 삭제한 후 다시 시도해보세요.
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 아이디 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                아이디
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="아이디 입력 (4자 이상)"
                />
                <button
                  type="button"
                  onClick={checkUsernameAvailability}
                  disabled={isChecking}
                  className={`px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                    isChecking 
                      ? 'bg-gray-400 cursor-not-allowed'
                      : isAvailable
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isChecking ? '확인중...' : isAvailable ? '사용가능' : '중복확인'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                영문, 숫자, 밑줄(_)만 사용 가능
              </p>
            </div>

            {/* 핸드폰번호 입력 (필수) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                핸드폰번호
              </label>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="text"
                    value={formData.phoneNumber.split('-')[0] || ''}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, '').slice(0, 3);
                      if (v.length === 3) {
                        document.getElementById('phone-middle')?.focus();
                      }
                      setFormData(prev => ({
                        ...prev,
                        phoneNumber: formatPhoneNumber(`${v}${formData.phoneNumber.slice(formData.phoneNumber.indexOf('-') + 1) || ''}`)
                      }));
                    }}
                    className="w-20 px-3 py-2 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="010"
                    maxLength={3}
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    id="phone-middle"
                    type="text"
                    value={(formData.phoneNumber.split('-')[1] || '')}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                      if (v.length === 4) {
                        document.getElementById('phone-last')?.focus();
                      }
                      const first = formData.phoneNumber.split('-')[0] || '';
                      setFormData(prev => ({
                        ...prev,
                        phoneNumber: formatPhoneNumber(`${first}${v}${formData.phoneNumber.split('-')[2] ? `-${formData.phoneNumber.split('-')[2]}` : ''}`)
                      }));
                    }}
                    className="w-24 px-3 py-2 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1234"
                    maxLength={4}
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    id="phone-last"
                    type="text"
                    value={formData.phoneNumber.split('-')[2] || ''}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                      const [first, middle] = formData.phoneNumber.split('-');
                      setFormData(prev => ({
                        ...prev,
                        phoneNumber: formatPhoneNumber(`${first || ''}${middle ? `-${middle}` : ''}${v ? `-${v}` : ''}`)
                      }));
                    }}
                    className="w-24 px-3 py-2 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5678"
                    maxLength={4}
                  />
                </div>
                <button
                  type="button"
                  onClick={checkPhoneAvailability}
                  disabled={isPhoneChecking}
                  className={`px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                    isPhoneChecking 
                      ? 'bg-gray-400 cursor-not-allowed'
                      : isPhoneAvailable
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isPhoneChecking ? '확인중...' : isPhoneAvailable ? '사용가능' : '중복확인'}
                </button>
              </div>
              {isPhoneAvailable && formData.phoneNumber.trim() && (
                <p className="mt-1 text-sm text-green-600">사용 가능한 핸드폰번호입니다</p>
              )}
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="비밀번호 입력"
              />
              <div className="mt-1 flex items-center gap-4 flex-wrap">
                {validatePassword(formData.password).messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-1 text-xs ${
                      message.isValid ? 'text-green-500' : 'text-gray-400'
                    }`}
                  >
                    <div className={`w-1 h-1 rounded-full ${message.isValid ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {message.text}
                  </div>
                ))}
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={handleConfirmPasswordChange}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="비밀번호 다시 입력"
              />
              {formData.confirmPassword && (
                <p className={`mt-1 text-xs ${formData.password === formData.confirmPassword ? 'text-green-500' : 'text-red-500'}`}>
                  {formData.password === formData.confirmPassword ? '비밀번호가 일치합니다' : '비밀번호가 일치하지 않습니다'}
                </p>
              )}
            </div>

            {/* 주소 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                주소
              </label>
              <div className="space-y-2">
                <div className="flex justify-end gap-2">
                  <input
                    type="text"
                    value={formData.zonecode}
                    readOnly
                    className="w-32 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    placeholder="우편번호"
                  />
                  <button
                    type="button"
                    onClick={openAddressSearch}
                    className="px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    주소 검색
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.address}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="기본 주소"
                />
                <input
                  type="text"
                  value={formData.addressDetail}
                  onChange={handleAddressDetailChange}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="상세 주소 입력"
                />
              </div>
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={!canSubmit()}
              className="w-full mt-8 py-3 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              완료
            </button>
          </form>
        </div>
      )}
    </div>
  )
}