'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { IoMdArrowBack } from 'react-icons/io'
import Cart from '@/components/Cart'
import { Product } from '@/lib/products'

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  checkIsDuplicate: (productId: string) => boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default function CartProvider({
  children,
}: {
  children: ReactNode
}) {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cart_items');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  })

  useEffect(() => {
    localStorage.setItem('cart_items', JSON.stringify(cartItems));
  }, [cartItems]);

  // 장바구니 이벤트 리스너
  useEffect(() => {
    const handleAddToCart = (event: CustomEvent<Product>) => {
      addToCart(event.detail)
      // 자동으로 열리는 기능 제거
      // setIsCartOpen(true) 
    }

    // 중복 확인 이벤트 핸들러 추가
    const handleCheckDuplicate = (event: CustomEvent<{name: string}>) => {
      const isDuplicate = cartItems.some(item => item.product.name === event.detail.name);
      
      // 결과 반환을 위한 커스텀 이벤트 생성
      const responseEvent = new CustomEvent('healthSubscriptionResponse', {
        detail: { isDuplicate }
      });
      
      window.dispatchEvent(responseEvent);
    }

    window.addEventListener('addToHealthSubscription', handleAddToCart as EventListener);
    window.addEventListener('checkHealthSubscription', handleCheckDuplicate as EventListener);
    
    return () => {
      window.removeEventListener('addToHealthSubscription', handleAddToCart as EventListener);
      window.removeEventListener('checkHealthSubscription', handleCheckDuplicate as EventListener);
    }
  }, [cartItems]);

  const addToCart = (product: Product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { product, quantity: 1 }];
    })
  }

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId))
  }
  
  const checkIsDuplicate = (productId: string) => {
    return cartItems.some(item => item.product.id === productId);
  }

  // 현재 경로가 제외할 페이지인지 확인
  const isExcludedPage = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      // signup-v2 관련 경로 추가
      return [
        '/login', 
        '/signup', 
        '/mypage',
        '/signup-v2',
        '/signup-v2/email',
        '/signup-v2/intro',
        '/signup-v2/survey',
        '/signup-v2/account'
      ].some(excludedPath => path.startsWith(excludedPath))
    }
    return false
  }

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      isCartOpen,
      setIsCartOpen,
      checkIsDuplicate
    }}>
      {children}
      
      {/* 장바구니 슬라이딩 창 */}
      {!isExcludedPage() && (
        <div
          className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
            isCartOpen ? 'translate-x-0' : 'translate-x-full'
          } z-50`}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">건강구독함</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <IoMdArrowBack className="w-6 h-6 text-gray-600" />
              </button>
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
                    onClick={() => window.location.href = '/subscription'}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    구독하기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 건강구독함 토글 버튼 */}
      {!isExcludedPage() && (
        <button
          onClick={() => setIsCartOpen(!isCartOpen)}
          className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-l-lg shadow-lg hover:bg-blue-700 transition-colors"
        >
          <div className="writing-mode-vertical-rl text-lg font-medium py-4">
            건강구독함 {cartItems.length > 0 && `(${cartItems.length})`}
          </div>
        </button>
      )}
    </CartContext.Provider>
  )
} 