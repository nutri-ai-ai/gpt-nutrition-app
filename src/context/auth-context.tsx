'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, where, getDocs, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

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
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  createAccount: async () => false,
  checkUsername: async () => false,
  checkEmail: async () => false,
  checkPhoneNumber: async () => false,
  updateUserSignupData: async () => {},
  updateUserProfile: async () => {},
  getIncompleteSignup: async () => null,
  clearIncompleteSignup: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const checkUsername = async (username: string) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty; // true면 사용 가능, false면 이미 존재
    } catch (error) {
      console.error('Username check error:', error);
      throw error;
    }
  };

  const checkPhoneNumber = async (phoneNumber: string) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty; // true면 사용 가능, false면 이미 존재
    } catch (error) {
      console.error('핸드폰번호 확인 오류:', error);
      throw error;
    }
  };

  const checkEmail = async (email: string) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty; // true면 사용 가능, false면 이미 존재
    } catch (error) {
      console.error('Email check error:', error);
      throw error;
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      // username으로 해당 사용자의 이메일 조회
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('존재하지 않는 아이디입니다');
      }
      
      // 사용자 문서에서 이메일 가져오기
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const email = userData.email;
      
      if (!email) {
        throw new Error('이메일 정보를 찾을 수 없습니다');
      }
      
      // 이메일과 비밀번호로 Firebase Auth 로그인
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 로그인 성공 시 uid 저장
      localStorage.setItem('uid', userCredential.user.uid);
      localStorage.setItem('username', username);
      
      return userCredential.user;
    } catch (error: any) {
      console.error('로그인 오류:', error);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('아이디 또는 비밀번호가 일치하지 않습니다');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요');
      } else {
        throw error;
      }
    }
  };

  const createAccount = async (
    username: string,
    password: string,
    phoneNumber: string | undefined,
    tempId: string,
    addressInfo?: {
      address?: string;
      addressDetail?: string;
      zonecode?: string;
    }
  ): Promise<boolean> => {
    try {
      // 임시 이메일 생성 (Firebase Auth는 이메일 필요)
      const email = localStorage.getItem('email') || `${username}_${Date.now()}@temp.com`;
      
      console.log('계정 생성 시작:', { username, phoneNumber, tempId, addressInfo });
      
      // Firebase Authentication에 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      console.log('Firebase Auth 계정 생성 완료:', userCredential.user.uid);

      // Firestore에 임시 데이터가 있는지 확인
      const tempUserRef = doc(db, 'users', tempId);
      const tempUserDoc = await getDoc(tempUserRef);
      
      if (!tempUserDoc.exists()) {
        console.error('임시 사용자 데이터를 찾을 수 없음');
        return false;
      }
      
      // 임시 데이터
      const tempUserData = tempUserDoc.data();
      
      // 영구 사용자 문서 생성
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        ...tempUserData,
        username,
        phoneNumber: phoneNumber || '',
        uid: userCredential.user.uid,
        email: email,
        address: addressInfo?.address || '',
        addressDetail: addressInfo?.addressDetail || '',
        zonecode: addressInfo?.zonecode || '',
        createdAt: new Date().toISOString(),
        isTemporary: false,
        tempId: tempId,
        authMethod: phoneNumber ? 'phone' : 'email'
      });
      
      console.log('Firestore 사용자 데이터 저장 완료');
      
      // 임시 데이터 삭제 (선택 사항)
      // await deleteDoc(tempUserRef);
      
      return true;
    } catch (error) {
      console.error('계정 생성 중 오류 발생:', error);
      throw error;
    }
  };

  const updateUserSignupData = async (data: any) => {
    const tempId = localStorage.getItem('tempId');
    if (!tempId) {
      throw new Error('사용자 정보를 찾을 수 없습니다.');
    }

    const userRef = doc(db, 'users', tempId);
    const userDoc = await getDoc(userRef);

    try {
      if (!userDoc.exists()) {
        // 문서가 없으면 새로 생성
        await setDoc(userRef, {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isTemporary: true,
          signupStep: 'survey'
        });
      } else {
        // 문서가 있으면 업데이트
        await updateDoc(userRef, {
          ...data,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating user signup data:', error);
      throw new Error('회원가입 정보 업데이트 중 오류가 발생했습니다.');
    }
  };

  // 미완료된 회원가입 정보 조회
  const getIncompleteSignup = async () => {
    const tempId = localStorage.getItem('tempId')
    if (!tempId) return null

    try {
      const userRef = doc(db, 'users', tempId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) return null

      const userData = userDoc.data()
      // 회원가입이 완료되지 않은 경우에만 데이터 반환
      if (userData.signupStep !== 'completed') {
        return {
          ...userData,
          id: tempId
        }
      }
      return null
    } catch (error) {
      console.error('Error getting incomplete signup:', error)
      return null
    }
  }

  // 미완료된 회원가입 정보 정리
  const clearIncompleteSignup = async () => {
    const tempId = localStorage.getItem('tempId')
    if (!tempId) return

    try {
      const userRef = doc(db, 'users', tempId)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        // 24시간이 지난 미완료 데이터는 삭제
        const createdAt = new Date(userData.createdAt)
        const now = new Date()
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

        if (hoursDiff > 24 && userData.signupStep !== 'completed') {
          await deleteDoc(userRef)
          localStorage.removeItem('tempId')
          localStorage.removeItem('email_verified')
          localStorage.removeItem('emailForSignIn')
          localStorage.removeItem('signup_name')
        }
      }
    } catch (error) {
      console.error('Error clearing incomplete signup:', error)
    }
  }

  // 기존 사용자 프로필 업데이트 함수
  const updateUserProfile = async (uid: string, data: any) => {
    if (!uid) {
      throw new Error('사용자 ID가 필요합니다.');
    }

    const userRef = doc(db, 'users', uid);
    
    try {
      console.log(`Updating profile for UID: ${uid} with data:`, data); // 업데이트 데이터 로그
      await updateDoc(userRef, {
        ...data, // username, email 등 업데이트
        // password 필드가 data에 포함되어 있다면 함께 업데이트됨 (⚠️보안상 권장되지 않음)
        updatedAt: serverTimestamp()
      });
      console.log('Profile updated successfully.');
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('프로필 업데이트 중 오류가 발생했습니다.');
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut: () => signOut(auth),
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
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
}; 