"use client";
export const dynamic = "force-dynamic";

import React, { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doc, getDoc, updateDoc, increment,
  collection, addDoc, serverTimestamp, query, orderBy, getDocs, deleteDoc, where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { extractKeywords, updateMindmapKeywords } from "@/lib/mindmapUtils";
import clsx from "clsx";
import { products, Product } from '@/lib/products';
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

type Message = { sender: "user" | "gpt"; content: string; timestamp?: string };
type DosageSchedule = {
  time: "아침" | "점심" | "저녁" | "취침전";
  amount: number;
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

interface UserInfo {
  username?: string;
  gender: string;
  height: number;
  weight: number;
  leftVision: number;
  rightVision: number;
  exerciseFrequency: string;
  dietType: string;
  sleepQuality: string;
  healthGoal: string;
  allergies: string;
  supplements: string;
  medicalHistory: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
}

type Profile = {
  name?: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  gender: string;
  height: number;
  weight: number;
  visionLeft: number;
  visionRight: number;
  exerciseFrequency: string;
  dietType: string;
  sleepQuality: string;
  healthGoal: string;
  allergies: string;
};

type SubscriptionPrices = {
  monthly: number;
  annual: number;
  once: number;
};

interface RecommendedProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  pricePerUnit: number;
  tags: string[];
  reason: string;
  dailyDosage: number;
  dosageSchedule: {
    time: "아침" | "점심" | "저녁" | "취침전";
    amount: number;
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
  setShowDeleteConfirmModal: (show: boolean) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nameParam = searchParams.get("name") || "사용자";
  const storedUsername = useRef<string | null>(null);

  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(() => {
    if (typeof window !== 'undefined') {
      const savedRecs = localStorage.getItem('chatRecommendations');
      return savedRecs ? JSON.parse(savedRecs) : [];
    }
    return [];
  });
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<RecommendedProduct | null>(null);
  const [subscribedProducts, setSubscribedProducts] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    storedUsername.current = localStorage.getItem("username");
  }, []);

  useEffect(() => {
    if (!storedUsername.current) {
      router.push("/login");
      return;
    }

    const fetchProfileAndChatLogs = async () => {
      try {
        const docRef = doc(db, "users", storedUsername.current!);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const profileData: Profile = {
            name: data.name,
            birthYear: data.birthYear || '',
            birthMonth: data.birthMonth || '',
            birthDay: data.birthDay || '',
            gender: data.gender || '',
            height: Number(data.height) || 0,
            weight: Number(data.weight) || 0,
            visionLeft: Number(data.visionLeft) || 0,
            visionRight: Number(data.visionRight) || 0,
            exerciseFrequency: data.exerciseFrequency || '',
            dietType: data.dietType || '',
            sleepQuality: data.sleepQuality || '',
            healthGoal: data.healthGoal || '',
            allergies: data.allergies || ''
          };
          setProfile(profileData);
        }

        // 채팅 기록 로드
        const chatRef = collection(db, "users", storedUsername.current!, "chatLogs");
        const q = query(chatRef, orderBy("timestamp", "asc"));
        const querySnap = await getDocs(q);

        const loadedMessages: ChatMessage[] = [];
        querySnap.forEach((doc) => {
          const data = doc.data();
          loadedMessages.push({
            role: data.role,
            content: data.content,
            recommendations: data.recommendations,
          });
        });

        setMessages(loadedMessages);

        // 채팅 기록이 없거나 마지막 메시지가 프로필 확인 메시지가 아닌 경우에만 프로필 메시지 표시
        const shouldShowProfile = loadedMessages.length === 0 || 
          !loadedMessages[loadedMessages.length - 1].content.includes("현재 등록된 건강정보를 확인해주시겠어요?");

        if (shouldShowProfile) {
          await showProfileMessage();
        }
      } catch (err) {
        console.error("프로필 또는 채팅 불러오기 실패:", err);
      }
    };

    fetchProfileAndChatLogs();
  }, [router, nameParam]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: ChatMessage = {
      role,
      content,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const calculateSubscriptionPrice = (product: Product, dailyDosage: number) => {
    const monthlyQuantity = dailyDosage * 30;
    const monthly = (product?.pricePerUnit || 0) * monthlyQuantity;
    return {
      monthly,
      perUnit: product?.pricePerUnit || 0
    };
  };

  // 구독한 제품 목록 가져오기
  useEffect(() => {
    const fetchSubscribedProducts = async () => {
      if (!storedUsername.current) return;
      
      const subRef = collection(db, "users", storedUsername.current, "subscriptions");
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
    };

    fetchSubscribedProducts();
  }, [storedUsername.current]);

  const extractRecommendations = async (reply: string): Promise<RecommendedProduct[]> => {
    const recommendations: RecommendedProduct[] = [];
    
    try {
      // '[추천]' 또는 '[영양제 추천]' 마커 찾기
      const markers = ['[추천]', '[영양제 추천]'];
      let recString = '';
      
      for (const marker of markers) {
        if (reply.includes(marker)) {
          const parts = reply.split(marker);
          if (parts.length >= 2) {
            recString = parts[1].trim();
            break;
          }
        }
      }

      if (!recString) {
        return recommendations;
      }

      const lines = recString.split('\n').map(l => l.trim());
      const recLines = lines.filter(line => line.startsWith('-') || line.startsWith('•'));

      for (const line of recLines) {
        const content = line.replace(/^[-•]\s*/, '').trim();
        
        // 영양제 이름과 복용량 추출
        let name = '', dosage = 1;
        
        if (content.includes(':')) {
          [name, dosage] = extractNameAndDosage(content.split(':'));
        } else if (content.includes('알')) {
          [name, dosage] = extractNameAndDosage(content.split(/\s+(?=\d+알)/));
        } else {
          name = content.split(/\s+/)[0];
        }

        name = name.trim();
        
        // products 배열에서 해당 제품 찾기
        const product = products.find(p => p.name === name);
        if (product && !subscribedProducts.includes(name)) {
          recommendations.push({
            id: `${Date.now()}-${Math.random()}`,
            name: name,
            description: product.description,
            category: product.category,
            pricePerUnit: product.pricePerUnit,
            tags: product.tags,
            reason: `AI가 추천하는 맞춤 영양제입니다.`,
            dailyDosage: dosage,
            dosageSchedule: calculateDosageSchedule(name, dosage, userInfo!),
            benefits: [],
            precautions: [],
            monthlyPrice: calculateSubscriptionPrice(product, dosage).monthly
          });
        }
      }

      console.log('추출된 추천 영양제:', recommendations); // 디버깅용 로그
    } catch (error) {
      console.error('추천 영양제 추출 중 오류:', error);
    }

    return recommendations;
  };

  // 영양제 이름과 복용량을 추출하는 헬퍼 함수
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

  // 추천 영양제 삭제 함수
  const handleRemoveRecommendation = (productName: string) => {
    setRecommendations(prev => prev.filter(rec => rec.productName !== productName));
  };

  // 전체 구독하기 함수
  const handleSubscribeAll = () => {
    if (recommendations.length > 0) {
      sessionStorage.setItem('nutri_recommendations', JSON.stringify(recommendations));
      router.push('/supplements');
    }
  };

  // 프로필 메시지 표시 함수
  const showProfileMessage = async () => {
    if (!profile) return;

    const profileMsg = `
안녕하세요 ${profile.name || nameParam}님! 😊
현재 등록된 건강정보를 확인해주시겠어요?

- 생년월일: ${profile.birthYear}-${profile.birthMonth}-${profile.birthDay}
- 성별: ${profile.gender}
- 키: ${profile.height}cm
- 몸무게: ${profile.weight}kg
- 시력 (좌: ${profile.visionLeft} / 우: ${profile.visionRight})
- 운동 빈도: ${profile.exerciseFrequency}
- 식습관: ${profile.dietType}
- 수면의 질: ${profile.sleepQuality}
- 건강 목표: ${profile.healthGoal}
- 알레르기 정보: ${profile.allergies}

위 정보가 맞다면 채팅창에 "맞아"라고 입력해주세요.
회원정보 수정이 필요하시다면 "마이페이지"에서 수정 후 다시 돌아와 주세요.`.trim();

    addMessage("assistant", profileMsg);
    await addDoc(collection(db, "users", storedUsername.current!, "chatLogs"), {
      role: "assistant",
      content: profileMsg,
      timestamp: serverTimestamp(),
    });
  };

  // 채팅 기록 삭제 후 프로필 메시지 표시
  const handleDeleteAllMessages = async () => {
    setShowDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    const username = storedUsername.current;
    if (!username) {
      alert("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    setIsDeleting(true); // 삭제 시작 시 로딩 상태 활성화

    try {
      const chatRef = collection(db, "users", username, "chatLogs");
      const q = query(chatRef);
      const snap = await getDocs(q);

      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }

      setMessages([]);
      setRecommendations([]);
      localStorage.removeItem('chatRecommendations');

      await showProfileMessage();
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false); // 삭제 완료 후 로딩 상태 비활성화
      setShowDeleteConfirmModal(false);
    }
  };

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!storedUsername.current) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', storedUsername.current));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userInfo: UserInfo = {
            username: storedUsername.current,
            gender: userData.gender || '남',
            height: Number(userData.height) || 170,
            weight: Number(userData.weight) || 70,
            leftVision: Number(userData.leftVision) || 1.0,
            rightVision: Number(userData.rightVision) || 1.0,
            exerciseFrequency: userData.exerciseFrequency || '주 3-4회',
            dietType: userData.dietType || '일반',
            sleepQuality: userData.sleepQuality || '보통',
            healthGoal: userData.healthGoal || '건강 유지',
            allergies: userData.allergies || '',
            supplements: userData.supplements || '',
            medicalHistory: userData.medicalHistory || '',
            birthYear: userData.birthYear || '1990',
            birthMonth: userData.birthMonth || '01',
            birthDay: userData.birthDay || '01'
          };
          setUserInfo(userInfo);
        }
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
      }
    };

    fetchUserInfo();
  }, [storedUsername.current]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);

    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      role: 'user',
      content: input
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      // 최근 5개 메시지만 전송하여 컨텍스트 크기 줄임
      const recentMessages = messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          userInfo: userInfo,
          username: storedUsername.current,
          conversation: recentMessages
        }),
      });

      if (!response.ok) {
        throw new Error(`API 오류 (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      
      // AI 응답 메시지 추가 (비동기 처리 최적화)
      const recommendations = await extractRecommendations(data.reply);
      
      const aiResponse: ChatMessage = {
        role: 'assistant',
        content: data.reply,
        recommendations: recommendations,
        foodRecommendations: data.foodRecommendations || [],
        exerciseRoutines: data.exerciseRoutines || []
      };

      setMessages(prev => [...prev, aiResponse]);

      // Firebase 저장 비동기 처리
      if (storedUsername.current) {
        addDoc(collection(db, "users", storedUsername.current, "chatLogs"), {
          role: "assistant",
          content: data.reply,
          recommendations: recommendations,
          foodRecommendations: data.foodRecommendations || [],
          exerciseRoutines: data.exerciseRoutines || [],
          timestamp: serverTimestamp(),
        }).catch(dbError => {
          console.error('채팅 로그 저장 실패:', dbError);
        });
      }

    } catch (error) {
      console.error('메시지 전송 중 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSupplementClick = (supplement: RecommendedProduct) => {
    // 전역 장바구니에서 중복 체크
    const checkDuplicateEvent = new CustomEvent('checkHealthSubscription', {
      detail: {
        name: supplement.name
      }
    });

    // 중복 체크 이벤트 발생 및 응답 처리
    const checkDuplicate = () => {
      return new Promise<boolean>((resolve) => {
        const handleResponse = (e: CustomEvent) => {
          resolve(e.detail.isDuplicate);
          window.removeEventListener('healthSubscriptionResponse', handleResponse as EventListener);
        };
        
        window.addEventListener('healthSubscriptionResponse', handleResponse as EventListener);
        window.dispatchEvent(checkDuplicateEvent);
      });
    };

    // 중복 체크 후 처리
    checkDuplicate().then((isDuplicate) => {
      if (isDuplicate) {
        toast.error('이미 건강구독함에 추가된 제품입니다.', {
          duration: 3000,
          position: 'bottom-center',
          style: {
            background: '#EF4444',
            color: '#fff',
            fontSize: '16px',
            padding: '16px'
          }
        });
        return;
      }

      // 중복이 아닌 경우에만 장바구니에 추가
      const addToCartEvent = new CustomEvent('addToHealthSubscription', {
        detail: {
          id: supplement.id,
          name: supplement.name,
          description: supplement.description,
          category: supplement.category,
          pricePerUnit: supplement.pricePerUnit,
          tags: supplement.tags,
          dailyDosage: supplement.dailyDosage,
          dosageSchedule: supplement.dosageSchedule,
          monthlyPrice: supplement.monthlyPrice
        }
      });
      window.dispatchEvent(addToCartEvent);

      toast.success('건강구독함에 추가되었습니다!', {
        duration: 3000,
        position: 'bottom-center',
        style: {
          background: '#4CAF50',
          color: '#fff',
          fontSize: '16px',
          padding: '16px'
        }
      });

      // 로컬 상태 업데이트
      setSubscribedProducts(prev => [...prev, supplement.name]);
    });
  };

  const handleSubscription = (plan: string) => {
    if (!selectedSupplement) return;
    
    const subscriptionPrices = calculateSubscriptionPrice(
      products.find(p => p.name === selectedSupplement.name)!,
      selectedSupplement.dailyDosage
    );

    const subscriptionDetails = {
      plan,
      supplement: selectedSupplement,
      amountPaid: subscriptionPrices[plan as keyof typeof subscriptionPrices]
    };
    sessionStorage.setItem('nutri_subscription', JSON.stringify(subscriptionDetails));
    router.push('/payment');
  };

  // recommendations가 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    if (recommendations.length > 0) {
      sessionStorage.setItem('nutri_recommendations', JSON.stringify(recommendations));
    }
  }, [recommendations]);

  // 페이지 로드 시 기존 추천 데이터 불러오기
  useEffect(() => {
    const stored = sessionStorage.getItem('nutri_recommendations');
    if (stored) {
      try {
        const recs = JSON.parse(stored);
        setRecommendations(recs);
      } catch (e) {
        console.error('추천 목록 파싱 실패', e);
      }
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // calculateDosageSchedule 함수 추가
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
        // 하루 2알 이상은 나누어 복용
        if (dailyDosage >= 2) {
          schedule.push({ time: "아침", amount: Math.ceil(dailyDosage / 2) });
          schedule.push({ time: "저녁", amount: Math.floor(dailyDosage / 2) });
        } else {
          schedule.push({ time: "아침", amount: dailyDosage });
        }
        break;
        
      case '마그네슘':
        // 수면 개선을 위해 저녁이나 취침 전 복용
        schedule.push({ time: "취침전", amount: dailyDosage });
        break;
        
      case '비타민C':
      case '비타민D':
        // 아침에 복용
        schedule.push({ time: "아침", amount: dailyDosage });
        break;
        
      case '아르기닌':
        // 운동 전후 복용을 위해 분할
        if (dailyDosage >= 2) {
          schedule.push({ time: "아침", amount: Math.ceil(dailyDosage / 2) });
          schedule.push({ time: "저녁", amount: Math.floor(dailyDosage / 2) });
        } else {
          schedule.push({ time: "아침", amount: dailyDosage });
        }
        break;
        
      default:
        // 기본적으로 아침/저녁 분할 복용
        if (dailyDosage >= 2) {
          schedule.push({ time: "아침", amount: Math.ceil(dailyDosage / 2) });
          schedule.push({ time: "저녁", amount: Math.floor(dailyDosage / 2) });
        } else {
          schedule.push({ time: "아침", amount: dailyDosage });
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
      {/* 삭제 중 로딩 오버레이 */}
      {isDeleting && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-800 font-medium">채팅 내역을 삭제하고 있습니다...</p>
            <p className="text-gray-500 text-sm mt-2">잠시만 기다려주세요.</p>
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-10rem)] overflow-y-auto mt-2"> {/* 높이 조정 및 상단 마진 추가 */}
        <div className="space-y-4 pb-4"> {/* 하단 패딩 추가 */}
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
                  <span className="text-sm text-gray-500">AI가 답변을 작성중입니다...</span>
                </div>
              </div>
            </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

      {/* 입력 영역 - 하단에 고정 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-40">
        <div className="max-w-4xl mx-auto">
          {/* 워터마크 문구 수정 */}
          <div className="text-center text-gray-400 text-sm py-1">
            <p>💡 영양제 구독은 미래를 위한 <span className="font-medium">실질적인</span> 보험입니다.</p>
        </div>
          <div className="px-4 py-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
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

      {/* 삭제 확인 모달 */}
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
                onClick={confirmDelete}
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

// Suspense로 감싸는 실제 페이지 컴포넌트
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
              <div className="w-6 h-5 flex flex-col justify-between transform group-hover:scale-105 transition-transform">
                <span className="h-0.5 w-full bg-current rounded-full transform origin-left group-hover:rotate-45 transition-transform duration-300"></span>
                <span className="h-0.5 w-full bg-current rounded-full opacity-100 group-hover:opacity-0 transition-opacity duration-300"></span>
                <span className="h-0.5 w-full bg-current rounded-full transform origin-left group-hover:-rotate-45 transition-transform duration-300"></span>
              </div>
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
      <div className="relative pt-16 pb-24">
        <Suspense fallback={<div>Loading...</div>}>
          <ChatContent
            showDeleteConfirmModal={showDeleteConfirmModal}
            setShowDeleteConfirmModal={setShowDeleteConfirmModal}
          />
    </Suspense>
      </div>
    </div>
  );
}

