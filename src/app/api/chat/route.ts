import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getDoc, getDocs, doc, collection, query, orderBy } from 'firebase/firestore'
import { productList } from '@/lib/products'
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
    // BMI, 운동 빈도, 나이를 고려한 섭취량 조정
    let adjustedDosage = baseDosage;
    
    if (bmi > 25 || userInfo.exerciseFrequency === '주 3회 이상') {
      adjustedDosage += 1;
    }
    if (age >= 50) {
      adjustedDosage += 1;
    }
    // 최대 3알까지만 섭취
    adjustedDosage = Math.min(adjustedDosage, 3);
    
    recommendations.push({
      name: '트리플러스 우먼',
      dailyDosage: adjustedDosage,
      reason: '여성 건강을 위한 종합 영양제',
      benefits: ['여성 호르몬 균형', '에너지 증진', '피부 건강'],
      precautions: ['임신 중이거나 수유 중인 경우 의사와 상담 필요'],
      dosageSchedule: calculateDosageSchedule('트리플러스 우먼', adjustedDosage, userInfo)
    });
  }

  // BMI 기반 추천
  if (bmi > 25 && !subscribedProducts.includes('밀크시슬')) {
    const baseDosage = 1;
    // BMI, 식습관을 고려한 섭취량 조정
    let adjustedDosage = baseDosage;
    
    if (bmi >= 30) {
      adjustedDosage += 1;
    }
    if (userInfo.dietType === '불규칙한 식사' || userInfo.dietType === '과식') {
      adjustedDosage += 1;
    }
    // 최대 3알까지만 섭취
    adjustedDosage = Math.min(adjustedDosage, 3);
    
    recommendations.push({
      name: '밀크시슬',
      dailyDosage: adjustedDosage,
      reason: '체중 관리와 간 건강 지원',
      benefits: ['간 기능 개선', '체중 관리', '디톡스'],
      precautions: ['간 질환이 있는 경우 의사와 상담 필요'],
      dosageSchedule: calculateDosageSchedule('밀크시슬', adjustedDosage, userInfo)
    });
  }

  // 시력 기반 추천
  if ((userInfo.leftVision < 0.8 || userInfo.rightVision < 0.8) && 
      !subscribedProducts.includes('루테인')) {
    const baseDosage = 1;
    // 시력, 나이를 고려한 섭취량 조정
    let adjustedDosage = baseDosage;
    
    if (userInfo.leftVision < 0.5 || userInfo.rightVision < 0.5) {
      adjustedDosage += 1;
    }
    if (age >= 40) {
      adjustedDosage += 1;
    }
    // 최대 3알까지만 섭취
    adjustedDosage = Math.min(adjustedDosage, 3);
    
    recommendations.push({
      name: '루테인',
      dailyDosage: adjustedDosage,
      reason: '시력 보호와 눈 건강 지원',
      benefits: ['시력 보호', '눈 피로 감소', '황반변성 예방'],
      precautions: ['과다 섭취 시 피부 변색 가능성'],
      dosageSchedule: calculateDosageSchedule('루테인', adjustedDosage, userInfo)
    });
  }

  // 운동 빈도 기반 추천
  if (userInfo.exerciseFrequency === '주 3회 이상' && 
      !subscribedProducts.includes('아르기닌')) {
    const baseDosage = 2;
    // 체중, 운동 빈도, 건강 목표를 고려한 섭취량 조정
    let adjustedDosage = baseDosage;
    
    if (userInfo.weight >= 80) {
      adjustedDosage += 1;
    }
    if (userInfo.healthGoal === '근육 증가' || userInfo.healthGoal === '체력 향상') {
      adjustedDosage += 1;
    }
    // 최대 4알까지만 섭취
    adjustedDosage = Math.min(adjustedDosage, 4);
    
    recommendations.push({
      name: '아르기닌',
      dailyDosage: adjustedDosage,
      reason: '운동 성능 향상과 근육 회복',
      benefits: ['운동 성능 향상', '근육 회복', '혈액 순환 개선'],
      precautions: ['저혈압 환자는 주의 필요'],
      dosageSchedule: calculateDosageSchedule('아르기닌', adjustedDosage, userInfo)
    });
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
    // 최대 3알까지만 섭취
    adjustedDosage = Math.min(adjustedDosage, 3);
    
    recommendations.push({
      name: '마그네슘',
      dailyDosage: adjustedDosage,
      reason: '수면의 질 개선과 스트레스 완화',
      benefits: ['수면의 질 개선', '스트레스 완화', '근육 이완'],
      precautions: ['신장 질환이 있는 경우 의사와 상담 필요'],
      dosageSchedule: calculateDosageSchedule('마그네슘', adjustedDosage, userInfo)
    });
  }

  // 각 추천에 복용 시간 정보 추가
  recommendations.forEach(rec => {
    rec.dosageSchedule = calculateDosageSchedule(rec.name, rec.dailyDosage, userInfo);
  });

  return recommendations;
};

export async function POST(req: Request) {
  try {
    const { message, userInfo, conversation } = await req.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키를 찾을 수 없습니다.' }, { status: 500 })
    }

    // 🔹 병렬로 데이터 조회
    const [userDoc, recSnapshot, subSnapshot] = await Promise.all([
      userInfo?.username ? getDoc(doc(db, 'users', userInfo.username)) : Promise.resolve(null),
      userInfo?.username ? getDocs(query(collection(db, 'users', userInfo.username, 'recommendations'), orderBy('createdAt', 'desc'))) : Promise.resolve(null),
      userInfo?.username ? getDocs(query(collection(db, 'users', userInfo.username, 'subscriptions'), orderBy('createdAt', 'desc'))) : Promise.resolve(null)
    ])

    // 🔹 구독 중인 제품 목록 처리
    const subscribedProducts: string[] = []
    if (subSnapshot) {
      subSnapshot.forEach(doc => {
        const data = doc.data()
        if (data.status === 'active' && data.supplement?.productName) {
          subscribedProducts.push(data.supplement.productName)
        }
      })
    }

    // 사용자 정보 기반 영양제 추천 계산
    console.log('받은 사용자 정보:', userInfo);
    
    if (!userInfo || !userInfo.gender || !userInfo.height || !userInfo.weight) {
      console.log('사용자 정보 누락:', { userInfo });
      return NextResponse.json({
        reply: "죄송합니다. 정확한 추천을 위해 사용자 정보가 필요합니다.",
        supplements: []
      });
    }

    // OpenAI API 호출 전에 추천 영양제 계산
    const supplementRecommendations = calculateSupplementRecommendations(userInfo, subscribedProducts);
    console.log('계산된 추천 영양제 (서버):', supplementRecommendations);

    // 추천 영양제 정보를 supplements 배열로 변환
    const supplements = supplementRecommendations.map((rec, index) => {
      const product = productList.find(p => p.name === rec.name);
      if (!product) {
        console.log('제품을 찾을 수 없음:', rec.name);
        return null;
      }
      
      return {
        id: `${Date.now()}-${index}`,
        text: `${rec.name}: ${rec.dailyDosage}알`,
        name: rec.name,
        productName: rec.name,
        dailyDosage: rec.dailyDosage,
        dosageSchedule: rec.dosageSchedule,
        pricePerUnit: product.pricePerUnit,
        reason: rec.reason,
        benefits: rec.benefits,
        precautions: rec.precautions
      };
    }).filter(Boolean);

    console.log('변환된 supplements 배열 (서버):', supplements);

    // OpenAI 클라이언트 초기화
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // 시스템 프롬프트 설정
    const systemPrompt = `
당신은 Nutri AI라는 이름의 영양제 상담 전문가입니다.

사용 가능한 제품 목록:
${productList.map(p => `- ${p.name} (${p.tags.join(', ')})`).join('\n')}

목표:
1. 사용자의 건강 고민을 듣고 위 제품 목록에서 적절한 영양제를 추천해주세요.
2. 추천할 때는 반드시 "[추천]" 섹션을 사용하여 제품명과 하루 섭취량을 명확히 표시해주세요.
   예시: "[추천]\n- 비타민C 1000: 1알 [아침]\n- 오메가3: 2알 [아침 1알, 저녁 1알]"
3. 가격 계산이나 월구독 금액 제안은 하지 마세요.
4. 모든 답변은 한국어로 작성하세요.
5. 중복 추천은 절대 하지 마세요.
6. 외부 브랜드는 언급하지 마세요.
7. 추천은 개인화된 섭취량, 성별, 키, 몸무게 등 고려하세요.
8. 궁금증이 끝나면 구독 신청을 제안하세요.
9. 사용자가 이미 구독 중인 제품은 고려하여 다른 제품을 추천하세요.
10. 사용자의 개인 정보를 기반으로 정확한 섭취량을 제안하세요.
11. 반드시 위 제품 목록에 있는 정확한 제품명을 사용하세요.
12. 복용 시간을 반드시 표시하고, 하루 2알 이상인 경우 시간대별로 나누어 복용하도록 안내하세요.

현재 추천 가능한 영양제 정보:
${supplementRecommendations.map(rec => 
  `- ${rec.name}: ${rec.dailyDosage}알
* 복용 시간: ${rec.dosageSchedule.map(s => `${s.time} ${s.amount}알`).join(', ')}
* 추천 이유: ${rec.reason}
* 주요 효과: ${rec.benefits.join(', ')}
* 주의사항: ${rec.precautions.join(', ')}`
).join('\n\n')}
`

    // 대화 메시지 배열 생성
    const messages = conversation.map((msg: { sender: string; content: string }) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.content
    }));

    // OpenAI API 호출
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply = response.choices[0].message.content;

    return NextResponse.json({
      reply,
      supplements,
      error: null
    });
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
