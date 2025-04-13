'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Cart from './Cart'
import { Product } from '@/lib/products'
import { useRouter } from 'next/navigation'

interface CartItem {
  product: {
    id: string;
    name: string;
    description: string;
    category: string;
    pricePerUnit: number;
    tags: string[];
    dailyDosage: number;
    dosageSchedule: {
      time: "아침" | "점심" | "저녁" | "취침전";
      amount: number;
    }[];
    monthlyPrice: number;
  }
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const router = useRouter()

  // 장바구니 이벤트 리스너
  useEffect(() => {
    const handleAddToCart = (event: CustomEvent) => {
      const product = event.detail;
      setCartItems(prev => {
        // 이미 장바구니에 있는 상품인지 확인
        const existingItem = prev.find(item => item.product.name === product.name);
        if (existingItem) {
          return prev; // 이미 있으면 추가하지 않음
        }
        return [...prev, { product }]; // 없으면 새로 추가
      });
      setIsCartOpen(true); // 장바구니 자동으로 열기
    };

    // 중복 체크 이벤트 리스너
    const handleCheckDuplicate = (e: CustomEvent) => {
      const { name } = e.detail;
      const isDuplicate = cartItems.some(item => item.product.name === name);
      
      // 중복 체크 결과 응답
      window.dispatchEvent(new CustomEvent('healthSubscriptionResponse', {
        detail: { isDuplicate }
      }));
    };

    window.addEventListener('addToHealthSubscription', handleAddToCart as EventListener);
    window.addEventListener('checkHealthSubscription', handleCheckDuplicate as EventListener);

    return () => {
      window.removeEventListener('addToHealthSubscription', handleAddToCart as EventListener);
      window.removeEventListener('checkHealthSubscription', handleCheckDuplicate as EventListener);
    };
  }, [cartItems]);

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  // 현재 경로가 제외할 페이지인지 확인
  const isExcludedPage = ['/', '/login', '/signup', '/mypage', '/intro'].includes(pathname)

  return (
    <>
      {children}
      
      {/* 건강구독함 슬라이딩 창과 토글 버튼을 하나의 컨테이너로 감싸기 */}
      {!isExcludedPage && (
        <div className={`fixed top-0 right-0 h-full transform transition-transform duration-300 ease-in-out ${
          isCartOpen ? 'translate-x-0' : 'translate-x-[384px]'
        } z-50 flex`}>
          {/* 토글 버튼 */}
          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="absolute -left-12 top-1/2 -translate-y-1/2 bg-gradient-to-b from-blue-500 to-blue-600 text-white w-12 h-40 rounded-l-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex flex-col items-center justify-center gap-3"
          >
            <div className="writing-mode-vertical text-base font-medium tracking-wider">
              건강구독함
            </div>
            {cartItems.length > 0 && (
              <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                {cartItems.length}
              </div>
            )}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`w-5 h-5 transform transition-transform duration-300 ${isCartOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 건강구독함 패널 */}
          <div className="w-96 bg-white shadow-xl h-full overflow-y-auto relative">
            {/* 특별 할인 배지 - 최상단으로 이동 */}
            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs px-3 py-1.5 rounded-full animate-bounce shadow-lg font-semibold z-10">
              🎉 특별 할인 진행중!
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">건강구독함</h2>
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">건강구독함이 비어있습니다</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {cartItems.map(item => (
                      <div key={item.product.id} className="flex items-center justify-between p-4 border-b">
                        <div>
                          <h3 className="font-medium">{item.product.name}</h3>
                          <p className="text-sm text-gray-500">{item.product.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-semibold">{(item.product.pricePerUnit * 30).toLocaleString()}원/월</p>
                            <p className="text-sm text-gray-500">구독중</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">총 구독 금액</span>
                      <div className="text-right">
                        <p className="text-lg text-gray-500 line-through mb-1">
                          {cartItems.reduce((sum, item) => sum + (item.product.pricePerUnit * 30), 0).toLocaleString()}원/월
                        </p>
                        <p className="text-2xl font-bold text-red-500">
                          {Math.floor(cartItems.reduce((sum, item) => sum + (item.product.pricePerUnit * 30), 0) * 0.85).toLocaleString()}원/월
                        </p>
                        <p className="text-sm text-red-500 font-medium">15% 할인 적용</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/subscription')}
                      disabled={cartItems.length === 0}
                      className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] duration-300 relative overflow-hidden group ${
                        cartItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="absolute inset-0 bg-white/20 transform -skew-x-45 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                      <div className="relative">
                        <p className="text-lg font-bold mb-1">지금 구독하면 15% 할인</p>
                        <p className="text-sm opacity-90">할인된 가격으로 시작하세요!</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .writing-mode-vertical {
          writing-mode: vertical-rl;
          text-orientation: upright;
        }
      `}</style>
    </>
  )
} 