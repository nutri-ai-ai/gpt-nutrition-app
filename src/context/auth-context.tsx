'use client';

import { createContext, useContext, useState } from 'react';
import { doc, updateDoc, serverTimestamp, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

type AuthContextType = {
  user: any | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  createAccount: (
    username: string, 
    password: string, 
    phoneNumber: string | undefined, 
    tempId: string,
    addressInfo?: {
      address?: string;
      addressDetail?: string;
      zonecode?: string;
    }
  ) => Promise<boolean>;
  checkUsername: (username: string) => Promise<boolean>;
  checkEmail: (email: string) => Promise<boolean>;
  checkPhoneNumber: (phoneNumber: string) => Promise<boolean>;
  updateUserSignupData: (data: any) => Promise<void>;
  updateUserProfile: (uid: string, data: any) => Promise<void>;
  getIncompleteSignup: () => Promise<any>;
  clearIncompleteSignup: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  signIn: async () => ({}),
  signOut: async () => {},
  createAccount: async () => false,
  checkUsername: async () => true,
  checkEmail: async () => true,
  checkPhoneNumber: async () => true,
  updateUserSignupData: async () => {},
  updateUserProfile: async () => {},
  getIncompleteSignup: async () => null,
  clearIncompleteSignup: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // 더미 로그인 함수 - 실제 인증 없이 로컬 스토리지에만 저장
  const signIn = async (username: string, password: string): Promise<any> => {
    try {
      console.log('더미 로그인:', username);
      
      // 간단한 사용자 객체 생성
      const userData = {
        uid: `user_${Date.now()}`,
        username: username,
        email: `${username}@example.com`,
      };
      
      // 사용자 상태 설정
      setUser(userData);
      
      // 로컬 스토리지에 저장
      try {
        localStorage.setItem('uid', userData.uid);
        localStorage.setItem('username', userData.username);
      } catch (e) {
        console.error('로컬 스토리지 오류:', e);
      }
      
      return userData;
    } catch (error) {
      console.error('더미 로그인 오류:', error);
      throw new Error('로그인에 실패했습니다.');
    }
  };

  // 더미 로그아웃 함수
  const signOut = async (): Promise<void> => {
    setUser(null);
    try {
      localStorage.removeItem('uid');
      localStorage.removeItem('username');
      localStorage.removeItem('gender');
      localStorage.removeItem('height');
      localStorage.removeItem('weight');
      localStorage.removeItem('birthDate');
      localStorage.removeItem('name');
      localStorage.removeItem('healthGoals');
      localStorage.removeItem('signupStep');
      localStorage.removeItem('cart_items');
      localStorage.removeItem('tempId');
      localStorage.removeItem('last_active_time');
      localStorage.removeItem('email_verified');
      localStorage.removeItem('email');
    } catch (e) {
      console.error('로컬 스토리지 오류:', e);
    }
  };

  // 더미 계정 생성 함수
  const createAccount = async (
    username: string, 
    password: string, 
    phoneNumber: string | undefined, 
    tempId: string,
    addressInfo?: any
  ): Promise<boolean> => {
    console.log('실제 계정 생성 시작:', { username, tempId });
    setLoading(true);
    try {
      const tempUserRef = doc(db, 'users', tempId);
      const tempUserSnap = await getDoc(tempUserRef);

      if (!tempUserSnap.exists()) throw new Error('임시 사용자 데이터를 찾을 수 없습니다.');
      const tempUserData = tempUserSnap.data();

      // Linter 오류 해결: 로컬 스토리지에 tempUserData에서 직접 저장 먼저 수행
      try {
        console.log('임시 데이터에서 로컬 스토리지 저장 시도:', tempUserData);
        if (tempUserData.gender) localStorage.setItem('gender', tempUserData.gender);
        if (tempUserData.height) localStorage.setItem('height', tempUserData.height.toString());
        if (tempUserData.weight) localStorage.setItem('weight', tempUserData.weight.toString());
        if (tempUserData.birthDate) localStorage.setItem('birthDate', tempUserData.birthDate);
        if (tempUserData.name) localStorage.setItem('name', tempUserData.name);
        if (tempUserData.email) localStorage.setItem('email', tempUserData.email);
      } catch (e) { console.error('로컬 스토리지 저장 오류 (tempUserData):', e); }

      // username 중복 재확인 (혹시 모를 동시성 문제 대비)
      const isUsernameTaken = !(await checkUsername(username.trim()));
      if (isUsernameTaken) throw new Error('이미 사용 중인 아이디입니다.');

      // 최종 사용자 데이터 구성
      const finalUserData = {
        ...tempUserData,
        username: username.trim(),
        password: password,
        phoneNumber: phoneNumber || '',
        address: addressInfo?.address || '',
        addressDetail: addressInfo?.addressDetail || '',
        zonecode: addressInfo?.zonecode || '',
        signupStep: 'completed',
        createdAt: tempUserData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };

      // 최종 사용자 문서 저장
      const finalUserRef = doc(db, 'users', username.trim());
      await setDoc(finalUserRef, finalUserData);
      console.log(`최종 사용자 문서 생성 완료. Document ID: ${username.trim()}`);

      // --- 임시 문서 삭제 로직 제거 ---
      // console.log(`임시 사용자 문서 삭제는 대시보드에서 처리됩니다. tempId: ${tempId}`);
      /*
      try {
        await deleteDoc(tempUserRef); // 임시 문서 삭제 시도
        console.log(`임시 사용자 문서 삭제 완료. tempId: ${tempId}`);
      } catch (deleteError) {
        console.error(`임시 사용자 문서 삭제 실패 (tempId: ${tempId}):`, deleteError);
      }
      */
      // --- 수정 끝 ---

      // 로컬 스토리지에 최종 username 저장
      try {
        localStorage.setItem('username', username.trim());
        console.log('계정 생성 후 최종 username 로컬 스토리지 저장 완료');
        // 기존에 저장하던 다른 정보들은 tempUserData에서 이미 저장됨
      } catch (e) { console.error('로컬 스토리지 저장 오류 (username):', e); }

      setLoading(false);
      return true; // 성공 반환

    } catch (error) { // getDoc, checkUsername, setDoc 등 주요 단계 오류 처리
      console.error('계정 생성 실패:', error);
      setLoading(false);
      throw error; // 주요 단계 오류는 여전히 발생시킴 (handleSubmit에서 처리)
    }
  };

  // 모든 체크 함수는 항상 true 반환
  const checkUsername = async (username: string): Promise<boolean> => {
    console.log('사용자명 중복 체크:', username);
    const usersRef = collection(db, 'users');
    // username 필드 또는 문서 ID로 확인
    const q = query(usersRef, where('username', '==', username.trim()));
    const docRef = doc(db, 'users', username.trim()); // 문서 ID로도 확인 시도
    
    try {
      const querySnapshot = await getDocs(q);
      const docSnap = await getDoc(docRef);
      // username 필드로 존재하거나, 문서 ID로 존재하면 사용 불가
      if (!querySnapshot.empty || docSnap.exists()) {
        console.log('사용 중인 사용자명입니다.');
        return false; // 사용 불가
      }
      console.log('사용 가능한 사용자명입니다.');
      return true; // 사용 가능
    } catch (error) {
      console.error("사용자명 확인 중 오류:", error);
      // 오류 발생 시 일단 사용 불가로 처리하거나, 에러 핸들링 강화
      return false;
    }
  };

  const checkEmail = async (email: string): Promise<boolean> => {
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

  // 더미 데이터 업데이트 함수
  const updateUserSignupData = async (data: any): Promise<void> => {
    console.log('회원가입 데이터 업데이트:', data);
    
    try {
      const tempId = localStorage.getItem('tempId');
      if (!tempId) throw new Error('사용자 임시 ID를 찾을 수 없습니다');

      const userRef = doc(db, 'users', tempId);
      await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() });
      console.log(`임시 사용자 데이터 업데이트 완료. tempId: ${tempId}`);

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

  // 더미 프로필 업데이트 함수
  const updateUserProfile = async (uid: string, data: any): Promise<void> => {
    console.log('더미 프로필 업데이트 (uid 대신 username 사용 필요):', { uid, data });
    // 실제 구현 시 uid 대신 username을 사용하거나, Firestore에서 uid를 조회하여 사용해야 함
    // 로컬 스토리지 업데이트 로직은 유지 또는 개선
    try {
      // username은 일반적으로 변경하지 않으므로 제외하거나 별도 처리
      if (data.gender) localStorage.setItem('gender', String(data.gender));
      if (data.height) localStorage.setItem('height', String(data.height));
      if (data.weight) localStorage.setItem('weight', String(data.weight));
      if (data.birthDate) localStorage.setItem('birthDate', String(data.birthDate));
      if (data.name) localStorage.setItem('name', String(data.name));
    } catch (e) { console.error('로컬 스토리지 오류:', e); }
  };

  // 더미 미완료 회원가입 정보 조회
  const getIncompleteSignup = async (): Promise<any> => {
    console.log('더미 미완료 회원가입 정보 조회');
    return null; // 항상 null 반환
  };

  // 더미 미완료 회원가입 정보 정리
  const clearIncompleteSignup = async (): Promise<void> => {
    console.log('더미 미완료 회원가입 정보 정리');
    // 아무것도 하지 않음
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    createAccount,
    checkUsername,
    checkEmail,
    checkPhoneNumber,
    updateUserSignupData,
    updateUserProfile,
    getIncompleteSignup,
    clearIncompleteSignup
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
}; 