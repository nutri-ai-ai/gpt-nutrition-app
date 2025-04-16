"use client";
export const dynamic = "force-dynamic";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doc, getDoc, updateDoc, increment,
  collection, addDoc, serverTimestamp, query, orderBy, getDocs, deleteDoc, where, writeBatch
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { extractKeywords, updateMindmapKeywords } from "@/lib/mindmapUtils";
import clsx from "clsx";
import { products, Product } from '@/lib/products';
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/auth-context";
import { onAuthStateChanged } from "firebase/auth";

type Message = { sender: "user" | "gpt"; content: string; timestamp?: string };
type DosageSchedule = {
  time: "아침" | "점심" | "저녁" | "취침전";
  amount: number;
  withMeal?: boolean;
  reason?: string;
};

type Recommendation = {
  id: string;
  text?: string;
  name?: string;
  productName: string;
  dailyDosage: number;
  dosageSchedule: DosageSchedule[];
  pricePerUnit: number;
  monthlyPrice: number;
  reason?: string;
  benefits?: string[];
  precautions?: string[];
};

// 상수 정의
const SHIPPING_COST = 4500;
const SURVEY_DISCOUNT = 10000;
const FIRST_SUBSIDY = 10000;

// 현재 데이터베이스 구조에 맞게 타입 수정
interface UserInfo {
  username?: string;
  gender: string;
  height: number;
  weight: number;
  name?: string;
  birthDate: string;
}

type Profile = {
  name?: string;
  gender: string;
  height: number;
  weight: number;
  birthDate: string;
};

type SubscriptionPrices = {
  monthly: number;
  threeMonths: number;
  sixMonths: number;
  yearly: number;
};

interface RecommendedProduct {
  id: string;
  name: string;
  productName?: string;
  description: string;
  category: string;
  pricePerUnit: number;
  tags: string[];
  reason: string;
  dailyDosage: number;
  dosageSchedule: {
    time: "아침" | "점심" | "저녁" | "취침전";
    amount: number;
    withMeal?: boolean;
    reason?: string;
  }[];
  benefits: string[];
  precautions: string[];
  monthlyPrice: number;
}

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: RecommendedProduct[];
  foodRecommendations?: {
    category: string;
    foods: Array<{
      name: string;
      nutrients: string[];
      benefits: string[];
      servingSize: string;
    }>;
    reason: string;
  }[];
  exerciseRoutines?: {
    type: string;
    exercises: Array<{
      name: string;
      duration: string;
      intensity: string;
      description: string;
      benefits: string[];
    }>;
    frequency: string;
    precautions: string[];
  }[];
};

// 원래의 로직 + UI를 모두 ChatContent라는 컴포넌트로 분리
function ChatContent({
  showDeleteConfirmModal,
  setShowDeleteConfirmModal
}: {
  showDeleteConfirmModal: boolean;
  setShowDeleteConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nameParam = searchParams.get("name") || "사용자";
  const storedUsername = useRef<string | null>(null);
  const [storedUid, setStoredUid] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [profile, setProfile] = useState<Profile>({
    gender: '',
    birthDate: '',
    height: 0,
    weight: 0
  });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileMessageDisplayed, setProfileMessageDisplayed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<RecommendedProduct | null>(null);
  const [subscribedProducts, setSubscribedProducts] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [subscriptionPrices, setSubscriptionPrices] = useState<SubscriptionPrices>({
    monthly: 0,
    threeMonths: 0,
    sixMonths: 0,
    yearly: 0
  });
  const [showMobileInput, setShowMobileInput] = useState(false);
  const [expandedRecommendation, setExpandedRecommendation] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();

  const fetchProfileAndChatLogs = useCallback(async () => {
    console.log("fetchProfileAndChatLogs 시작");
    setLoading(true);
    
    try {
      if (!user) {
        console.log("사용자 인증 상태 없음: 로그인으로 리다이렉션");
        router.push('/login');
        return;
      }
      
      console.log("사용자 인증 상태:", { 
        uid: user.uid, 
        email: user.email,
        username: user.username
      });
      
      // storedUid 설정
      setStoredUid(user.uid);
      storedUsername.current = user.username || nameParam;
      
      // Firestore에서 사용자 정보 가져오기
      const userId = user.uid;
      console.log("사용자 ID로 프로필 조회:", userId);
      if (!db) {
        console.error("Firebase Firestore가 초기화되지 않았습니다");
        setLoading(false);
        return;
      }
      const profileRef = doc(db, 'users', userId);
      const profileSnapshot = await getDoc(profileRef);
      
      if (profileSnapshot.exists()) {
        const profileData = profileSnapshot.data();
        
        // 프로필 정보 설정
        const userProfile: Profile = {
          gender: profileData.gender || 'male',
          height: profileData.height || 170, 
          weight: profileData.weight || 70,
          birthDate: profileData.birthDate || '2000-01-01',
          name: profileData.name || user.username
        };
        
        setProfile(userProfile);
        
        // 채팅 로그 가져오기
        const chatRef = collection(db, 'chats', user.uid, 'messages');
        const q = query(chatRef, orderBy('timestamp', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const chatMessages: ChatMessage[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          chatMessages.push({
            id: doc.id,
            role: data.sender,
            content: data.text,
            recommendations: data.recommendations || []
          });
        });
        
        setMessages(chatMessages);
        
        // 첫 접속 시 프로필 메시지 표시
        if (chatMessages.length === 0) {
          showProfileMessage(userProfile);
        }
        
        // 구독 가격 계산
        calculateAllSubscriptionPrices();
      } else {
        // 프로필 없으면 기본값 사용
        const defaultProfile: Profile = {
          gender: 'male',
          height: 170,
          weight: 70,
          birthDate: '2000-01-01',
          name: user.username
        };
        
        setProfile(defaultProfile);
        // 첫 사용자 메시지 표시
        showProfileMessage(defaultProfile);
      }
    } catch (error) {
      console.error('프로필 로드 오류:', error);
      setLoading(false);
    }
    
    setLoading(false);
  }, [user, router]);
  
  // 인증 상태 및 프로필 데이터 로드
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchProfileAndChatLogs();
  }, [user, authLoading, router, fetchProfileAndChatLogs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = async (role: 'user' | 'assistant', content: string, recommendations: RecommendedProduct[] = []) => {
    const newMessage: ChatMessage = {
      role,
      content,
      recommendations
    };

    setMessages(prev => [...prev, newMessage]);

    // Firestore에 메시지 저장
    if (user) {
      try {
        if (!db) {
          console.error("Firebase Firestore가 초기화되지 않았습니다");
          return;
        }
        await addDoc(collection(db, 'chats', user.uid, 'messages'), {
          sender: role,
          text: content,
          recommendations,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error('메시지 저장 중 오류:', error);
      }
    }
  };

  const calculateSubscriptionPrice = (product: Partial<Product> | RecommendedProduct | null, dailyDosage: number = 1) => {
    if (!product || !product.pricePerUnit) return { monthly: 0, perUnit: 0 };
    
    const monthlyQuantity = dailyDosage * 30;
    const monthly = Math.round(product.pricePerUnit * monthlyQuantity);
    
    return {
      monthly,
      perUnit: product.pricePerUnit
    };
  };

  const calculateAllSubscriptionPrices = () => {
    // 모든 추천 제품에 대한 구독 가격 계산
    let monthlyTotal = 0;
    
    recommendations.forEach(recommendation => {
      const result = calculateSubscriptionPrice(recommendation, recommendation.dailyDosage);
      monthlyTotal += result.monthly;
    });
    
    setSubscriptionPrices({
      monthly: monthlyTotal,
      threeMonths: Math.round(monthlyTotal * 3 * 0.95), // 5% 할인
      sixMonths: Math.round(monthlyTotal * 6 * 0.9),   // 10% 할인
      yearly: Math.round(monthlyTotal * 12 * 0.8)      // 20% 할인
    });
  };

  const fetchSubscribedProducts = async () => {
    if (!storedUid) return;
    
    try {
      if (!db) {
        console.error("Firebase Firestore가 초기화되지 않았습니다");
        return;
      }
      const subRef = collection(db, "users", storedUid, "subscriptions");
      const q = query(subRef, where("status", "==", "active"));
      const querySnapshot = await getDocs(q);
      
      const products: string[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.supplement?.productName) {
          products.push(data.supplement.productName);
        }
      });
      
      setSubscribedProducts(products);
    } catch (error) {
      console.error("구독 제품 목록 가져오기 실패:", error);
    }
  };

  const extractRecommendations = async (reply: string): Promise<RecommendedProduct[]> => {
    const recommendations: RecommendedProduct[] = [];
    
    try {
      // 1. 텍스트에서 마커를 찾아서 추천 영양제 파싱 (기존 방식)
      const markers = ['[추천]', '[영양제 추천]'];
      let recString = '';
      
      for (const marker of markers) {
        if (reply.includes(marker)) {
          const parts = reply.split(marker);
          for (let i = 1; i < parts.length; i++) {
            recString += parts[i].trim() + '\n';
          }
        }
      }

      if (recString) {
        const lines = recString.split('\n').map(l => l.trim()).filter(Boolean);
        const recLines = lines.filter(line => 
          line.startsWith('-') || 
          line.startsWith('•') || 
          line.includes(':')
        );

        for (const line of recLines) {
          const content = line.replace(/^[-•]\s*/, '').trim();
          
          let name = '', dosage = 1;
          
          if (content.includes(':')) {
            [name, dosage] = extractNameAndDosage(content.split(':'));
          } else if (content.includes('알')) {
            [name, dosage] = extractNameAndDosage(content.split(/\s+(?=\d+알)/));
          } else {
            name = content.split(/\s+/)[0];
          }

          name = name.trim();
          
          const product = products.find(p => p.name === name);
          if (product && !subscribedProducts.includes(name)) {
            const normalizedGender = (() => {
              const gender = userInfo?.gender?.toLowerCase() || 'male';
              if (gender === 'male' || gender === '남' || gender === '남성' || gender === '남자') {
                return 'male';
              } else if (gender === 'female' || gender === '여' || gender === '여성' || gender === '여자') {
                return 'female';
              }
              return gender;
            })();
            
            const dosageScheduleResult = calculateDosageSchedule(name, dosage, {
              gender: normalizedGender,
              height: userInfo?.height || 170,
              weight: userInfo?.weight || 70,
              birthDate: userInfo?.birthDate || '',
              name: userInfo?.name || '',
              username: userInfo?.username || ''
            });
            
            const calculatedPrice = calculateSubscriptionPrice(product, dosage);
            
            recommendations.push({
              id: `${Date.now()}-${Math.random()}`,
              name: name,
              productName: name,
              description: product.description,
              category: product.category,
              pricePerUnit: product.pricePerUnit,
              tags: product.tags,
              reason: `AI가 추천하는 맞춤 영양제입니다.`,
              dailyDosage: dosage,
              dosageSchedule: dosageScheduleResult,
              benefits: [],
              precautions: [],
              monthlyPrice: calculatedPrice.monthly
            });
          }
        }
      }

      console.log('텍스트에서 추출된 추천 영양제:', recommendations);
    } catch (error) {
      console.error('추천 영양제 추출 중 오류:', error);
    }

    return recommendations;
  };

  const extractNameAndDosage = (parts: string[]): [string, number] => {
    if (!parts || parts.length < 1) return ['', 1];
    
    const name = parts[0].trim();
    let dosage = 1;

    if (parts.length > 1) {
      const dosageMatch = parts[1].match(/\d+/);
      if (dosageMatch) {
        dosage = parseInt(dosageMatch[0]);
      }
    }

    return [name, dosage];
  };

  const handleRemoveRecommendation = (productName: string) => {
    setRecommendations(prev => prev.filter(rec => rec.name === productName || rec.productName === productName));
  };

  const handleSubscribeAll = () => {
    // 추천 제품이 있는 경우에만 진행
    if (recommendations.length > 0) {
      // 각 추천 항목에 productName 필드가 있는지 확인하고 없으면 추가
      const recsWithProductName = recommendations.map(rec => ({
        ...rec,
        productName: rec.productName || rec.name
      }));
      
      // 세션 스토리지에 저장
      sessionStorage.setItem('nutri_recommendations', JSON.stringify(recsWithProductName));
      
      // 결제 페이지로 이동
      router.push('/supplements');
    }
  };

  const fetchUserInfo = async () => {
    if (!storedUid) return;
    
    try {
      if (!db) {
        console.error("Firebase Firestore가 초기화되지 않았습니다");
        return;
      }
      const userDoc = await getDoc(doc(db, 'users', storedUid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userInfo: UserInfo = {
          username: storedUsername.current || '',
          name: userData.name || localStorage.getItem("name") || '',
          gender: userData.gender || localStorage.getItem("gender") || 'male',
          height: Number(userData.height) || Number(localStorage.getItem("height")) || 170,
          weight: Number(userData.weight) || Number(localStorage.getItem("weight")) || 70,
          birthDate: userData.birthDate || localStorage.getItem("birthDate") || '2000-01-01',
        };
        setUserInfo(userInfo);
      }
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
    }
  };

  const showProfileMessage = async (profileData: Profile) => {
    if (!profile) {
      console.error("프로필 정보가 없어 프로필 메시지를 표시할 수 없습니다.");
      return;
    }

    if (profileMessageDisplayed) {
      console.log("프로필 메시지가 이미 표시되어 있습니다.");
      return;
    }

    try {
      const genderDisplay = (gender: string) => {
        if (!gender) return '정보 없음';
        if (gender.toLowerCase() === 'male') return '남';
        if (gender.toLowerCase() === 'female') return '여';
        if (gender === '남성' || gender === '남자') return '남';
        if (gender === '여성' || gender === '여자') return '여';
        return gender;
      };

      const profileMsg = `
안녕하세요 ${profile.name || localStorage.getItem("name") || "사용자"}님! 😊
현재 등록된 건강정보를 확인해주시겠어요?

- 생년월일: ${profile.birthDate || localStorage.getItem("birthDate") || ""}
- 성별: ${genderDisplay(profile.gender || localStorage.getItem("gender") || "male")}
- 키: ${profile.height || localStorage.getItem("height") || "170"}cm
- 몸무게: ${profile.weight || localStorage.getItem("weight") || "70"}kg

위 정보가 맞다면 채팅창에 "맞아"라고 입력해주세요.
회원정보 수정이 필요하시다면 "마이페이지"에서 수정 후 다시 돌아와 주세요.
${profile.name || localStorage.getItem("name") || "사용자"}님의 건강상태를 참고해서 AI가 영양제를 추천해드릴게요!! 😊`.trim();

      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: "assistant",
          content: profileMsg
        }
      ]);
      
      setProfileMessageDisplayed(true);
      
      if (db && user?.uid) {
        await addDoc(collection(db, "users", user.uid, "chatLogs"), {
          role: "assistant",
          content: profileMsg,
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("프로필 메시지 표시 중 오류:", error);
    }
  };

  const deleteAllChatLogs = async () => {
    setIsDeleting(true);
    
    try {
      if (!storedUsername.current) {
        console.error('사용자명이 없습니다.');
        setIsDeleting(false);
        setShowDeleteConfirmModal(false);
        return;
      }
      
      if (!storedUid) {
        console.error('사용자 UID가 없습니다.');
        setIsDeleting(false);
        setShowDeleteConfirmModal(false);
        return;
      }
      
      if (!db) {
        console.error("Firebase Firestore가 초기화되지 않았습니다");
        setIsDeleting(false);
        setShowDeleteConfirmModal(false);
        return;
      }
      
      try {
        const chatRef = collection(db, "users", storedUid, "chatLogs");
        const logsSnapshot = await getDocs(chatRef);
        
        const batch = writeBatch(db);
        logsSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        setMessages([]);
        setRecommendations([]);
        localStorage.removeItem('chatRecommendations');
        
        setProfileMessageDisplayed(false);
        
        if (profile && storedUid) {
          try {
            await showProfileMessage(profile);
          } catch (error) {
            console.error("채팅 기록 삭제 후 프로필 메시지 표시 중 오류:", error);
          }
        }
      } catch (error) {
        console.error("채팅 로그 삭제 중 오류:", error);
        throw error;
      }
      
      setShowDeleteConfirmModal(false);
    } catch (err) {
      console.error("삭제 실패:", err);
      
      toast.error('채팅 내역 삭제 중 오류가 발생했습니다.', {
        duration: 3000,
        position: 'bottom-center'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) {
      console.log("입력 메시지가 비어있음");
      return;
    }
    
    if (!storedUid) {
      console.log("storedUid가 없음, 사용자 인증 문제 가능성");
      
      // 사용자 인증이 되어있지만 storedUid가 설정되지 않은 경우 재설정 시도
      if (user && user.uid) {
        console.log("사용자 ID 재설정:", user.uid);
        setStoredUid(user.uid);
        
        // 바로 메시지를 보내지 않고 storedUid 업데이트 후 다시 함수 호출
        setTimeout(() => {
          const button = document.querySelector('button[type="submit"]') as HTMLButtonElement;
          if (button) {
            button.click();
          }
        }, 500);
        return;
      } else {
        // 로컬 스토리지에서 uid 가져오기 시도
        const localUid = localStorage.getItem('uid');
        if (localUid) {
          console.log("로컬 스토리지에서 사용자 ID 복구:", localUid);
          setStoredUid(localUid);
          
          // 바로 메시지를 보내지 않고 storedUid 업데이트 후 다시 함수 호출
          setTimeout(() => {
            const button = document.querySelector('button[type="submit"]') as HTMLButtonElement;
            if (button) {
              button.click();
            }
          }, 500);
          return;
        }
        
        // 어떤 방법으로도 인증 ID를 얻을 수 없는 경우
        console.log("사용자 인증 없음, 메시지 전송 불가");
        toast.error("로그인이 필요합니다.");
        
        // 로그인 페이지로 리다이렉션
        setTimeout(() => {
          router.push('/login');
        }, 1500);
        return;
      }
    }

    const userMessage = inputMessage.trim();
    console.log("메시지 전송 시도:", userMessage, "storedUid:", storedUid);
    setInputMessage("");
    
    // 메시지 전송 전에 최종 storedUid 확인
    const effectiveUid = storedUid || (user?.uid) || localStorage.getItem('uid');
    if (!effectiveUid) {
      console.log("유효한 사용자 ID 없음, 메시지 전송 취소");
      toast.error("로그인 상태를 확인할 수 없습니다.");
      return;
    }
    
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage
    }]);

    try {
      console.log("Firestore에 메시지 저장 시도:", effectiveUid);
      if (!db) {
        console.error("Firebase Firestore가 초기화되지 않았습니다");
        setLoading(false);
        return;
      }
      await addDoc(collection(db, "users", effectiveUid, "chatLogs"), {
        role: "user",
        content: userMessage,
        timestamp: serverTimestamp(),
      });

      setLoading(true);

      const userDocRef = doc(db, "users", effectiveUid);
      await updateDoc(userDocRef, {
        messagesSent: increment(1),
        lastActive: serverTimestamp(),
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          userInfo: userInfo,
          username: storedUsername.current,
          conversation: messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`API 오류 (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      
      try {
        // API 응답에서 추천 정보 직접 사용 (새로운 방식)
        let apiRecommendations: RecommendedProduct[] = [];
        
        if (data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
          // API에서 제공된 recommendations 사용
          apiRecommendations = data.recommendations.map((rec: any) => {
            // 이미 API가 필요한 모든 필드를 제공하는지 확인
            if (rec.name && rec.pricePerUnit !== undefined && rec.monthlyPrice !== undefined && rec.dosageSchedule) {
              return rec as RecommendedProduct;
            }
            
            // 필요한 정보가 부족한 경우 보완
            const product = products.find(p => p.name === rec.name);
            if (!product) return null;
            
            return {
              id: rec.id || `${Date.now()}-${Math.random()}`,
              name: rec.name,
              productName: rec.productName || rec.name,
              description: rec.description || product.description,
              category: rec.category || product.category,
              pricePerUnit: rec.pricePerUnit !== undefined ? rec.pricePerUnit : product.pricePerUnit,
              tags: rec.tags || product.tags,
              reason: rec.reason || "AI가 추천하는 맞춤 영양제입니다.",
              dailyDosage: rec.dailyDosage || rec.dosage || 1,
              dosageSchedule: rec.dosageSchedule || rec.schedule || calculateDosageSchedule(rec.name, rec.dosage || 1, userInfo || {
                gender: 'male',
                height: 170,
                weight: 70,
                birthDate: '2000-01-01',
                name: '',
                username: ''
              }),
              benefits: rec.benefits || [],
              precautions: rec.precautions || [],
              monthlyPrice: rec.monthlyPrice !== undefined ? rec.monthlyPrice : product.pricePerUnit * (rec.dosage || 1) * 30
            };
          }).filter(Boolean);
        }
        
        // 텍스트에서 추천 정보 추출 (기존 방식 백업)
        const extractedRecommendations = await extractRecommendations(data.reply);
        
        // 두 방식 모두 사용하고 중복 제거
        const combinedRecommendations = [...apiRecommendations];
        
        // 중복된 이름이 없는 경우에만 추가
        extractedRecommendations.forEach(rec => {
          if (!combinedRecommendations.some(r => r.name === rec.name)) {
            combinedRecommendations.push(rec);
          }
        });
        
        console.log('최종 추천 영양제:', combinedRecommendations);
        
        // 메시지에 추천 정보 포함하여 저장
        setMessages(prevMessages => [
          ...prevMessages, 
          {
            role: 'assistant',
            content: data.reply,
            ...(combinedRecommendations.length > 0 ? { recommendations: combinedRecommendations } : {}),
            foodRecommendations: data.foodRecommendations || [],
            exerciseRoutines: data.exerciseRoutines || []
          }
        ]);

        await addDoc(collection(db, "users", effectiveUid, "chatLogs"), {
          role: "assistant",
          content: data.reply,
          ...(combinedRecommendations.length > 0 ? { recommendations: combinedRecommendations } : {}),
          timestamp: serverTimestamp(),
        });
      } catch (processError) {
        console.error("응답 처리 중 오류:", processError);
        
        setMessages(prevMessages => [
          ...prevMessages, 
          {
            role: 'assistant',
            content: data.reply
          }
        ]);
        
        await addDoc(collection(db, "users", effectiveUid, "chatLogs"), {
          role: "assistant",
          content: data.reply,
          timestamp: serverTimestamp(),
        });
      }

    } catch (error) {
      console.error("오류 발생:", error);
      
      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: "assistant",
          content: "죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSupplementClick = (supplement: RecommendedProduct) => {
    setSelectedSupplement(supplement);
    
    // 구독함에 추가하기 위한 이벤트 발생
    const checkDuplicate = () => {
      return new Promise<boolean>((resolve) => {
        const handleResponse = (e: CustomEvent) => {
          const { isDuplicate } = e.detail;
          window.removeEventListener('healthSubscriptionResponse', handleResponse as EventListener);
          resolve(isDuplicate);
        };
        
        window.addEventListener('healthSubscriptionResponse', handleResponse as EventListener);
        
        // productName이 있으면 그것을 사용하고, 없으면 name을 사용
        const supplementName = supplement.productName || supplement.name;
        
        window.dispatchEvent(new CustomEvent('checkHealthSubscription', {
          detail: { name: supplementName }
        }));
      });
    };
    
    checkDuplicate().then(isDuplicate => {
      if (isDuplicate) {
        // productName이 있으면 그것을 사용하고, 없으면 name을 사용
        const supplementName = supplement.productName || supplement.name;
        toast.error(`${supplementName}은(는) 이미 건강구독함에 있습니다.`);
      } else {
        // 채팅 추천 제품을 건강구독함에 추가하는 이벤트 발생 (ClientLayout과 호환되는 형식)
        // dosageSchedule이 모든 필요한 필드를 포함하는지 확인
        const validDosageSchedule = supplement.dosageSchedule.map(schedule => ({
          ...schedule,
          withMeal: schedule.withMeal !== undefined ? schedule.withMeal : true,
          reason: schedule.reason || "영양제 복용 권장 사항입니다."
        }));
        
        window.dispatchEvent(new CustomEvent('chatRecommendation', { 
          detail: {
            ...supplement,
            dosageSchedule: validDosageSchedule
          }
        }));
        
        // productName이 있으면 그것을 사용하고, 없으면 name을 사용
        const supplementName = supplement.productName || supplement.name;
        toast.success(`${supplementName}이(가) 건강구독함에 추가되었습니다.`);
      }
    });
  };

  const handleSubscription = (plan: string) => {
    if (!selectedSupplement) return;
    
    const subscriptionDetails = {
      plan,
      supplement: selectedSupplement,
      amountPaid: subscriptionPrices[plan as keyof typeof subscriptionPrices]
    };
    sessionStorage.setItem('nutri_subscription', JSON.stringify(subscriptionDetails));
    router.push('/payment');
  };

  useEffect(() => {
    if (recommendations.length > 0) {
      sessionStorage.setItem('nutri_recommendations', JSON.stringify(recommendations));
    }
  }, [recommendations]);

  useEffect(() => {
    const stored = sessionStorage.getItem('nutri_recommendations');
    if (stored) {
      try {
        const recs = JSON.parse(stored);
        // 각 추천 항목에 productName 필드가 있는지 확인하고 없으면 추가
        const recsWithProductName = recs.map((rec: any) => ({
          ...rec,
          productName: rec.productName || rec.name
        }));
        setRecommendations(recsWithProductName);
      } catch (e) {
        console.error('추천 목록 파싱 실패', e);
      }
    }
  }, []);

  useEffect(() => {
    if (storedUid) {
      fetchSubscribedProducts();
    }
  }, [storedUid]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const calculateDosageSchedule = (
    supplementName: string,
    dailyDosage: number,
    userInfo: UserInfo
  ): DosageSchedule[] => {
    const schedule: DosageSchedule[] = [];
    
    switch (supplementName) {
      case '오메가3':
      case '트리플러스 우먼':
      case '트리플러스 맨':
        if (dailyDosage >= 2) {
          schedule.push({ 
            time: "아침", 
            amount: Math.ceil(dailyDosage / 2),
            withMeal: true,  // 식사와 함께 복용
            reason: "오메가3는 지용성 영양소로 식사 중 지방과 함께 섭취하면 흡수율이 높아집니다."
          });
          schedule.push({ 
            time: "저녁", 
            amount: Math.floor(dailyDosage / 2),
            withMeal: true,
            reason: "하루에 나누어 복용하면 체내 농도를 일정하게 유지할 수 있습니다."
          });
        } else {
          schedule.push({ 
            time: "아침", 
            amount: dailyDosage,
            withMeal: true,
            reason: "오메가3는 지용성 영양소로 식사 중 지방과 함께 섭취하면 흡수율이 높아집니다."
          });
        }
        break;
        
      case '마그네슘':
        schedule.push({ 
          time: "취침전", 
          amount: dailyDosage,
          withMeal: false,
          reason: "마그네슘은 수면에 도움을 주므로 취침 전 복용이 효과적입니다."
        });
        break;
        
      case '비타민C':
        schedule.push({ 
          time: "아침", 
          amount: dailyDosage,
          withMeal: false,
          reason: "비타민C는 수용성 비타민으로 공복에 복용하면 빠르게 흡수됩니다."
        });
        break;
        
      case '비타민D':
        schedule.push({ 
          time: "아침", 
          amount: dailyDosage,
          withMeal: true,
          reason: "비타민D는 지용성 비타민으로 식사와 함께 복용 시 흡수가 잘 됩니다."
        });
        break;
        
      case '아르기닌':
        if (dailyDosage >= 2) {
          schedule.push({ 
            time: "아침", 
            amount: Math.ceil(dailyDosage / 2),
            withMeal: false,
            reason: "아르기닌은 일반적으로 공복에 섭취할 때 효과가 좋습니다."
          });
          schedule.push({ 
            time: "저녁", 
            amount: Math.floor(dailyDosage / 2),
            withMeal: false,
            reason: "취침 전 섭취하면 성장호르몬 분비 촉진에 도움이 됩니다."
          });
        } else {
          schedule.push({ 
            time: "아침", 
            amount: dailyDosage,
            withMeal: false,
            reason: "아르기닌은 일반적으로 공복에 섭취할 때 효과가 좋습니다."
          });
        }
        break;
        
      case '프로바이오틱스':
        schedule.push({ 
          time: "아침", 
          amount: dailyDosage,
          withMeal: false,
          reason: "프로바이오틱스는 위산이 적은 식전 공복 상태에서 더 많은 유산균이 장까지 도달할 수 있습니다."
        });
        break;
        
      case '루테인':
        schedule.push({ 
          time: "점심", 
          amount: dailyDosage,
          withMeal: true, 
          reason: "루테인은 지용성 성분으로 식사와 함께 복용하면 흡수가 잘 됩니다."
        });
        break;
          
      default:
        if (dailyDosage >= 2) {
          schedule.push({ 
            time: "아침", 
            amount: Math.ceil(dailyDosage / 2),
            withMeal: true,
            reason: "일반적으로 영양제는 식사와 함께 복용하면 흡수율이 높아집니다."
          });
          schedule.push({ 
            time: "저녁", 
            amount: Math.floor(dailyDosage / 2),
            withMeal: true,
            reason: "하루 나누어 복용하면 체내 영양소 수준을 일정하게 유지할 수 있습니다."
          });
        } else {
          schedule.push({ 
            time: "아침", 
            amount: dailyDosage,
            withMeal: true,
            reason: "일반적으로 영양제는 식사와 함께 복용하면 흡수율이 높아집니다."
          });
        }
    }
    
    return schedule;
  };

  const MessageContent = ({ message }: { message: ChatMessage }) => {
    return (
      <div className="flex flex-col gap-4">
        <div className="whitespace-pre-wrap">{message.content}</div>
        
        {message.recommendations && message.recommendations.length > 0 && (
          <div className="mt-4 w-full">
            <h3 className="text-lg font-semibold mb-2">추천 영양제</h3>
            <div className="space-y-4">
              {message.recommendations.map((supplement, index) => (
                <div
                  key={supplement.id || index}
                  className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-semibold text-blue-600">{supplement.name}</h4>
                      <p className="text-gray-600 mt-1">{supplement.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {((supplement.monthlyPrice || 0) / 30).toLocaleString()}원
                        <span className="text-sm text-gray-500 ml-1">/일</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">복용 정보</p>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm">
                          일일 복용량: <span className="font-medium">{supplement.dailyDosage}알</span>
                        </p>
                        {supplement.dosageSchedule.map((schedule, idx) => (
                          <p key={idx} className="text-sm">
                            {schedule.time}: <span className="font-medium">{schedule.amount}알</span>
                          </p>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-600">월 구독 혜택</p>
                      <div className="mt-1">
                        <p className="text-lg font-bold text-red-500">
                          {Math.floor((supplement.monthlyPrice || 0) * 0.85).toLocaleString()}원
                          <span className="text-sm font-normal text-gray-500 ml-1">/월</span>
                        </p>
                        <p className="text-sm text-gray-500 line-through">
                          {(supplement.monthlyPrice || 0).toLocaleString()}원/월
                        </p>
                        <p className="text-sm text-red-500">15% 할인 적용</p>
                      </div>
                    </div>
                  </div>

                  {supplement.benefits && supplement.benefits.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-600">기대 효과</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {supplement.benefits.map((benefit, idx) => (
                          <span key={idx} className="text-sm bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {supplement.precautions && supplement.precautions.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-600">주의사항</p>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        {supplement.precautions.map((precaution, idx) => (
                          <li key={idx} className="text-sm text-gray-600">{precaution}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => handleSupplementClick(supplement)}
                    className="mt-4 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  >
                    구독하기
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {message.foodRecommendations && message.foodRecommendations.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">추천 식단</h3>
            {message.foodRecommendations.map((foodRec, index) => (
              <div key={index} className="mb-4">
                <h4 className="font-medium mb-2">{foodRec.category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {foodRec.foods.map((food, foodIndex) => (
                    <div
                      key={foodIndex}
                      className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
                    >
                      <h5 className="font-medium mb-2">{food.name}</h5>
                      <p className="text-sm text-gray-600 mb-1">
                        1회 섭취량: {food.servingSize}
                      </p>
                      <div className="mb-2">
                        <p className="text-sm font-medium">영양소:</p>
                        <p className="text-sm text-gray-600">
                          {food.nutrients.join(', ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">효과:</p>
                        <p className="text-sm text-gray-600">
                          {food.benefits.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {message.exerciseRoutines && message.exerciseRoutines.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">추천 운동</h3>
            {message.exerciseRoutines.map((routine, index) => (
              <div key={index} className="mb-4">
                <h4 className="font-medium mb-2">
                  {routine.type} ({routine.frequency})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {routine.exercises.map((exercise, exIndex) => (
                    <div
                      key={exIndex}
                      className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
                    >
                      <h5 className="font-medium mb-2">{exercise.name}</h5>
                      <p className="text-sm text-gray-600 mb-1">
                        시간: {exercise.duration}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        강도: {exercise.intensity}
                      </p>
                      <div className="mb-2">
                        <p className="text-sm font-medium">방법:</p>
                        <p className="text-sm text-gray-600">{exercise.description}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">효과:</p>
                        <p className="text-sm text-gray-600">
                          {exercise.benefits.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative max-w-4xl mx-auto px-4">
      {isDeleting && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-800 font-medium">채팅 내역을 삭제하고 있습니다...</p>
            <p className="text-gray-500 text-sm mt-2">잠시만 기다려주세요.</p>
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-10rem)] overflow-y-auto mt-2">
        <div className="space-y-4 pb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={clsx(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={clsx(
                  "max-w-[80%] rounded-lg p-4",
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-800"
                )}
              >
                {message.role === "assistant" ? (
                  <MessageContent message={message} />
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white rounded-lg p-4 shadow-md max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">AI가 사용자에게 맞는 영양제를 검색중 입니다...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-gray-400 text-sm py-1">
            <p>💡 영양제 구독은 미래를 위한 <span className="font-medium">실질적인</span> 보험입니다.</p>
          </div>
          <div className="px-4 py-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                전송
              </button>
            </form>
          </div>
        </div>
      </div>

      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl transform transition-all animate-fadeIn">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗑️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                채팅 기록을 삭제할까요?
              </h3>
              <p className="text-sm text-gray-500">
                삭제된 대화 내용은 복구할 수 없습니다.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                disabled={isDeleting}
              >
                아니오
              </button>
              <button
                onClick={deleteAllChatLogs}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    삭제 중...
                  </span>
                ) : (
                  "예"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteConfirmModal(true);
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className="fixed inset-x-0 top-0 h-16 bg-white shadow-sm z-50">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 transform group-hover:scale-105 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2a1 1 0 001-1v-4a1 1 0 00-1-1h-4a1 1 0 01-1-1v-3" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-800 ml-4">Nutri AI 채팅</h1>
          </div>
          <button
            onClick={handleDeleteClick}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-sm font-medium">채팅 삭제</span>
          </button>
        </div>
      </div>
      <div className="pt-16 pb-24">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center h-[70vh]">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 font-medium">채팅을 불러오는 중입니다...</p>
          </div>
        }>
          <ChatContent
            showDeleteConfirmModal={showDeleteConfirmModal}
            setShowDeleteConfirmModal={setShowDeleteConfirmModal}
          />
        </Suspense>
      </div>
    </div>
  );
}

