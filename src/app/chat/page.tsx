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
import { productList, Product } from '@/lib/products';
import { motion } from "framer-motion";

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

// 원래의 로직 + UI를 모두 ChatContent라는 컴포넌트로 분리
function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nameParam = searchParams.get("name") || "사용자";
  const storedUsername = useRef<string | null>(null);

  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [selectedSupplement, setSelectedSupplement] = useState<Recommendation | null>(null);
  const [subscribedProducts, setSubscribedProducts] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

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

        const loadedMessages: Message[] = [];
        querySnap.forEach((doc) => {
          const data = doc.data();
          loadedMessages.push({
            sender: data.sender,
            content: data.content,
            timestamp: data.timestamp?.toDate().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) || "",
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

  const addMessage = (sender: "user" | "gpt", content: string) => {
    const newMessage: Message = {
      sender,
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const calculateSubscriptionPrice = (product: Product, dailyDosage: number) => {
    const basePrice = product.pricePerUnit * dailyDosage * 30; // 1개월 기본 가격
    const monthlyDiscount = Math.floor(basePrice * 0.05); // 5% 할인
    const annualDiscount = Math.floor(basePrice * 12 * 0.15); // 15% 할인

    return {
      monthly: basePrice - monthlyDiscount - FIRST_SUBSIDY, // 월간 구독 (5% 할인 + 첫 구독 지원금)
      annual: (basePrice * 12) - annualDiscount - FIRST_SUBSIDY, // 연간 구독 (15% 할인 + 첫 구독 지원금)
      once: basePrice - FIRST_SUBSIDY // 1회성 구독 (첫 구독 지원금만)
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

  const extractRecommendations = async (reply: string | undefined) => {
    if (!reply) {
      console.log('응답이 없습니다.');
      return;
    }
    const marker = "[추천]";
    if (!reply.includes(marker)) {
      console.log('추천 마커를 찾을 수 없습니다:', reply);
      return;
    }

    const parts = reply.split(marker);
    if (parts.length < 2) {
      console.log('추천 섹션을 찾을 수 없습니다.');
      return;
    }

    const recString = parts[1].trim();
    console.log('추출된 추천 문자열:', recString);
    
    const lines = recString.split("\n").map((l) => l.trim());
    console.log('분리된 라인들:', lines);
    
    const recLines = lines.filter((line) => line.startsWith("- "));
    console.log('추천 라인들:', recLines);

    const newKeywords: string[] = [];

    recLines.forEach((line) => {
      console.log('처리 중인 라인:', line);
      const content = line.replace(/^-\s*/, "").trim();
      console.log('정제된 내용:', content);
      
      // 콜론이나 공백으로 분리 시도
      let name, dosageStr;
      if (content.includes(":")) {
        [name, dosageStr] = content.split(":");
      } else {
        const parts = content.split(/\s+/);
        name = parts[0];
        dosageStr = parts[parts.length - 1];
      }
      
      console.log('제품명:', name?.trim(), '용량:', dosageStr?.trim());
      
      // 숫자만 추출
      const dosage = parseInt(dosageStr?.match(/\d+/)?.[0] || "0");
      console.log('파싱된 용량:', dosage);
      
      const product = productList.find(p => p.name === name?.trim());
      if (product && !subscribedProducts.includes(product.name)) {
        console.log('매칭된 제품:', product);
        const monthlyPrice = product.pricePerUnit * dosage * 30;
        const subscriptionPrices = calculateSubscriptionPrice(product, dosage);
        
        const uniqueId = Date.now() + Math.random();
        const newRecommendation = { 
          id: uniqueId.toString(), 
          text: content,
          name: name.trim(),
          productName: product.name,
          dailyDosage: dosage,
          dosageSchedule: calculateDosageSchedule(name.trim(), dosage, userInfo!),
          pricePerUnit: product.pricePerUnit,
          monthlyPrice: monthlyPrice
        };
        console.log('새로운 추천:', newRecommendation);
        
        // 중복 체크 후 추가
        setRecommendations((prev) => {
          // 이미 같은 제품이 있는지 확인
          const exists = prev.some(r => r.productName === newRecommendation.productName);
          if (!exists) {
            return [...prev, newRecommendation];
          }
          return prev;
        });
        newKeywords.push(name.trim());
      } else {
        console.log('제품을 찾을 수 없거나 이미 구독 중:', name?.trim());
      }
    });

    if (newKeywords.length > 0 && storedUsername.current) {
      console.log('새로운 키워드들:', newKeywords);
      for (const kw of newKeywords) {
        await updateMindmapKeywords(storedUsername.current, [kw]);
      }
    }
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

    addMessage("gpt", profileMsg);
    await addDoc(collection(db, "users", storedUsername.current!, "chatLogs"), {
      sender: "gpt",
      content: profileMsg,
      timestamp: serverTimestamp()
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

    try {
      const chatRef = collection(db, "users", username, "chatLogs");
      const q = query(chatRef);
      const snap = await getDocs(q);

      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }

      // 채팅과 추천 목록 초기화
      setMessages([]);
      setRecommendations([]);
      localStorage.removeItem('chatRecommendations');  // 로컬 스토리지에서도 제거

      // 프로필 정보 다시 표시
      await showProfileMessage();
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
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

  const handleSend = async () => {
    if (!input.trim()) return;

    const currentMessage = input.trim();
    setInput("");
    setLoading(true);
    addMessage("user", currentMessage);

    try {
      console.log('전송할 사용자 정보:', userInfo);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
          userInfo: userInfo || {
            username: storedUsername.current,
            gender: '남',
            height: 178,
            weight: 60,
            leftVision: 1.0,
            rightVision: 1.0,
            exerciseFrequency: '주 3-4회',
            dietType: '일반',
            sleepQuality: '보통',
            healthGoal: '건강 유지',
            allergies: '',
            supplements: '',
            medicalHistory: '',
            birthYear: '1990',
            birthMonth: '01',
            birthDay: '01'
          },
          conversation: messages
        }),
      });

      if (!res.ok) {
        throw new Error('API 응답 오류');
      }

      const data = await res.json();
      console.log('API 응답:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      const { reply, supplements } = data;
      
      if (reply) {
        addMessage("gpt", reply);
        await addDoc(collection(db, "users", storedUsername.current!, "chatLogs"), {
          sender: "gpt",
          content: reply,
          timestamp: serverTimestamp(),
        });

        // 텍스트에서 추천 추출
        console.log('텍스트에서 추천 추출 시도');
        await extractRecommendations(reply);
      }

      // supplements 데이터가 있는 경우에만 처리
      if (supplements && Array.isArray(supplements) && supplements.length > 0) {
        console.log('서버에서 받은 추천 영양제:', supplements);
        setRecommendations(prev => {
          const newRecs = [...prev];
          supplements.forEach(supp => {
            if (!newRecs.some(r => r.productName === supp.productName)) {
              newRecs.push(supp);
            }
          });
          return newRecs;
        });
      }

      // Firestore에 메시지 저장
      const chatRef = collection(db, "users", storedUsername.current!, "chatLogs");
      await addDoc(chatRef, {
        sender: "gpt",
        content: reply,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('메시지 전송 중 오류:', error);
      addMessage("gpt", "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleSupplementClick = (supplement: any) => {
    setSelectedSupplement(supplement);
    setShowSubscriptionModal(true);
  };

  const handleSubscription = (plan: string) => {
    if (!selectedSupplement) return;
    
    const subscriptionPrices = calculateSubscriptionPrice(
      productList.find(p => p.name === selectedSupplement.productName)!,
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
        <button 
          onClick={() => router.back()} 
          className="text-gray-600 flex items-center"
        >
          <span className="mr-1">←</span> 뒤로가기
        </button>
        <h1 className="text-lg font-semibold text-blue-600">
          Nutri AI 채팅
        </h1>
        <button
          onClick={handleDeleteAllMessages}
          className="text-red-600 text-sm"
        >
          기록 삭제
        </button>
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 overflow-y-auto pt-16 pb-24">
        <div className="max-w-screen-md mx-auto px-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              } mb-4`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] break-words ${
                  msg.sender === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-800 shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                <div className="flex items-center space-x-1">
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-screen-md mx-auto p-4">
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`rounded-full px-6 py-2 text-white ${
                loading || !input.trim()
                  ? "bg-gray-400"
                  : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
              }`}
            >
              전송
            </button>
          </form>
        </div>
      </div>

      {/* 추천 영양제 사이드바 */}
      <div className={`fixed top-16 right-0 bottom-0 w-full max-w-[300px] bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0`}>
        {/* 모바일용 사이드바 토글 버튼 */}
        <button
          onClick={toggleSidebar}
          className="absolute -left-12 top-1/2 -translate-y-1/2 bg-blue-500 text-white py-16 px-2 rounded-l-lg flex items-center md:hidden shadow-lg hover:bg-blue-600 transition-colors"
        >
          <div className="writing-mode-vertical flex items-center space-y-2">
            <span className="transform rotate-180">→</span>
            <span className="whitespace-nowrap">추천 영양제 목록</span>
            <span className="transform rotate-180">→</span>
          </div>
        </button>

        <div className="p-4 h-full flex flex-col">
          <h2 className="text-lg font-semibold mb-4">추천 영양제</h2>
          {recommendations.length > 0 ? (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto">
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg relative group"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => handleSupplementClick(rec)}
                    >
                      <h3 className="font-medium">{rec.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        하루 {rec.dailyDosage}알
                      </p>
                      <div className="text-xs text-gray-500 bg-white p-2 rounded border border-gray-100">
                        <p className="font-medium mb-1 text-gray-700">복용 시간</p>
                        {rec.dosageSchedule?.map((schedule, idx) => (
                          <div key={idx} className="flex justify-between items-center mb-1 py-1 border-b border-gray-50 last:border-0">
                            <span className="flex items-center">
                              {schedule.time === "아침" && "🌅"}
                              {schedule.time === "점심" && "🌞"}
                              {schedule.time === "저녁" && "🌙"}
                              {schedule.time === "취침전" && "😴"}
                              <span className="ml-1">{schedule.time}</span>
                            </span>
                            <span className="font-medium text-blue-600">{schedule.amount}알</span>
                          </div>
                        ))}
                      </div>
                      {rec.reason && (
                        <p className="text-xs text-gray-600 mt-2">
                          💡 {rec.reason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRecommendation(rec.productName);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSubscribeAll}
                className="mt-4 w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition"
              >
                이대로 건강구독하기
              </button>
            </>
          ) : (
            <p className="text-gray-500 text-center">
              아직 추천된 영양제가 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* 구독 모달 */}
      {showSubscriptionModal && selectedSupplement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">영양제 구독하기</h3>
            <p className="mb-2">{selectedSupplement.text || selectedSupplement.name}</p>
            <p className="text-sm text-gray-600 mb-4">
              하루 {selectedSupplement.dailyDosage}알 × {selectedSupplement.pricePerUnit.toLocaleString()}원
            </p>
            
            <div className="bg-red-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-red-600 mb-2">📦 구독 혜택</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✔ 배송비 무료 -{SHIPPING_COST.toLocaleString()}원</li>
                <li>✔ 건강설문 할인(AI) -{SURVEY_DISCOUNT.toLocaleString()}원</li>
                <li>✔ 첫구독 시작 지원금 -{FIRST_SUBSIDY.toLocaleString()}원</li>
              </ul>
            </div>

            <div className="space-y-3">
              {(() => {
                const prices = calculateSubscriptionPrice(
                  productList.find(p => p.name === selectedSupplement.productName)!,
                  selectedSupplement.dailyDosage
                );
                return (
                  <>
                    <button
                      onClick={() => handleSubscription('monthly')}
                      className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition"
                    >
                      월간 구독 ({Math.round(prices.monthly).toLocaleString()}원/월) - 5% 할인
                    </button>
                    <button
                      onClick={() => handleSubscription('annual')}
                      className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition"
                    >
                      연간 구독 ({Math.round(prices.annual).toLocaleString()}원/년) - 15% 할인
                    </button>
                    <button
                      onClick={() => handleSubscription('once')}
                      className="w-full bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition"
                    >
                      단기 구독 ({prices.once.toLocaleString()}원)
                    </button>
                  </>
                );
              })()}
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <p>※ 정기구독은 언제든지 해지 가능합니다.</p>
              <p>※ 첫 구독 시 지원금이 자동 적용됩니다.</p>
            </div>

            <button
              onClick={() => setShowSubscriptionModal(false)}
              className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700"
            >
              닫기
            </button>
          </div>
        </div>
      )}

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
              >
                아니오
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
              >
                예
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full bg-white shadow py-2 px-4 text-center text-sm text-gray-600 mt-4">
        © 2025 Nutri AI. All rights reserved.
      </footer>

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
        .writing-mode-vertical {
          writing-mode: vertical-rl;
          text-orientation: upright;
        }
      `}</style>
    </div>
  );
}

// Suspense로 감싸는 실제 페이지 컴포넌트
export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading Chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
