'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { auth } from '@/lib/firebase'
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth'

export default function SignupPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    username: '', // 이 값이 Firestore의 문서 ID로 사용됨 (즉, 로그인 시 ID)
    password: '',
    email: '',
    phone: '',
    otp: '',
    verified: false,
    gender: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    height: '',
    weight: '',
    visionLeft: '',
    visionRight: '',
    address: '',
    detailAddress: '',
    // 추가 건강 및 생활습관 정보
    exerciseFrequency: '',  // 운동 빈도
    dietType: '',           // 식습관
    sleepQuality: '',       // 수면의 질
    healthGoal: '',         // 건강 목표 (예: 체중 감량, 근육 증가 등)
    allergies: '',          // 알레르기 정보
  })

  const [verificationId, setVerificationId] = useState('')

  useEffect(() => {
    if (!(window as any).recaptchaVerifier) {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {}
      })
      verifier.render()
      ;(window as any).recaptchaVerifier = verifier
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const sendOTP = async () => {
    try {
      const appVerifier = (window as any).recaptchaVerifier
      const confirmation = await signInWithPhoneNumber(auth, form.phone, appVerifier)
      setVerificationId(confirmation.verificationId)
      alert('인증번호가 전송되었습니다.')
    } catch (err) {
      alert('인증번호 전송 실패')
      console.error(err)
    }
  }

  const confirmOTP = async () => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, form.otp)
      await signInWithCredential(auth, credential)
      alert('휴대폰 인증 성공!')
      setForm(prev => ({ ...prev, verified: true }))
    } catch (err) {
      alert('인증 실패')
      console.error(err)
    }
  }

  const handleSubmit = async () => {
    // 필수 항목 체크 (이름, 아이디, 휴대폰, 인증여부)
    if (!form.name || !form.username || !form.phone || !form.verified) {
      alert('이름, 아이디, 휴대폰 및 휴대폰 인증은 필수입니다!')
      return
    }

    try {
      // 회원가입 시 Firestore 'users' 컬렉션의 문서 ID로
      // 사용자가 입력한 아이디(username)를 사용 (로그인 시에도 동일하게 사용)
      const uid = form.username
      await setDoc(doc(db, 'users', uid), form)
      alert('회원가입 완료! ✅')
      router.push(`/chat?name=${encodeURIComponent(form.name)}`)
    } catch (err) {
      alert('회원정보 저장 실패')
      console.error(err)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">회원가입</h1>
        
        {/* 개인 기본 정보 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">이름 *</label>
            <input 
              type="text" 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md" 
            />
          </div>

          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">아이디 *</label>
            <input 
              type="text" 
              name="username" 
              value={form.username} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md" 
            />
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">비밀번호 *</label>
            <input 
              type="password" 
              name="password" 
              value={form.password} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md" 
            />
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">이메일 *</label>
            <input 
              type="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md" 
            />
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">휴대폰 *</label>
            <input 
              type="tel" 
              name="phone" 
              value={form.phone} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md" 
            />
          </div>
          <button onClick={sendOTP} className="w-full bg-blue-500 text-white py-2 rounded">
            인증번호 받기
          </button>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">인증번호</label>
            <input 
              type="text" 
              name="otp" 
              value={form.otp} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md" 
            />
          </div>
          <button onClick={confirmOTP} className="w-full bg-green-600 text-white py-2 rounded">
            인증 확인
          </button>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">생년월일 *</label>
            <div className="w-2/3 flex gap-2">
              <select 
                name="birthYear" 
                value={form.birthYear} 
                onChange={handleChange} 
                className="w-1/3 px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">YYYY</option>
                {Array.from({ length: 100 }, (_, i) => (
                  <option key={i} value={2024 - i}>{2024 - i}</option>
                ))}
              </select>
              <select 
                name="birthMonth" 
                value={form.birthMonth} 
                onChange={handleChange} 
                className="w-1/3 px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">MM</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>{i + 1}</option>
                ))}
              </select>
              <select 
                name="birthDay" 
                value={form.birthDay} 
                onChange={handleChange} 
                className="w-1/3 px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">DD</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">성별 *</label>
            <select 
              name="gender" 
              value={form.gender} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">선택</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">키 *</label>
            <select 
              name="height" 
              value={form.height} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">선택</option>
              {Array.from({ length: 71 }, (_, i) => (
                <option key={i} value={130 + i}>{130 + i} cm</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">몸무게 *</label>
            <input 
              type="number" 
              name="weight" 
              value={form.weight} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md" 
            />
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">시력 (좌/우)</label>
            <div className="w-2/3 flex gap-2">
              <input 
                type="text" 
                name="visionLeft" 
                placeholder="좌" 
                onChange={handleChange} 
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-md" 
              />
              <input 
                type="text" 
                name="visionRight" 
                placeholder="우" 
                onChange={handleChange} 
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-md" 
              />
            </div>
          </div>
          
          <div className="flex justify-between items-start">
            <label className="text-sm font-medium text-gray-700 w-1/3">주소 *</label>
            <div className="w-2/3 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <button 
                  onClick={() => {
                    new (window as any).daum.Postcode({
                      oncomplete: function (data: any) {
                        setForm(prev => ({ ...prev, address: data.roadAddress }))
                      }
                    }).open()
                  }} 
                  className="bg-blue-500 text-white px-4 py-2 rounded-md"
                >
                  검색
                </button>
              </div>
              <input 
                type="text" 
                name="detailAddress" 
                placeholder="상세 주소 입력" 
                onChange={handleChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md" 
              />
            </div>
          </div>
        </div>

        {/* 건강 및 생활습관 정보 섹션 */}
        <div className="mt-8 border-t pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-blue-600 mb-4">건강 및 생활습관 정보</h2>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">운동 빈도</label>
            <select 
              name="exerciseFrequency" 
              value={form.exerciseFrequency} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">선택</option>
              <option value="없음">없음</option>
              <option value="주 1-2회">주 1-2회</option>
              <option value="주 3-4회">주 3-4회</option>
              <option value="주 5회 이상">주 5회 이상</option>
            </select>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">식습관</label>
            <select 
              name="dietType" 
              value={form.dietType} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">선택</option>
              <option value="균형 잡힌 식사">균형 잡힌 식사</option>
              <option value="외식 빈번">외식 빈번</option>
              <option value="패스트푸드 위주">패스트푸드 위주</option>
              <option value="채식">채식</option>
            </select>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">수면의 질</label>
            <select 
              name="sleepQuality" 
              value={form.sleepQuality} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">선택</option>
              <option value="매우 좋음">매우 좋음</option>
              <option value="좋음">좋음</option>
              <option value="보통">보통</option>
              <option value="나쁨">나쁨</option>
              <option value="매우 나쁨">매우 나쁨</option>
            </select>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">건강 목표</label>
            <select 
              name="healthGoal" 
              value={form.healthGoal} 
              onChange={handleChange} 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">선택</option>
              <option value="체중 감량">체중 감량</option>
              <option value="근육 증가">근육 증가</option>
              <option value="에너지 향상">에너지 향상</option>
              <option value="면역력 강화">면역력 강화</option>
              <option value="종합 관리">종합 관리</option>
            </select>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">알레르기 정보</label>
            <input 
              type="text" 
              name="allergies" 
              value={form.allergies} 
              onChange={handleChange} 
              placeholder="예: 견과류, 해산물 등" 
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* 제출 버튼 */}
        <button onClick={handleSubmit} className="w-full mt-8 bg-blue-600 text-white font-semibold py-3 rounded hover:bg-blue-700 transition">
          회원가입 완료
        </button>

        <div id="recaptcha-container" />
      </div>
    </main>
  )
}
