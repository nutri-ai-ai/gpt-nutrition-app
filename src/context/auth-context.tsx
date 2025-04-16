'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as authSignOut, onAuthStateChanged, User as FirebaseUser, updatePassword } from 'firebase/auth';
import { db, auth } from '@/firebase/config';

// 사용자 정보 타입 정의
type UserProfile = {
  uid: string;        // Firebase Auth UID
  username: string;   // 로그인 ID (필수)
  email: string;      // 이메일 (Firebase Auth 필수)
  password?: string;  // 로컬 개발용 (Firebase에서는 저장 안함)
  name?: string;      // 사용자 실명
  phoneNumber?: string; // 사용자 전화번호
  address?: string;   // 주소
  addressDetail?: string; // 상세 주소
  zonecode?: string;  // 우편번호
  surveyData?: {
    gender?: string;
    birthDate?: string;
    height?: number;
    weight?: number;
    diseases?: string[];
    customDisease?: string;
    fatigueLevel?: number;
    sleepQuality?: number;
    digestionLevel?: number;
    immunityLevel?: number;
    skinCondition?: number;
    concentrationLevel?: number;
    stressLevel?: number;
    jointPainLevel?: number;
    weightManagement?: number;
    dietBalance?: number;
  };
  healthGoals?: string[];
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
  signupStep?: string; // 회원가입 단계 추적
  subscription?: {
    status?: string;
    nextBillingDate?: string;
    expiryDate?: string;
  };
};

type AuthContextType = {
  user: UserProfile | null;
  userProfile: UserProfile | null;
  loading: boolean;
  dataLoading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  createAccount: (
    tempId: string,
    email: string,
    username: string, 
    password: string, 
    phoneNumber?: string, 
    addressInfo?: {
      address?: string;
      addressDetail?: string;
      zonecode?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  checkUsername: (username: string) => Promise<boolean>;
  checkEmail: (email: string) => Promise<boolean>;
  checkPhoneNumber: (phoneNumber: string) => Promise<boolean>;
  updateUserSignupData: (data: any) => Promise<void>;
  updateUserProfile: (uid: string, data: any) => Promise<void>;
  getIncompleteSignup: () => Promise<any>;
  clearIncompleteSignup: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  firebaseUser: FirebaseUser | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: false,
  dataLoading: false,
  signIn: async () => ({}),
  signOut: async () => {},
  createAccount: async () => ({ success: false }),
  checkUsername: async () => true,
  checkEmail: async () => true,
  checkPhoneNumber: async () => true,
  updateUserSignupData: async () => {},
  updateUserProfile: async () => {},
  getIncompleteSignup: async () => null,
  clearIncompleteSignup: async () => {},
  refreshUserProfile: async () => {},
  firebaseUser: null,
});

// 로컬 스토리지에 사용자 데이터 저장 함수
const saveUserDataToLocalStorage = (data: any) => {
  try {
    // 기본 인증 정보
    localStorage.setItem('uid', data.uid);
    localStorage.setItem('username', data.username);
    
    // 통합 사용자 데이터 (JSON 형태로 저장)
    const userData = {
      uid: data.uid,
      username: data.username,
      email: data.email || '',
      lastUpdated: Date.now(),
    };
    
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // 개별 필드 (호환성 유지)
    if (data.gender) localStorage.setItem('gender', data.gender);
    if (data.height) localStorage.setItem('height', String(data.height));
    if (data.weight) localStorage.setItem('weight', String(data.weight));
    if (data.birthDate) localStorage.setItem('birthDate', data.birthDate);
    if (data.name) localStorage.setItem('name', data.name);
    if (data.email) localStorage.setItem('email', data.email);
    if (data.healthGoals) localStorage.setItem('healthGoals', JSON.stringify(data.healthGoals));
  } catch (e) {
    console.error('로컬 스토리지 저장 오류:', e);
  }
};

// 로컬 스토리지에서 사용자 데이터 제거 함수
const clearUserDataFromLocalStorage = () => {
  try {
    // 로그아웃 시에만 필요한 데이터 삭제 (인증 관련 데이터는 유지)
    const keysToRemove = [
      'username',
      'userData',
      'gender',
      'height',
      'weight',
      'birthDate',
      'name',
      'healthGoals',
      'signupStep',
      'cart_items',
      'tempId',
      'last_active_time',
      'email_verified',
      'email'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // 로그아웃 시 명시적으로 uid만 삭제
    localStorage.removeItem('uid');
  } catch (e) {
    console.error('로컬 스토리지 제거 오류:', e);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Firebase Auth 상태 변경 감지
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Firebase 인증 상태 변경:', firebaseUser?.email);
      setFirebaseUser(firebaseUser);
      
      // 현재 URL이 signup-v2 경로인지 확인
      const isInSignupFlow = typeof window !== 'undefined' && 
        window.location.pathname.includes('/signup-v2');
      
      if (firebaseUser) {
        // 사용자가 인증되었을 때
        try {
          // 새로운 ID 토큰 가져와서 쿠키 업데이트
          const idToken = await firebaseUser.getIdToken();
          document.cookie = `auth_token=${idToken}; path=/; max-age=${50 * 60}; SameSite=Lax`;
          
          // 회원가입 진행 중인 경우 쿠키 설정 (페이지가 signup-v2 경로인 경우)
          if (isInSignupFlow) {
            document.cookie = 'signup_in_progress=true; path=/; max-age=3600; SameSite=Lax';
          }
          
          // Firestore에서 사용자 정보 가져오기
          if (db) {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              setUser(userData);
              setUserProfile(userData);
              
              // 로컬 스토리지에 사용자 정보 저장
              saveUserDataToLocalStorage({
                ...userData,
                uid: firebaseUser.uid,
                email: firebaseUser.email,
              });
            } else {
              // 사용자 정보가 Firestore에 없는 경우 - 이메일만 가지고 있는 상태
              const basicUser = {
                uid: firebaseUser.uid,
                username: firebaseUser.email?.split('@')[0] || '',
                email: firebaseUser.email || '',
              };
              setUser(basicUser as UserProfile);
            }
          }
        } catch (error) {
          console.error('사용자 데이터 로드 오류:', error);
        }
      } else {
        // 사용자가 로그아웃했을 때
        setUser(null);
        setUserProfile(null);
        
        // 쿠키 삭제
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // 토큰 자동 갱신 메커니즘
  useEffect(() => {
    if (!auth) return;
    
    // 45분마다 토큰 갱신 (토큰 만료 시간보다 약간 짧게)
    const tokenRefreshInterval = 45 * 60 * 1000; // 45분
    let intervalId: NodeJS.Timeout | null = null;
    
    const refreshToken = async () => {
      if (!auth || !auth.currentUser) return;
      
      try {
        // 토큰 갱신 요청
        const newToken = await auth.currentUser.getIdToken(true);
        // 쿠키 업데이트
        document.cookie = `auth_token=${newToken}; path=/; max-age=${50 * 60}; SameSite=Lax`;
        console.log('Firebase 토큰 자동 갱신 완료');
      } catch (error) {
        console.error('토큰 갱신 오류:', error);
      }
    };
    
    if (firebaseUser) {
      // 초기 설정 및 주기적 갱신 시작
      intervalId = setInterval(refreshToken, tokenRefreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [firebaseUser]);

  // 사용자 프로필 데이터 로드 함수
  const loadUserProfile = async (uid: string): Promise<UserProfile | null> => {
    if (!db) return null;
    
    setDataLoading(true);
    try {
      // 캐시 확인
      const cacheKey = `user_profile_${uid}`;
      const cachedProfile = sessionStorage.getItem(cacheKey);
      
      if (cachedProfile) {
        try {
          const parsedProfile = JSON.parse(cachedProfile);
          const cacheTime = parsedProfile._cacheTime || 0;
          
          // 캐시가 10분 이내면 캐시 데이터 사용
          if (Date.now() - cacheTime < 10 * 60 * 1000) {
            setUserProfile(parsedProfile);
            return parsedProfile;
          }
        } catch (e) {
          console.error('캐시 파싱 오류:', e);
          // 캐시 파싱 오류 시 세션 스토리지 정리
          sessionStorage.removeItem(cacheKey);
        }
      }

      // 캐시 없을 경우 Firestore에서 조회
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const profileData = userDoc.data() as UserProfile;
        setUserProfile(profileData);
        
        // 세션 스토리지에 캐싱
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            ...profileData,
            _cacheTime: Date.now()
          }));
        } catch (e) {
          console.error('세션 스토리지 저장 오류:', e);
        }
        
        return profileData;
      } else {
        // uid가 username과 다를 경우(기존 계정) 처리
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const profileData = querySnapshot.docs[0].data() as UserProfile;
          setUserProfile(profileData);
          
          // 세션 스토리지에 캐싱
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              ...profileData,
              _cacheTime: Date.now()
            }));
          } catch (e) {
            console.error('세션 스토리지 저장 오류:', e);
          }
          
          return profileData;
        }
      }
      return null;
    } catch (error) {
      console.error('프로필 데이터 로드 오류:', error);
      return null;
    } finally {
      setDataLoading(false);
    }
  };
  
  // 사용자 프로필 새로고침 함수
  const refreshUserProfile = async (): Promise<void> => {
    if (user?.uid) {
      await loadUserProfile(user.uid);
    }
  };

  // 로그인 함수 - Firebase Auth 사용
  const signIn = async (email: string, password: string): Promise<any> => {
    if (!auth || !db) {
      throw new Error('Firebase가 초기화되지 않았습니다');
    }
    
    try {
      console.log('로그인 시도:', email);
      setLoading(true);
      
      // Firebase Authentication으로 로그인
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Firebase ID 토큰 가져오기
      const idToken = await firebaseUser.getIdToken();
      
      // auth_token 쿠키 설정 (50분 만료, Secure 및 SameSite 속성 추가)
      document.cookie = `auth_token=${idToken}; path=/; max-age=${50 * 60}; SameSite=Lax`;
      
      // Firestore에서 사용자 정보 가져오기
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        
        // 로그인 시간 업데이트
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp()
        });
        
        // 사용자 상태 설정
        setUser(userData);
        setUserProfile(userData);
        
        // 로컬 스토리지에 저장
        saveUserDataToLocalStorage({
          ...userData,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });
        
        return userData;
      } else {
        // Firestore에 사용자 정보가 없는 경우 - 기본 정보만 생성
        const basicUserData = {
          uid: firebaseUser.uid,
          username: email.split('@')[0],
          email: email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        };
        
        await setDoc(userRef, basicUserData);
        
        setUser(basicUserData as UserProfile);
        setUserProfile(basicUserData as UserProfile);
        
        saveUserDataToLocalStorage(basicUserData);
        
        return basicUserData;
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 함수 - Firebase Auth 사용
  const signOut = async (): Promise<void> => {
    if (!auth) return;
    
    try {
      await authSignOut(auth);
      setUser(null);
      setUserProfile(null);
      clearUserDataFromLocalStorage();
      
      // 명시적으로 auth_token 쿠키 삭제
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch (error) {
      console.error('로그아웃 오류:', error);
      throw error;
    }
  };

  // 계정 생성 함수 - Firebase Auth 사용
  const createAccount = async (
    tempId: string,
    email: string,
    username: string, 
    password: string, 
    phoneNumber?: string, 
    addressInfo?: {
      address?: string;
      addressDetail?: string;
      zonecode?: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth || !db) {
      return { 
        success: false, 
        error: 'Firebase가 초기화되지 않았습니다' 
      };
    }
    
    console.log('계정 생성 시작:', { username, tempId });
    setLoading(true);
    try {
      // 임시 Firestore 문서 가져오기
      const tempUserRef = doc(db, 'users', tempId);
      const tempUserSnap = await getDoc(tempUserRef);

      if (!tempUserSnap.exists()) throw new Error('임시 사용자 데이터를 찾을 수 없습니다.');
      const tempUserData = tempUserSnap.data();
      
      if (!tempUserData.email) throw new Error('이메일 정보가 없습니다.');

      // 이메일 인증 단계에서 저장한 Firebase Auth UID 가져오기
      const firebaseAuthUid = localStorage.getItem('firebaseAuthUid');
      
      let firebaseUser;
      
      // Firebase Auth UID가 있으면 해당 계정 사용
      if (firebaseAuthUid) {
        // 기존 임시 계정을 사용하여 로그인
        try {
          const tempPassword = localStorage.getItem('temp_password');
          if (!tempPassword) throw new Error('임시 비밀번호를 찾을 수 없습니다.');
          
          const credential = await signInWithEmailAndPassword(auth, email, tempPassword);
          firebaseUser = credential.user;
          
          // 사용자가 설정한 새 비밀번호로 업데이트
          // 주의: 실제 환경에서는 updatePassword를 사용하려면 최근 로그인 필요
          // 여기서는 방금 로그인했으므로 가능
          await updatePassword(firebaseUser, password);
          console.log('기존 계정 비밀번호 업데이트 완료');
        } catch (error) {
          console.error('기존 계정 사용 중 오류:', error);
          // 기존 계정 사용 실패 시 새 계정 생성 시도
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            email, 
            password
          );
          firebaseUser = userCredential.user;
        }
      } else {
        // 임시 Auth UID가 없는 경우 새 계정 생성
        console.log('Firebase Auth UID가 없어 새 계정 생성');
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          email, 
          password
        );
        firebaseUser = userCredential.user;
      }

      // Firebase ID 토큰 가져오기
      const idToken = await firebaseUser.getIdToken();
      
      // auth_token 쿠키 설정 (50분 만료, Secure 및 SameSite 속성 추가)
      document.cookie = `auth_token=${idToken}; path=/; max-age=${50 * 60}; SameSite=Lax`;

      // 최종 사용자 데이터 구성
      const finalUserData = {
        uid: firebaseUser.uid,
        username: username.trim(),
        email: email,
        phoneNumber: phoneNumber || '',
        address: addressInfo?.address || '',
        addressDetail: addressInfo?.addressDetail || '',
        zonecode: addressInfo?.zonecode || '',
        name: tempUserData.name || '',
        surveyData: tempUserData.surveyData || {},
        healthGoals: tempUserData.healthGoals || [],
        signupStep: 'completed',
        createdAt: tempUserData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };

      // Firestore에 사용자 정보 저장 (Firebase Auth UID로)
      const finalUserRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(finalUserRef, finalUserData);
      console.log(`최종 사용자 문서 생성 완료. Firebase UID: ${firebaseUser.uid}`);
      
      // 사용자 데이터 설정
      setUser(finalUserData as UserProfile);
      setUserProfile(finalUserData as UserProfile);
      
      // 로컬 스토리지에 사용자 데이터 저장
      saveUserDataToLocalStorage(finalUserData);
      
      // 임시 데이터 백그라운드에서 정리 (UI 차단 없음)
      setTimeout(async () => {
        try {
          await deleteDoc(tempUserRef);
          console.log(`임시 사용자 문서 삭제 완료. tempId: ${tempId}`);
          localStorage.removeItem('tempId');
          localStorage.removeItem('firebaseAuthUid');
          localStorage.removeItem('temp_password');
          localStorage.removeItem('email_verification_sent');
          localStorage.removeItem('email_verified');
        } catch (deleteError) {
          console.error(`임시 사용자 문서 삭제 실패:`, deleteError);
        }
      }, 1000);

      return { success: true }; // 성공 반환
    } catch (error: any) {
      console.error('계정 생성 실패:', error);
      return { 
        success: false, 
        error: error?.message || '계정 생성 중 오류가 발생했습니다.' 
      };
    } finally {
      setLoading(false);
    }
  };

  // 나머지 유틸리티 함수들
  const checkUsername = async (username: string): Promise<boolean> => {
    if (!db) return false;
    
    console.log('사용자명 중복 체크:', username);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.trim()));
    
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        console.log('사용 중인 사용자명입니다.');
        return false;
      }
      console.log('사용 가능한 사용자명입니다.');
      return true;
    } catch (error) {
      console.error("사용자명 확인 중 오류:", error);
      return false;
    }
  };

  const checkEmail = async (email: string): Promise<boolean> => {
    if (!db) return false;
    
    console.log('이메일 중복 체크:', email);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.trim()));
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        console.log('사용 중인 이메일입니다.');
        return false;
      }
      console.log('사용 가능한 이메일입니다.');
      return true;
    } catch (error) {
      console.error("이메일 확인 중 오류:", error);
      return false;
    }
  };

  const checkPhoneNumber = async (phoneNumber: string): Promise<boolean> => {
    if (!db) return false;
    
    console.log('전화번호 중복 체크:', phoneNumber);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber.trim()));
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        console.log('사용 중인 전화번호입니다.');
        return false;
      }
      console.log('사용 가능한 전화번호입니다.');
      return true;
    } catch (error) {
      console.error("전화번호 확인 중 오류:", error);
      return false;
    }
  };

  const updateUserSignupData = async (data: any): Promise<void> => {
    if (!db) {
      console.error('Firebase DB가 초기화되지 않았습니다');
      return;
    }
    
    console.log('회원가입 데이터 업데이트:', data);
    
    try {
      const tempId = localStorage.getItem('tempId');
      if (!tempId) throw new Error('사용자 임시 ID를 찾을 수 없습니다');

      const userRef = doc(db, 'users', tempId);
      await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() });
      console.log(`임시 사용자 데이터 업데이트 완료. tempId: ${tempId}`);

      // 로컬 스토리지 업데이트 (유틸리티 함수 사용)
      try {
        if (data.surveyData) {
          if (data.surveyData.gender) localStorage.setItem('gender', String(data.surveyData.gender));
          if (data.surveyData.height) localStorage.setItem('height', String(data.surveyData.height));
          if (data.surveyData.weight) localStorage.setItem('weight', String(data.surveyData.weight));
          if (data.surveyData.birthDate) localStorage.setItem('birthDate', String(data.surveyData.birthDate));
        }
        if (data.healthGoals) localStorage.setItem('healthGoals', JSON.stringify(data.healthGoals));
        if (data.signupStep) localStorage.setItem('signupStep', data.signupStep);
      } catch (e) { console.error('로컬 스토리지 오류 (updateUserSignupData):', e); }
    } catch (error) { console.error('Firebase 데이터 업데이트 오류:', error); throw error; }
  };

  const updateUserProfile = async (uid: string, data: any): Promise<void> => {
    if (!db) {
      console.error('Firebase DB가 초기화되지 않았습니다');
      return;
    }
    
    console.log('프로필 업데이트:', { uid, data });
    setDataLoading(true);
    
    try {
      // Firestore 업데이트
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { 
        ...data, 
        updatedAt: serverTimestamp() 
      });
      
      // 상태 및 캐시 업데이트
      await refreshUserProfile();
      
      // 로컬 스토리지 업데이트
      if (user) {
        // 업데이트된 필드만 저장
        Object.keys(data).forEach(key => {
          if (key === 'surveyData') {
            if (data.surveyData.gender) localStorage.setItem('gender', String(data.surveyData.gender));
            if (data.surveyData.height) localStorage.setItem('height', String(data.surveyData.height));
            if (data.surveyData.weight) localStorage.setItem('weight', String(data.surveyData.weight));
            if (data.surveyData.birthDate) localStorage.setItem('birthDate', String(data.surveyData.birthDate));
          } else if (key === 'healthGoals') {
            localStorage.setItem('healthGoals', JSON.stringify(data.healthGoals));
          } else if (key === 'name') {
            localStorage.setItem('name', data.name);
          }
        });
      }
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      throw error;
    } finally {
      setDataLoading(false);
    }
  };
  
  const getIncompleteSignup = async (): Promise<any> => {
    return { tempId: localStorage.getItem('tempId') };
  };
  
  const clearIncompleteSignup = async (): Promise<void> => {
    localStorage.removeItem('tempId');
    localStorage.removeItem('last_active_time');
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      dataLoading,
      signIn,
      signOut,
      createAccount,
      checkUsername,
      checkEmail,
      checkPhoneNumber,
      updateUserSignupData,
      updateUserProfile,
      getIncompleteSignup,
      clearIncompleteSignup,
      refreshUserProfile,
      firebaseUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
}; 