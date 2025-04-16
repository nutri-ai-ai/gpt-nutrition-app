'use client';

import React, { useEffect, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/app-context';
import { IoMdClose } from 'react-icons/io';
import { 
  IoCheckmarkCircle, 
  IoWarning, 
  IoInformationCircle, 
  IoAlertCircle 
} from 'react-icons/io5';

export default function NotificationContainer() {
  const { notifications, removeNotification } = useApp();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
            onDismiss={() => removeNotification(notification.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

const NotificationItem = memo(function NotificationItemInner({ 
  notification, 
  onDismiss 
}: { 
  notification: { id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string; }; 
  onDismiss: () => void;
}) {
  const [isHovering, setIsHovering] = useState(false);

  // mouseEnter, mouseLeave 핸들러를 메모이제이션하여 렌더링마다 새로 생성되지 않도록 함
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  // 알림 타입에 따른 스타일과 아이콘
  const typeStyles = {
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-400',
      textColor: 'text-blue-800',
      icon: <IoInformationCircle className="text-blue-500 text-xl" />
    },
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-400',
      textColor: 'text-green-800',
      icon: <IoCheckmarkCircle className="text-green-500 text-xl" />
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
      textColor: 'text-yellow-800',
      icon: <IoWarning className="text-yellow-500 text-xl" />
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      textColor: 'text-red-800',
      icon: <IoAlertCircle className="text-red-500 text-xl" />
    }
  };

  const style = typeStyles[notification.type];

  // 애니메이션 설정
  const variants = {
    initial: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95 
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.3 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { 
        duration: 0.2 
      }
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      className={`${style.bgColor} ${style.borderColor} border rounded-lg shadow-lg p-4 min-w-[300px]`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex gap-3 items-start">
        <div className="mt-1">
          {style.icon}
        </div>
        <div className="flex-1">
          <p className={`${style.textColor} text-sm`}>{notification.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className={`${style.textColor} hover:bg-white/30 rounded-full p-1 transition-colors`}
          aria-label="알림 닫기"
        >
          <IoMdClose />
        </button>
      </div>
    </motion.div>
  );
}); 