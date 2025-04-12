"use client";
export const dynamic = "force-dynamic";

import React, { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doc, getDoc, updateDoc, increment,
  collection, addDoc, serverTimestamp, query, orderBy, getDocs, deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { extractKeywords, updateMindmapKeywords } from "@/lib/mindmapUtils";
import clsx from "clsx";

type Message = { sender: "user" | "gpt"; content: string; timestamp?: string };
type Recommendation = { id: number; text: string };

// 원래의 로직 + UI를 모두 ChatContent라는 컴포넌트로 분리
function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nameParam = searchParams.get("name") || "사용자";
  const storedUsername = useRef<string | null>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

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
          setProfile(data);

          const {
            name, birthYear, birthMonth, birthDay, gender, height, weight,
            visionLeft, visionRight, exerciseFrequency, dietType,
            sleepQuality, healthGoal, allergies
          } = data;

          const profileMsg = `
안녕하세요 ${name || nameParam}님! 😊
현재 등록된 건강정보를 확인해주시겠어요?

- 생년월일: ${birthYear}-${birthMonth}-${birthDay}
- 성별: ${gender}
- 키: ${height}cm
- 몸무게: ${weight}kg
- 시력 (좌: ${visionLeft} / 우: ${visionRight})
- 운동 빈도: ${exerciseFrequency}
- 식습관: ${dietType}
- 수면의 질: ${sleepQuality}
- 건강 목표: ${healthGoal}
- 알레르기 정보: ${allergies}

위 정보가 맞다면 채팅창에 "맞아"라고 입력해주세요.
회원정보 수정이 필요하시다면 "마이페이지"에서 수정 후 다시 돌아와 주세요.`.trim();

          addMessage("gpt", profileMsg);
          await addDoc(collection(db, "users", storedUsername.current!, "chatLogs"), {
            sender: "gpt",
            content: profileMsg,
            timestamp: serverTimestamp()
          });
        }

        const chatRef = collection(db, "users", storedUsername.current!, "chatLogs");
        const q = query(chatRef, orderBy("timestamp"));
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

  const extractRecommendations = async (reply: string | undefined) => {
    if (!reply) return;
    const marker = "[추천]";
    if (!reply.includes(marker)) return;

    const parts = reply.split(marker);
    if (parts.length < 2) return;

    const recString = parts[1].trim();
    const lines = recString.split("\n").map((l) => l.trim());
    const recLines = lines.filter((line) => line.startsWith("- "));

    const newKeywords: string[] = [];

    recLines.forEach((line) => {
      const content = line.replace(/^-\s*/, "").trim();
      const name = content.split(":")[0].trim();

      if (!recommendations.some((rec) => rec.text === content)) {
        const uniqueId = Date.now() + Math.random();
        setRecommendations((prev) => [...prev, { id: uniqueId, text: content }]);
        newKeywords.push(name);
      }
    });

    if (newKeywords.length > 0 && storedUsername.current) {
      for (const kw of newKeywords) {
        await updateMindmapKeywords(storedUsername.current, [kw]);
      }
    }
  };

  const handleDeleteAllMessages = async () => {
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

      setMessages([]);

      // ✅ 삭제 후 대화 다시 로드!
      const reload = query(collection(db, "users", username, "chatLogs"), orderBy("timestamp"));
      const reloadSnap = await getDocs(reload);
      const loadedMessages: Message[] = [];
      reloadSnap.forEach((doc) => {
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

      alert("모든 채팅 내역이 삭제되었습니다.");
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    addMessage("user", userMsg);
    setInput("");
    setLoading(true);

    const keywords = extractKeywords(userMsg);
    if (keywords.length > 0 && storedUsername.current) {
      await updateMindmapKeywords(storedUsername.current, keywords);
    }

    const chatRef = collection(db, "users", storedUsername.current!, "chatLogs");
    await addDoc(chatRef, {
      sender: "user",
      content: userMsg,
      timestamp: serverTimestamp(),
    });

    // 기존 대화 중 "[추천]"이 포함된 GPT 메시지를 필터링해서 서버로 전송
    const filteredConversation = messages.filter(
      (msg) => !(msg.sender === "gpt" && msg.content.includes("[추천]"))
    );

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation: filteredConversation.concat({ sender: "user", content: userMsg }),
        userInfo: profile,
        message: userMsg,
      }),
    });

    const data = await res.json();
    const reply = data.reply;
    addMessage("gpt", reply);
    await extractRecommendations(reply);

    await addDoc(chatRef, {
      sender: "gpt",
      content: reply,
      timestamp: serverTimestamp(),
    });

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 relative flex flex-col">
      <header className="w-full bg-white shadow py-4 px-6 flex items-center fixed top-0 left-0 z-50">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-gray-700 hover:text-gray-900"
        >
          &larr; 뒤로가기
        </button>
        <h1 className="flex-grow text-center text-xl font-bold text-blue-600">
          Nutri AI 채팅
        </h1>
      </header>

      <div className="flex-grow pt-16 flex flex-col items-center">
        <div className="w-full max-w-2xl px-4">
          <div className="bg-white border rounded-lg shadow p-4 h-[60vh] overflow-y-auto relative mt-2 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={clsx(
                  "flex flex-col animate-fadeIn",
                  msg.sender === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={clsx(
                    "px-4 py-2 rounded-xl text-sm max-w-[75%] whitespace-pre-line",
                    msg.sender === "user"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-800 rounded-bl-none"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-gray-400 mt-1">{msg.timestamp}</span>
              </div>
            ))}
            {loading && (
              <p className="text-sm text-center text-gray-400">
                AI가 생각 중입니다...
              </p>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="w-full max-w-2xl px-4 mt-4 flex flex-col gap-1 text-center text-gray-500 text-sm">
          <p>
            과거 상담이력이 많을 경우 데이터가 중복되어 상담에 어려움이 발생할 수 있습니다.
            <br />
            채팅내역을 초기화 하시면 보다 정확한 상담이 가능합니다.
          </p>
          <button
            onClick={handleDeleteAllMessages}
            className="text-sm text-red-500 underline hover:text-red-700 mt-2"
          >
            전체 대화 삭제
          </button>
        </div>

        <div className="w-full max-w-2xl px-4 mt-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="궁금한 내용을 입력하세요..."
              className="flex-grow p-3 border rounded resize-none h-16"
            />
            <button
              onClick={handleSend}
              disabled={loading || input.trim() === ""}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              보내기
            </button>
          </div>
        </div>
      </div>

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
      `}</style>
    </main>
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
