'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { cacheUtils } from '@/hooks/useData';
import { useAuth } from './auth-context';

// 로딩 상태 타입
type LoadingState = {
  global: boolean;
  dashboard: boolean;
  profile: boolean;
  chat: boolean;
  subscription: boolean;
};

// 알림 타입
type Notification = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  autoDismiss?: boolean;
  dismissAfter?: number;
};

// 앱 전역 상태 타입
type AppContextType = {
  // 로딩 상태
  loading: LoadingState;
  setLoading: (key: keyof LoadingState, value: boolean) => void;
  startLoading: (key: keyof LoadingState) => void;
  endLoading: (key: keyof LoadingState) => void;
  
  // 페이지 전환 효과
  pageTransition: 'fade' | 'slide' | 'zoom';
  setPageTransition: (value: 'fade' | 'slide' | 'zoom') => void;
  
  // 알림
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // 네트워크 상태
  isOnline: boolean;
  
  // 캐시 컨트롤
  clearCacheFor: (pattern: RegExp) => void;
  clearAllCache: () => void;
  
  // 사용자 설정
  userPreferences: {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    animationsEnabled: boolean;
  };
  updateUserPreference: <K extends keyof AppContextType['userPreferences']>(
    key: K, 
    value: AppContextType['userPreferences'][K]
  ) => void;
};

// 앱 Context 생성
const AppContext = createContext<AppContextType | null>(null);

// Context Provider 컴포넌트
export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // 로딩 상태
  const [loading, setLoadingState] = useState<LoadingState>({
    global: false,
    dashboard: false,
    profile: false,
    chat: false,
    subscription: false,
  });
  
  // 페이지 전환 효과
  const [pageTransition, setPageTransition] = useState<'fade' | 'slide' | 'zoom'>('fade');
  
  // 알림
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // 온라인 상태
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  // 사용자 설정
  const [userPreferences, setUserPreferences] = useState({
    theme: 'light' as 'light' | 'dark' | 'system',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    animationsEnabled: true,
  });
  
  // 로딩 상태 변경 함수
  const setLoading = (key: keyof LoadingState, value: boolean) => {
    setLoadingState(prev => ({ ...prev, [key]: value }));
  };
  
  const startLoading = (key: keyof LoadingState) => setLoading(key, true);
  const endLoading = (key: keyof LoadingState) => setLoading(key, false);
  
  // 알림 추가 함수
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    const newNotification = { ...notification, id };
    
    // 중복 알림 체크 (동일한 메시지의 알림이 이미 있는지 확인)
    setNotifications(prev => {
      // 동일한 메시지가 이미 존재하는지 확인
      const isDuplicate = prev.some(item => 
        item.message === notification.message && 
        item.type === notification.type
      );
      
      // 중복이면 그대로 반환
      if (isDuplicate) {
        return prev;
      }
      
      // 새 알림 추가
      const updated = [...prev, newNotification];
      
      // 알림이 너무 많으면 오래된 것부터 제거
      if (updated.length > 5) {
        return updated.slice(-5);
      }
      
      return updated;
    });
    
    // 자동 제거 설정이 있으면 타이머 설정
    if (notification.autoDismiss) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.dismissAfter || 5000);
    }
    
    return id;
  }, []);
  
  // 알림 제거 함수
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  // 모든 알림 제거
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  // 캐시 제어 함수
  const clearCacheFor = (pattern: RegExp) => {
    cacheUtils.invalidatePattern(pattern);
  };
  
  const clearAllCache = () => {
    cacheUtils.clear();
  };
  
  // 사용자 설정 업데이트
  const updateUserPreference = <K extends keyof typeof userPreferences>(
    key: K, 
    value: typeof userPreferences[K]
  ) => {
    setUserPreferences(prev => {
      const newPreferences = { ...prev, [key]: value };
      
      // 로컬 스토리지에 설정 저장
      try {
        localStorage.setItem('userPreferences', JSON.stringify(newPreferences));
      } catch (e) {
        console.error('로컬 스토리지 저장 실패:', e);
      }
      
      return newPreferences;
    });
  };
  
  // 온라인 상태 감지
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // 로컬 스토리지에서 사용자 설정 복원
  useEffect(() => {
    try {
      const storedPreferences = localStorage.getItem('userPreferences');
      if (storedPreferences) {
        setUserPreferences(JSON.parse(storedPreferences));
      }
    } catch (e) {
      console.error('설정 복원 실패:', e);
    }
  }, []);
  
  // 사용자 변경 시 캐시 초기화
  useEffect(() => {
    if (user) {
      // 사용자별 캐시 키 패턴 (예: users/USER_ID/*)
      const userCachePattern = new RegExp(`^users/${user.uid}/`);
      clearCacheFor(userCachePattern);
    }
  }, [user?.uid]);
  
  const value: AppContextType = {
    loading,
    setLoading,
    startLoading,
    endLoading,
    pageTransition,
    setPageTransition,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    isOnline,
    clearCacheFor,
    clearAllCache,
    userPreferences,
    updateUserPreference,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// 훅 형태로 Context 사용
export function useApp() {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  
  return context;
} 