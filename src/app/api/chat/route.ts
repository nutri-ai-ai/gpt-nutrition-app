import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getDoc, getDocs, doc, collection, query, orderBy } from 'firebase/firestore'
import { products } from '@/lib/products'
import { OpenAI } from 'openai'

// 영양제 추천 및 섭취량 계산을 위한 타입 정의
type SupplementRecommendation = {
  name: string;
  dailyDosage: number;
  dosageSchedule: {
    time: "아침" | "점심" | "저녁" | "취침전";
    amount: number;
  }[];
  reason: string;
  benefits: string[];
  precautions: string[];
};

interface UserHealthInfo {
  gender: string;
  height: number;
  weight: number;
  leftVision: number;
  rightVision: number;
  exerciseFrequency: string;
  dietType: string;
  sleepQuality: '좋음' | '보통' | '나쁨' | '매우 나쁨';
  healthGoal: string;
  allergies: string;
  supplements: string;
  medicalHistory: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
}

// 복용 시간 계산 함수 추가
const calculateDosageSchedule = (
  supplementName: string,
  dailyDosage: number,
  userInfo: UserHealthInfo
): { time: "아침" | "점심" | "저녁" | "취침전"; amount: number; }[] => {
  const schedule: { time: "아침" | "점심" | "저녁" | "취침전"; amount: number; }[] = [];
  
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

// 사용자 정보 기반 영양제 추천 계산
const calculateSupplementRecommendations = (
  userInfo: UserHealthInfo,
  subscribedProducts: string[]
): SupplementRecommendation[] => {
  const recommendations: SupplementRecommendation[] = [];
  
  // BMI 계산
  const heightInMeters = userInfo.height / 100;
  const bmi = userInfo.weight / (heightInMeters * heightInMeters);
  
  // 나이 계산
  const birthDate = new Date(
    parseInt(userInfo.birthYear),
    parseInt(userInfo.birthMonth) - 1,
    parseInt(userInfo.birthDay)
  );
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();

  // 기본 영양제 추천 로직
  if (userInfo.gender === '여성' && !subscribedProducts.includes('트리플러스 우먼')) {
    const baseDosage = 1;
    let adjustedDosage = baseDosage;
    
    if (bmi > 25 || userInfo.exerciseFrequency === '주 3회 이상') {
      adjustedDosage += 1;
    }
    if (age >= 50) {
      adjustedDosage += 1;
    }
    adjustedDosage = Math.min(adjustedDosage, 3);
    
    const product = products.find(p => p.name === '트리플러스 우먼');
    if (product) {
      recommendations.push({
        name: product.name,
        dailyDosage: adjustedDosage,
        reason: '여성 건강을 위한 종합 영양제',
        benefits: product.tags,
        precautions: ['임신 중이거나 수유 중인 경우 의사와 상담 필요'],
        dosageSchedule: calculateDosageSchedule(product.name, adjustedDosage, userInfo)
      });
    }
  }

  // 시력 기반 추천
  if ((userInfo.leftVision < 0.8 || userInfo.rightVision < 0.8) && 
      !subscribedProducts.includes('루테인')) {
    const baseDosage = 1;
    let adjustedDosage = baseDosage;
    
    if (userInfo.leftVision < 0.5 || userInfo.rightVision < 0.5) {
      adjustedDosage += 1;
    }
    if (age >= 40) {
      adjustedDosage += 1;
    }
    adjustedDosage = Math.min(adjustedDosage, 3);
    
    const product = products.find(p => p.name === '루테인');
    if (product) {
      recommendations.push({
        name: product.name,
        dailyDosage: adjustedDosage,
        reason: '시력 보호와 눈 건강 지원',
        benefits: product.tags,
        precautions: ['과다 섭취 시 피부 변색 가능성'],
        dosageSchedule: calculateDosageSchedule(product.name, adjustedDosage, userInfo)
      });
    }
  }

  // 운동 빈도 기반 추천
  if (userInfo.exerciseFrequency === '주 3회 이상' && 
      !subscribedProducts.includes('아르기닌 500mg')) {
    const baseDosage = 2;
    let adjustedDosage = baseDosage;
    
    if (userInfo.weight >= 80) {
      adjustedDosage += 1;
    }
    if (userInfo.healthGoal === '근육 증가' || userInfo.healthGoal === '체력 향상') {
      adjustedDosage += 1;
    }
    adjustedDosage = Math.min(adjustedDosage, 4);
    
    const product = products.find(p => p.name === '아르기닌 500mg');
    if (product) {
      recommendations.push({
        name: product.name,
        dailyDosage: adjustedDosage,
        reason: '운동 성능 향상과 근육 회복',
        benefits: product.tags,
        precautions: ['저혈압 환자는 주의 필요'],
        dosageSchedule: calculateDosageSchedule(product.name, adjustedDosage, userInfo)
      });
    }
  }

  // 수면의 질 기반 추천
  if ((userInfo.sleepQuality === '나쁨' || userInfo.sleepQuality === '매우 나쁨') && 
      !subscribedProducts.includes('마그네슘')) {
    const baseDosage = 1;
    let adjustedDosage = baseDosage;
    
    if (userInfo.sleepQuality === '매우 나쁨') {
      adjustedDosage += 1;
    }
    if (userInfo.exerciseFrequency === '주 3회 이상') {
      adjustedDosage += 1;
    }
    adjustedDosage = Math.min(adjustedDosage, 3);
    
    const product = products.find(p => p.name === '마그네슘');
    if (product) {
      recommendations.push({
        name: product.name,
        dailyDosage: adjustedDosage,
        reason: '수면의 질 개선과 스트레스 완화',
        benefits: product.tags,
        precautions: ['신장 질환이 있는 경우 의사와 상담 필요'],
        dosageSchedule: calculateDosageSchedule(product.name, adjustedDosage, userInfo)
      });
    }
  }

  // 면역력 강화 추천
  if (!subscribedProducts.includes('비타민 D')) {
    const baseDosage = 1;
    let adjustedDosage = baseDosage;
    
    if (age >= 50) {
      adjustedDosage += 1;
    }
    adjustedDosage = Math.min(adjustedDosage, 2);
    
    const product = products.find(p => p.name === '비타민 D');
    if (product) {
      recommendations.push({
        name: product.name,
        dailyDosage: adjustedDosage,
        reason: '면역력 강화와 뼈 건강 지원',
        benefits: product.tags,
        precautions: ['고용량 복용 시 의사와 상담 필요'],
        dosageSchedule: calculateDosageSchedule(product.name, adjustedDosage, userInfo)
      });
    }
  }

  return recommendations;
};

// 새로운 타입 정의 추가
type FoodRecommendation = {
  category: string;
  foods: Array<{
    name: string;
    nutrients: string[];
    benefits: string[];
    servingSize: string;
  }>;
  reason: string;
};

type ExerciseRoutine = {
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
};

// 음식 추천 계산 함수
const calculateFoodRecommendations = (userInfo: UserHealthInfo): FoodRecommendation[] => {
  const recommendations: FoodRecommendation[] = [];
  const bmi = userInfo.weight / ((userInfo.height / 100) ** 2);

  // BMI 기반 추천
  if (bmi > 25) {
    recommendations.push({
      category: '체중 관리를 위한 식품',
      foods: [
        {
          name: '퀴노아',
          nutrients: ['단백질', '식이섬유', '철분'],
          benefits: ['포만감 증진', '혈당 조절', '체중 관리'],
          servingSize: '1끼니당 50g'
        },
        {
          name: '렌틸콩',
          nutrients: ['단백질', '식이섬유', '엽산'],
          benefits: ['포만감 유지', '콜레스테롤 관리'],
          servingSize: '1끼니당 40g'
        }
      ],
      reason: '체중 관리와 포만감 유지를 위한 저칼로리 고단백 식품'
    });
  }

  // 운동 빈도 기반 추천
  if (userInfo.exerciseFrequency === '주 3회 이상') {
    recommendations.push({
      category: '운동 성과 개선을 위한 식품',
      foods: [
        {
          name: '고구마',
          nutrients: ['복합탄수화물', '베타카로틴', '비타민C'],
          benefits: ['지구력 향상', '근육 글리코겐 보충'],
          servingSize: '1회 150g'
        },
        {
          name: '닭가슴살',
          nutrients: ['단백질', '비타민B6', '나이아신'],
          benefits: ['근육 회복', '단백질 보충'],
          servingSize: '1회 120g'
        }
      ],
      reason: '운동 전후 영양 보충과 근육 회복 지원'
    });
  }

  return recommendations;
};

// 운동 루틴 추천 계산 함수
const calculateExerciseRoutines = (userInfo: UserHealthInfo): ExerciseRoutine[] => {
  const routines: ExerciseRoutine[] = [];
  const bmi = userInfo.weight / ((userInfo.height / 100) ** 2);

  // 기본 유산소 운동
  routines.push({
    type: '유산소 운동',
    exercises: [
      {
        name: '빠르게 걷기',
        duration: '30분',
        intensity: '중간',
        description: '심박수를 올리되 대화가 가능한 속도 유지',
        benefits: ['심폐 기능 향상', '기초 체력 증진', '칼로리 소모']
      },
      {
        name: '실내 자전거',
        duration: '20분',
        intensity: '중간-높음',
        description: '저항을 조절하며 페달링',
        benefits: ['하체 근력 강화', '관절 부담 최소화']
      }
    ],
    frequency: '주 3-4회',
    precautions: ['관절에 통증이 있으면 즉시 중단', '충분한 준비운동 필수']
  });

  // BMI나 건강 목표에 따른 추가 운동
  if (bmi > 25 || userInfo.healthGoal === '체중 감량') {
    routines.push({
      type: 'HIIT 운동',
      exercises: [
        {
          name: '버피 테스트',
          duration: '30초 운동, 30초 휴식 x 4세트',
          intensity: '높음',
          description: '전신 운동으로 최대 칼로리 소모',
          benefits: ['체지방 감소', '심폐 지구력 향상']
        },
        {
          name: '마운틴 클라이머',
          duration: '30초 운동, 30초 휴식 x 4세트',
          intensity: '높음',
          description: '플랭크 자세에서 무릎 번갈아 당기기',
          benefits: ['코어 강화', '체지방 감소']
        }
      ],
      frequency: '주 2-3회',
      precautions: ['초보자는 세트 수 조절 필요', '충분한 수분 섭취 필수']
    });
  }

  return routines;
};

export async function POST(req: Request) {
  try {
    const { message, userInfo, username, conversation } = await req.json();

    // OpenAI 클라이언트 초기화
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // 사용자의 구독 정보 가져오기
    let subscribedProducts: string[] = [];
    if (username) {
      const subRef = collection(db, "users", username, "subscriptions");
      const q = query(subRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      subscribedProducts = querySnapshot.docs
        .filter(doc => doc.data().status === "active")
        .map(doc => doc.data().supplement?.productName || "");
    }

    // 영양제 추천 계산
    const supplementRecommendations = calculateSupplementRecommendations(userInfo, subscribedProducts);
    
    // 영양제 정보를 products 배열에서 찾아서 보강
    const supplements = supplementRecommendations.map(rec => {
      const product = products.find(p => p.name === rec.name);
      const monthlyDosage = rec.dailyDosage * 30; // 한 달 복용량
      const dailyPrice = (product?.pricePerUnit || 0) * rec.dailyDosage; // 하루 복용 가격
      const monthlyPrice = dailyPrice * 30; // 한 달 구독 가격
      
      return {
        id: `${Date.now()}-${Math.random()}`,
        name: rec.name,
        description: product?.description || '',
        category: product?.category || '',
        pricePerUnit: product?.pricePerUnit || 0,
        monthlyPrice: monthlyPrice || 0, // 기본값 추가
        monthlyDosage,
        tags: product?.tags || [],
        reason: rec.reason,
        dailyDosage: rec.dailyDosage,
        dosageSchedule: rec.dosageSchedule,
        benefits: rec.benefits,
        precautions: rec.precautions
      };
    });

    // 음식과 운동 추천 계산
    const foodRecommendations = calculateFoodRecommendations(userInfo);
    const exerciseRoutines = calculateExerciseRoutines(userInfo);

    // AI 응답 생성
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `당신은 Nutri AI 영양 상담 전문가입니다. 답변은 항상 간단명료하게 제공하되, 다음 형식을 따르세요:

1. 건강 상태 요약 (1-2문장)
2. 개선이 필요한 부분 (1-2문장)
3. 추천 사항 (영양제/운동/식단)

영양제 추천 시 반드시 '[추천]' 마커를 사용하고 각 영양제의 이름과 복용량을 명확히 표시하세요.
예시: [추천]\n- 마그네슘: 1알\n- 비타민D: 2알

답변은 항상 한국어로 작성하고, 전문 용어는 가능한 쉽게 설명하세요.`
        },
        ...conversation.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500 // 토큰 수 제한으로 응답 속도 개선
    });

    let aiReply = completion.choices[0].message.content || "";

    // 영양제 추천이 있는 경우, 추천 정보를 응답에 포함
    if (supplements.length > 0 && !aiReply.includes('[추천]')) {
      const recommendationsText = supplements
        .map(rec => `- ${rec.name}: ${rec.dailyDosage}알 (월 ${rec.monthlyPrice.toLocaleString()}원)`)
        .join('\n');
      aiReply += `\n\n[추천]\n${recommendationsText}`;
    }

    console.log('응답 데이터:', { 
      reply: aiReply,
      supplements,
      foodRecommendations,
      exerciseRoutines 
    });

    // 응답 반환
    return NextResponse.json({
      reply: aiReply,
      supplements,
      foodRecommendations,
      exerciseRoutines
    });

  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
