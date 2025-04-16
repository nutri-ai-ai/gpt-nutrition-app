'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { getFunctions, Functions } from 'firebase/functions';

// 기본 Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCPdMSVdE63XrdmlPmnnXvNEAJNoG9-4D0',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'nutri-ai-e56a8.firebaseapp.com',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://nutri-ai-e56a8-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'nutri-ai-e56a8',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'nutri-ai-e56a8.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '115886841795',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:115886841795:web:fea22da28fe41c10532776',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-8FEH56ZR4R'
};

// Firebase 초기화 함수
const initFirebase = (): FirebaseApp | null => {
  if (typeof window !== 'undefined') {
    try {
      if (getApps().length === 0) {
        return initializeApp(firebaseConfig);
      } else {
        return getApps()[0];
      }
    } catch (error) {
      console.error('Firebase 초기화 중 오류 발생:', error);
      return null;
    }
  }
  return null;
};

// 클라이언트 사이드에서만 Firebase 초기화
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let functions: Functions | null = null;
let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  app = initFirebase();
  
  if (app) {
    try {
      db = getFirestore(app);
      auth = getAuth(app);
      functions = getFunctions(app);
      
      // 브라우저 환경에서만 Analytics 초기화
      if (typeof window !== 'undefined') {
        analytics = getAnalytics(app);
      }
    } catch (error) {
      console.error('Firebase 서비스 초기화 중 오류 발생:', error);
    }
  }
}

// 기본 내보내기 (db와 auth가 null일 수 있음을 처리하는 래퍼 함수들)
export { db, auth, analytics, functions };