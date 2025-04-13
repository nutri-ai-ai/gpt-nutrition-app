import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export async function POST(req: Request) {
  try {
    const { userId, email, userAgent, ipAddress } = await req.json()

    // 로그인 로그 저장
    const loginLogsRef = collection(db, 'loginLogs')
    await addDoc(loginLogsRef, {
      userId,
      email,
      ipAddress,
      userAgent,
      deviceInfo: {
        browser: userAgent.split(' ')[11], // 브라우저 정보
        os: userAgent.split(' ')[2], // OS 정보
      },
      timestamp: serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('로그인 로그 저장 실패:', error)
    return NextResponse.json({ error: '로그인 로그 저장 실패' }, { status: 500 })
  }
} 