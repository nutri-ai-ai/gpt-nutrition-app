'use client' // 이 파일이 클라이언트 컴포넌트임을 명시

import { useEffect } from 'react'

export default function CheckDOMPage() {
  useEffect(() => {
    // 브라우저 환경(클라이언트)에서만 DOM 조작
    if (typeof window === 'undefined') return

    const container = document.getElementById('my-container')

    if (container) {
      console.log('my-container 요소가 이미 DOM에 존재합니다!')
    } else {
      console.log('my-container 요소가 DOM에 없습니다!')
    }
  }, [])

  return (
    <main>
      <h1>DOM 확인 예시(App Router)</h1>
      <div id="my-container">Hello from DOM!</div>
    </main>
  )
}