'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

// 데이터 캐싱 시스템
type CacheEntry = {
  data: any;
  timestamp: number;
  expiry: number;
};

const cache: Record<string, CacheEntry> = {};
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5분

/**
 * 데이터 요청 및 캐싱을 관리하는 훅
 * @param key 캐시 키
 * @param fetcher 데이터 요청 함수
 * @param options 캐싱 옵션
 */
export function useData<T>(
  key: string | null, 
  fetcher: () => Promise<T>, 
  options: { 
    cacheTime?: number; 
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { cacheTime = DEFAULT_CACHE_TIME, enabled = true, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 키가 없거나 비활성화된 경우 요청하지 않음
    if (!key || !enabled) return;

    const loadData = async () => {
      // 캐시 확인
      const cachedData = cache[key];
      const now = Date.now();
      
      // 유효한 캐시가 있으면 사용
      if (cachedData && now < cachedData.expiry) {
        setData(cachedData.data);
        onSuccess?.(cachedData.data);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 데이터 요청
        const result = await fetcher();
        
        // 캐시 저장
        cache[key] = {
          data: result,
          timestamp: now,
          expiry: now + cacheTime
        };
        
        setData(result);
        setIsLoading(false);
        onSuccess?.(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
        onError?.(err instanceof Error ? err : new Error('Unknown error'));
      }
    };

    loadData();
  }, [key, enabled, cacheTime, onSuccess, onError]);

  // 재요청 함수
  const refetch = async () => {
    if (!key) return;
    
    setIsLoading(true);
    try {
      const result = await fetcher();
      cache[key] = {
        data: result,
        timestamp: Date.now(),
        expiry: Date.now() + cacheTime
      };
      setData(result);
      setIsLoading(false);
      onSuccess?.(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsLoading(false);
      onError?.(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  };

  return { data, isLoading, error, refetch };
}

/**
 * Firebase 문서 데이터를 가져오는 훅
 */
export function useFirestoreDoc(path: string | null, docId: string | null, options = {}) {
  return useData(
    path && docId ? `${path}/${docId}` : null,
    async () => {
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      const docRef = doc(db, path as string, docId as string);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document does not exist');
      }
      
      return { id: docSnap.id, ...docSnap.data() };
    },
    options
  );
}

/**
 * 사용자 프로필 데이터를 가져오는 훅
 */
export function useUserProfile(userId: string | null, options = {}) {
  return useFirestoreDoc('users', userId, options);
}

/**
 * 사용자 이름으로 프로필을 가져오는 훅
 */
export function useUserProfileByUsername(username: string | null, options = {}) {
  return useData(
    username ? `users/by-username/${username}` : null,
    async () => {
      if (!username) throw new Error('Username is required');
      
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('User not found');
      }
      
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    },
    options
  );
}

/**
 * 캐시를 직접 제어하는 유틸리티 함수들
 */
export const cacheUtils = {
  // 특정 키의 캐시 무효화
  invalidate: (key: string) => {
    delete cache[key];
  },
  
  // 특정 패턴의 캐시 모두 무효화
  invalidatePattern: (pattern: RegExp) => {
    Object.keys(cache).forEach(key => {
      if (pattern.test(key)) {
        delete cache[key];
      }
    });
  },
  
  // 전체 캐시 초기화
  clear: () => {
    Object.keys(cache).forEach(key => delete cache[key]);
  }
}; 