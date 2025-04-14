'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Cart from './Cart'
import { Product } from '@/lib/products'
import { useRouter } from 'next/navigation'

// 추천 제품 정보 인터페이스 개선
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
      withMeal?: boolean;
      reason?: string;
    }[];
    monthlyPrice: number;
    benefits?: string[];
    precautions?: string[];
    reason?: string;
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

  // 제외할 페이지 목록 (최상위 경로)
  const excludedTopLevelPaths = [
    '/', 
    '/login/', 
    '/signup',
    '/intro'
  ]
  
  // 전체 경로가 제외되어야 하는 경로 패턴
  const excludedPathPatterns = [
    '/signup-v2'
  ]
  
  // 현재 경로가 제외 페이지에 포함되는지 확인
  const shouldHideCart = (
    // 정확히 일치하는 최상위 경로 확인
    excludedTopLevelPaths.some(page => pathname === page) || 
    // 경로 패턴으로 시작하는 모든 페이지 확인
    excludedPathPatterns.some(pattern => pathname?.startsWith(pattern))
  )
  
  // 디버깅용 코드
  useEffect(() => {
    console.log('[ClientLayout] 현재 경로:', pathname);
    console.log('[ClientLayout] 건강구독함 표시 여부:', !shouldHideCart);
  }, [pathname, shouldHideCart]);

  // 장바구니 이벤트 리스너
  useEffect(() => {
    const handleAddToCart = (event: CustomEvent) => {
      const product = event.detail;
      
      // 콘솔에 수신된 제품 정보 출력 (디버깅용)
      console.log("건강구독함에 추가된 제품:", product);
      
      setCartItems(prev => {
        // 같은 이름의 제품이 이미 있는지 확인
        const existingItem = prev.find(item => item.product.name === product.name);
        if (existingItem) {
          return prev;
        }
        const newItems = [...prev, { product }];
        
        // 글로벌 객체에 건강구독함 데이터 저장 (구독 페이지와 공유)
        if (typeof window !== 'undefined') {
          (window as any).__healthCart = newItems;
          // 이벤트 발생 (구독 페이지에서 감지할 수 있도록)
          window.dispatchEvent(new CustomEvent('healthCartUpdated'));
        }
        
        return newItems;
      });
      
      setIsCartOpen(true);
    };

    // 초기화: 페이지 로드 시 글로벌 객체에 건강구독함 데이터 설정
    if (typeof window !== 'undefined') {
      (window as any).__healthCart = cartItems;
    }

    const handleCheckDuplicate = (e: CustomEvent) => {
      const { name } = e.detail;
      const isDuplicate = cartItems.some(item => item.product.name === name);
      
      window.dispatchEvent(new CustomEvent('healthSubscriptionResponse', {
        detail: { isDuplicate }
      }));
    };

    // 채팅 페이지의 추천 제품 추가 이벤트 리스너
    const handleChatRecommendation = (e: CustomEvent) => {
      const recommendation = e.detail;
      
      // 필요한 속성이 있는지 확인
      if (!recommendation || !recommendation.name) {
        console.error("유효하지 않은 추천 정보:", recommendation);
        return;
      }
      
      // CartItem 형식으로 변환
      const cartProduct = {
        id: recommendation.id || `rec-${Date.now()}`,
        name: recommendation.name,
        description: recommendation.description || "AI 추천 영양제",
        category: recommendation.category || "영양",
        pricePerUnit: recommendation.pricePerUnit || 0,
        tags: recommendation.tags || [],
        dailyDosage: recommendation.dailyDosage || 1,
        dosageSchedule: recommendation.dosageSchedule || [],
        monthlyPrice: recommendation.monthlyPrice || (recommendation.pricePerUnit * 30),
        benefits: recommendation.benefits || [],
        precautions: recommendation.precautions || [],
        reason: recommendation.reason || "AI 맞춤 추천 영양제"
      };
      
      setCartItems(prev => {
        const existingItem = prev.find(item => item.product.name === cartProduct.name);
        if (existingItem) {
          return prev;
        }
        const newItems = [...prev, { product: cartProduct }];
        
        // 글로벌 객체에 건강구독함 데이터 저장 (구독 페이지와 공유)
        if (typeof window !== 'undefined') {
          (window as any).__healthCart = newItems;
          // 이벤트 발생 (구독 페이지에서 감지할 수 있도록)
          window.dispatchEvent(new CustomEvent('healthCartUpdated'));
        }
        
        return newItems;
      });
      
      setIsCartOpen(true);
    };

    window.addEventListener('addToHealthSubscription', handleAddToCart as EventListener);
    window.addEventListener('checkHealthSubscription', handleCheckDuplicate as EventListener);
    window.addEventListener('chatRecommendation', handleChatRecommendation as EventListener);

    return () => {
      window.removeEventListener('addToHealthSubscription', handleAddToCart as EventListener);
      window.removeEventListener('checkHealthSubscription', handleCheckDuplicate as EventListener);
      window.removeEventListener('chatRecommendation', handleChatRecommendation as EventListener);
    };
  }, [cartItems]);

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => {
      const newItems = prevItems.filter(item => item.product.id !== productId);
      
      // 글로벌 객체에 건강구독함 데이터 저장 (구독 페이지와 공유)
      if (typeof window !== 'undefined') {
        (window as any).__healthCart = newItems;
        // 이벤트 발생 (구독 페이지에서 감지할 수 있도록)
        window.dispatchEvent(new CustomEvent('healthCartUpdated'));
      }
      
      return newItems;
    });
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
                      <div key={item.product.id} className="flex flex-col p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{item.product.name}</h3>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">{item.product.description}</p>
                        {item.product.reason && (
                          <p className="text-xs text-blue-600 mb-2">"{item.product.reason}"</p>
                        )}
                        <div className="mt-2">
                          <div className="flex flex-col gap-1 mt-2 text-xs text-gray-600">
                            <p className="font-medium">복용 정보:</p>
                            {item.product.dosageSchedule.map((schedule, idx) => (
                              <p key={idx}>
                                {schedule.time} {schedule.amount}정 
                                {schedule.withMeal !== undefined && (
                                  <> ({schedule.withMeal ? "식후" : "식전"})</>
                                )}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                          <span className="text-sm text-gray-500">구독 예정</span>
                          <span className="text-lg font-semibold text-blue-600">
                            {(item.product.monthlyPrice || item.product.pricePerUnit * 30 * item.product.dailyDosage).toLocaleString()}원/월
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">총 구독 금액</span>
                      <span className="text-xl font-bold text-blue-600">
                        {cartItems.reduce((sum, item) => {
                          const monthlyPrice = item.product.monthlyPrice || 
                            (item.product.pricePerUnit * 30 * item.product.dailyDosage);
                          return sum + monthlyPrice;
                        }, 0).toLocaleString()}원/월
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