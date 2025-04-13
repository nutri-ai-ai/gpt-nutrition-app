'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { IoMdArrowBack, IoMdClose } from 'react-icons/io'
import { Product } from '@/lib/products'

interface CartItem {
  product: Product
  quantity: number
}

interface CartProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onRemove: (productId: string) => void
}

const CartItem = ({ item, onRemove }: { item: CartItem; onRemove: () => void }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
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
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <IoMdClose className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

const Cart = ({ isOpen, onClose, items, onRemove }: CartProps) => {
  const router = useRouter()
  const total = items.reduce((sum, item) => sum + (item.product.pricePerUnit * 30), 0)

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">건강구독함</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <IoMdArrowBack className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">건강구독함이 비어있습니다</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {items.map(item => (
                <CartItem
                  key={item.product.id}
                  item={item}
                  onRemove={() => onRemove(item.product.id)}
                />
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">총 구독 금액</span>
                <span className="text-xl font-bold text-blue-600">
                  {total.toLocaleString()}원/월
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
    </motion.div>
  )
}

export default Cart 