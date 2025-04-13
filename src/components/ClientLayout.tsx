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

  // 제외할 페이지 목록
  const excludedPages = [
    '/', 
    '/login', 
    '/signup',
    '/signup-v2',
    '/intro'
  ]

  // 현재 경로가 제외 페이지에 포함되는지 확인
  const shouldHideCart = excludedPages.some(page => pathname?.startsWith(page))

  // 장바구니 이벤트 리스너
  useEffect(() => {
    const handleAddToCart = (event: CustomEvent) => {
      const product = event.detail;
      setCartItems(prev => {
        const existingItem = prev.find(item => item.product.name === product.name);
        if (existingItem) {
          return prev;
        }
        return [...prev, { product }];
      });
      setIsCartOpen(true);
    };

    const handleCheckDuplicate = (e: CustomEvent) => {
      const { name } = e.detail;
      const isDuplicate = cartItems.some(item => item.product.name === name);
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

  return (
    <>
      {children}
      
      {/* 제외된 페이지가 아닐 때만 건강구독함 표시 */}
      {!shouldHideCart && (
        <div className={`fixed top-0 right-0 h-full transform transition-transform duration-300 ease-in-out ${
          isCartOpen ? 'translate-x-0' : 'translate-x-[384px]'
        } z-50 flex`}>
          {/* 토글 버튼 */}
          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="absolute -left-10 top-1/2 -translate-y-1/2 bg-gradient-to-b from-blue-500 to-blue-600 text-white w-10 h-32 rounded-l-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex flex-col items-center justify-center gap-2"
          >
            <div className="writing-mode-vertical text-sm font-medium tracking-wider">
              건강구독함
            </div>
            {cartItems.length > 0 && (
              <div className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {cartItems.length}
              </div>
            )}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`w-4 h-4 transform transition-transform duration-300 ${isCartOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 건강구독함 패널 */}
          <div className="w-96 bg-white shadow-xl h-full overflow-y-auto">
            {/* 특별 할인 배지 */}
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

                  <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">총 구독 금액</span>
                      <span className="text-xl font-bold text-blue-600">
                        {cartItems.reduce((sum, item) => sum + (item.product.pricePerUnit * 30), 0).toLocaleString()}원/월
                      </span>
                    </div>
                    <button
                      onClick={() => router.push('/subscription')}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      구독하기
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