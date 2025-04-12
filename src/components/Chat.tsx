import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: number
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
  supplements?: {
    name: string
    dailyDosage: string | number  // string 또는 number 타입 허용
    reason: string
    benefits: string[]
    precautions: string[]
  }[]
}

interface UserInfo {
  id: string
  name: string
  email: string
  height?: number
  weight?: number
  gender?: string
  exerciseFrequency?: string
  sleepQuality?: string
  healthGoal?: string
  allergies?: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('chatMessages')
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages)
        return parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          supplements: msg.supplements ? msg.supplements.map((supp: any) => ({
            name: supp.name,
            dailyDosage: supp.dailyDosage || 0,
            reason: supp.reason,
            benefits: Array.isArray(supp.benefits) ? supp.benefits : [],
            precautions: Array.isArray(supp.precautions) ? supp.precautions : []
          })) : undefined
        }))
      }
    }
    return []
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  const handleClearChat = () => {
    setMessages([])
    localStorage.removeItem('chatMessages')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input || typeof input !== 'string' || !input.trim()) return

    const userMessage: Message = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          userInfo: userInfo,
          conversation: messages
        }),
      })

      const data = await response.json()
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: data.reply,
        sender: 'ai',
        timestamp: new Date(),
        supplements: data.supplements ? data.supplements.map((supp: any) => ({
          ...supp,
          benefits: Array.isArray(supp.benefits) ? supp.benefits : [],
          precautions: Array.isArray(supp.precautions) ? supp.precautions : []
        })) : undefined
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const renderSupplementInfo = (supplements: Message['supplements']) => {
    if (!supplements || supplements.length === 0) return null

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">추천 영양제 정보</h3>
        {supplements.map((supplement, index) => {
          // 문자열이나 숫자를 숫자로 변환하고, NaN이나 undefined인 경우 0으로 처리
          const dailyDosage = Number(supplement.dailyDosage) || 0
          const pricePerPill = 600 // 알당 가격
          const daysInMonth = 30
          const monthlyCost = Math.floor(dailyDosage * pricePerPill * daysInMonth)

          return (
            <div key={index} className="mb-4 last:mb-0">
              <div className="font-medium text-blue-600">{supplement.name}</div>
              <div className="text-sm text-gray-600">
                <p>하루 섭취량: {dailyDosage}알</p>
                <p>추천 이유: {supplement.reason}</p>
                <p>주요 효과: {supplement.benefits.join(', ')}</p>
                <p>주의사항: {supplement.precautions.join(', ')}</p>
                <p className="mt-2 font-medium">
                  월 예상 비용: 하루 {dailyDosage}알 x {pricePerPill.toLocaleString()}원 = 월 {monthlyCost.toLocaleString()}원
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {message.text}
              {message.sender === 'ai' && message.supplements && renderSupplementInfo(message.supplements)}
            </div>
          </motion.div>
        ))}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex justify-start"
            >
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            전송
          </button>
        </div>
      </form>
    </div>
  )
} 