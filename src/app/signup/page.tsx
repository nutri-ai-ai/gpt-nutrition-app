'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import {
  PhoneAuthProvider,
  signInWithCredential,
  signInWithPhoneNumber
} from 'firebase/auth'

export default function SignupPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    username: '', // 이 값이 Firestore의 문서 ID로 사용됨 (즉, 로그인 시 ID)
    password: '',
    email: '',
    phone: ['', '', ''],  // 전화번호를 3개의 칸으로 나누어 저장
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
    supplements: '',        // 영양제 섭취 여부
    medicalHistory: '',     // 기타 질병 이력
  })

  const [isLoading, setIsLoading] = useState(false)
  const [verificationId, setVerificationId] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, index?: number) => {
    const { name, value } = e.target

    // 전화번호를 3개의 칸으로 나누어 입력 처리
    if (name === "phone") {
      const updatedPhone = [...form.phone];
      updatedPhone[index!] = value.replace(/[^0-9]/g, '');  // 숫자만 입력 가능
      setForm(prev => ({ ...prev, phone: updatedPhone }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }

  const sendOTP = async () => {
    try {
      setIsLoading(true)
      const appVerifier = (window as any).recaptchaVerifier
      const phoneNumber = `+82${form.phone.join('')}`;  // 한국 번호는 자동으로 +82를 붙여서 처리
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier)
      setVerificationId(confirmation.verificationId)
    } catch (err) {
      console.error(err)
      alert('인증번호 전송 실패')
    } finally {
      setIsLoading(false)
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
    }
  }

  const checkDuplicate = async () => {
    const userRef = collection(db, 'users')
    const q1 = query(userRef, where('username', '==', form.username))
    const q2 = query(userRef, where('email', '==', form.email))
    const snapshot1 = await getDocs(q1)
    const snapshot2 = await getDocs(q2)

    if (!snapshot1.empty) {
      alert('이미 사용 중인 아이디입니다.')
      return false
    }
    if (!snapshot2.empty) {
      alert('이미 사용 중인 이메일입니다.')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!form.name || !form.username || !form.phone || !form.verified) {
      alert('이름, 아이디, 휴대폰 및 휴대폰 인증은 필수입니다!')
      return
    }

    const isNotDuplicate = await checkDuplicate()
    if (!isNotDuplicate) return

    try {
      const phoneWithCountryCode = `+82${form.phone.join('')}`  // +82를 자동으로 추가
      const uid = form.username
      await setDoc(doc(db, 'users', uid), { ...form, phone: phoneWithCountryCode })
      alert('회원가입 완료! ✅')
      router.push(`/`)
    } catch (err) {
      console.error(err)
      alert('회원가입 실패')
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

          {/* 아이디, 비밀번호, 이메일, 전화번호 */}
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
            <div className="flex gap-2 w-2/3">
              <input
                type="tel"
                name="phone"
                value={form.phone[0]}
                onChange={(e) => handleChange(e, 0)}
                className="w-1/3 px-3 py-2 border border-gray-300 rounded-md"
                maxLength={3}
                placeholder="010"
              />
              <span>-</span>
              <input
                type="tel"
                name="phone"
                value={form.phone[1]}
                onChange={(e) => handleChange(e, 1)}
                className="w-1/3 px-3 py-2 border border-gray-300 rounded-md"
                maxLength={4}
                placeholder="1111"
              />
              <span>-</span>
              <input
                type="tel"
                name="phone"
                value={form.phone[2]}
                onChange={(e) => handleChange(e, 2)}
                className="w-1/3 px-3 py-2 border border-gray-300 rounded-md"
                maxLength={4}
                placeholder="2222"
              />
            </div>
          </div>
          <button
            onClick={sendOTP}
            disabled={isLoading}
            className={`w-full ${isLoading ? 'bg-gray-400' : 'bg-blue-500'} text-white py-2 rounded`}
          >
            {isLoading ? '인증번호 전송 중...' : '인증번호 받기'}
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

          {/* 생년월일, 성별, 키, 몸무게 */}
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

          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">영양제 섭취 여부</label>
            <input
              type="text"
              name="supplements"
              value={form.supplements}
              onChange={handleChange}
              placeholder="예: 오메가3, 비타민C 등"
              className="w-2/3 px-3 py-2 border border-gray-300 rounded-md"
            />
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
              <option value="종합 관리">종합 관리</option>
              <option value="근육 증가">근육 증가</option>
              <option value="에너지 향상">에너지 향상</option>
              <option value="면역력 강화">면역력 강화</option>
              <option value="체중 감량">체중 감량</option>
              <option value="성장기 키성장">성장기 키성장</option>
              <option value="피부개선">피부개선</option>
              <option value="갱년기">갱년기</option>
              <option value="피로감 개선">피로감 개선</option>
              <option value="뇌건강 관리">뇌건강 관리</option>
            </select>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 w-1/3">기타 질병 이력</label>
            <input
              type="text"
              name="medicalHistory"
              value={form.medicalHistory}
              onChange={handleChange}
              placeholder="예: 당뇨, 고혈압 등"
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
