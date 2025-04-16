import { NextResponse } from 'next/server'
import { db } from '@/firebase/config'
import { getDoc, getDocs, doc, collection, query, orderBy, where } from 'firebase/firestore'
import { products, Product } from '@/lib/products'
import { OpenAI } from 'openai'

// 스케줄 인터페이스 명시적 정의
interface DosageSchedule {
  time: "아침" | "점심" | "저녁" | "취침전";
  amount: number;
  withMeal: boolean; // 식전/식후 여부
  reason: string;
}

// 추천 아이템 인터페이스 명시적 정의
interface SupplementRecommendation {
  supplement: Product;
  dosage: number;
  reason: string;
  schedule: DosageSchedule[];
}

// 사용자 건강정보 인터페이스
interface UserHealthInfo {
  username?: string;
  gender: string;
  height: number;
  weight: number;
  name?: string;
  birthDate: string;
}

// 복용 스케줄 계산
const calculateDosageSchedule = (supplementName: string, userInfo: UserHealthInfo): DosageSchedule[] => {
  // 복용 스케줄 초기값
  const schedule: DosageSchedule[] = [];
  
  // 각 영양제별 맞춤 스케줄 설정
  switch (supplementName) {
    case '오메가3':
      schedule.push({ 
        time: "아침", 
        amount: 1,
        withMeal: true,  // 식사와 함께 복용
        reason: "오메가3는 지용성 영양소로 식사 중 지방과 함께 섭취하면 흡수율이 높아집니다."
      });
      break;
      
    case '마그네슘':
      schedule.push({ 
        time: "취침전", 
        amount: 1,
        withMeal: false,
        reason: "마그네슘은 수면에 도움을 주므로 취침 전 복용이 효과적입니다."
      });
      break;
      
    case '비타민C':
      schedule.push({ 
        time: "아침", 
        amount: 1,
        withMeal: false,
        reason: "비타민C는 수용성 비타민으로 공복에 복용하면 빠르게 흡수됩니다."
      });
      break;
      
    case '비타민D':
      schedule.push({ 
        time: "아침", 
        amount: 1,
        withMeal: true,
        reason: "비타민D는 지용성 비타민으로 식사와 함께 복용 시 흡수가 잘 됩니다."
      });
      break;
      
    case '루테인':
      schedule.push({ 
        time: "점심", 
        amount: 1,
        withMeal: true, 
        reason: "루테인은 지용성 성분으로 식사와 함께 복용하면 흡수가 잘 됩니다."
      });
      break;
      
    case '프로바이오틱스':
      schedule.push({ 
        time: "아침", 
        amount: 1,
        withMeal: false,
        reason: "프로바이오틱스는 위산이 적은 식전 공복 상태에서 더 많은 유산균이 장까지 도달할 수 있습니다."
      });
      break;
      
    default:
      schedule.push({ 
        time: "아침", 
        amount: 1,
        withMeal: true,
        reason: "일반적으로 영양제는 식사와 함께 복용하면 흡수율이 높아집니다."
      });
  }
  
  return schedule;
};

// 유저의 건강 정보와 성향에 따라 영양제 추천
const recommendSupplements = (userInfo: UserHealthInfo): SupplementRecommendation[] => {
  const recommendations: SupplementRecommendation[] = [];
  
  try {
    // 성별 정규화
    const normalizedGender = userInfo.gender.toLowerCase().includes('female') || 
                             userInfo.gender.toLowerCase().includes('여') ? 'female' : 'male';
    
    // 나이 계산 (생년월일로부터)
    let age = 0;
    try {
      const birthDate = new Date(userInfo.birthDate);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      
      // 생일이 지나지 않았으면 나이 -1
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    } catch (e) {
      console.error('생년월일 파싱 오류:', e);
      age = 35; // 기본값
    }
    
    // 연령 구간
    let ageGroup: 'under30' | 'between30And50' | 'above50';
    if (age < 30) ageGroup = 'under30';
    else if (age >= 30 && age < 50) ageGroup = 'between30And50';
    else ageGroup = 'above50';
    
    // 체질량지수 (BMI) 계산
    const heightInMeters = userInfo.height / 100;
    const bmi = userInfo.weight / (heightInMeters * heightInMeters);
    
    // 각 영양제 추천 로직
    
    // 1. 비타민D
    if (age > 25 || normalizedGender === 'female') {
      const vitaminD = products.find(p => p.name === '비타민D');
      if (vitaminD) {
        // 복용량 계산
        let dosage = 1; // 기본 복용량
        
        // 나이에 따른 조정
        if (vitaminD.dosageCalculation?.ageFactor) {
          dosage *= vitaminD.dosageCalculation.ageFactor[ageGroup] || 1;
        }
        
        // 최대 복용량 적용
        if (vitaminD.dosageCalculation?.maxDosage) {
          const maxTablets = Math.ceil(vitaminD.dosageCalculation.maxDosage / 
            (vitaminD.dosageInfo?.tabletSize || 1000));
          dosage = Math.min(dosage, maxTablets);
        }
        
        dosage = Math.max(1, Math.round(dosage)); // 최소 1정, 반올림
        
        recommendations.push({
          supplement: vitaminD,
          dosage: dosage,
          reason: `${age}세 ${normalizedGender === 'female' ? '여성' : '남성'}의 경우 비타민D가 뼈 건강과 면역력 강화에 중요합니다.`,
          schedule: calculateDosageSchedule('비타민D', userInfo)
        });
      }
    }
    
    // 2. 프로바이오틱스 (모든 연령대 권장)
    const probiotics = products.find(p => p.name === '프로바이오틱스');
    if (probiotics) {
      recommendations.push({
        supplement: probiotics,
        dosage: 1,
        reason: '장 건강은 면역력과 전반적인 건강 상태에 중요한 역할을 합니다.',
        schedule: calculateDosageSchedule('프로바이오틱스', userInfo)
      });
    }
    
    // 3. 마그네슘 (30대 이상 또는 스트레스가 많은 경우)
    if (age >= 30) {
      const magnesium = products.find(p => p.name === '마그네슘');
      if (magnesium) {
        let dosage = 1;
        
        // 체중에 따른 조정
        if (magnesium.dosageCalculation?.weightFactor) {
          const weightBasedDosage = userInfo.weight * magnesium.dosageCalculation.weightFactor;
          const tabletSize = magnesium.dosageInfo?.tabletSize || 400;
          dosage = Math.ceil(weightBasedDosage / tabletSize);
        }
        
        // 성별에 따른 조정
        if (magnesium.dosageCalculation?.genderFactor) {
          dosage *= magnesium.dosageCalculation.genderFactor[normalizedGender] || 1;
        }
        
        // 나이에 따른 조정
        if (magnesium.dosageCalculation?.ageFactor) {
          dosage *= magnesium.dosageCalculation.ageFactor[ageGroup] || 1;
        }
        
        // 최대 복용량 적용
        if (magnesium.dosageCalculation?.maxDosage) {
          const maxTablets = Math.ceil(magnesium.dosageCalculation.maxDosage / 
            (magnesium.dosageInfo?.tabletSize || 400));
          dosage = Math.min(dosage, maxTablets);
        }
        
        dosage = Math.max(1, Math.round(dosage)); // 최소 1정, 반올림
        
        recommendations.push({
          supplement: magnesium,
          dosage: dosage,
          reason: '현대인의 스트레스 관리와 수면 개선에 도움을 줍니다.',
          schedule: calculateDosageSchedule('마그네슘', userInfo)
        });
      }
    }
    
    // 4. 오메가3 (특히 심혈관 건강이 중요한 중년 이상)
    if (age >= 40 || bmi > 25) {
      const omega3 = products.find(p => p.name === '오메가3');
      if (omega3) {
        let dosage = 1;
        
        // 체중에 따른 조정
        if (omega3.dosageCalculation?.weightFactor) {
          const weightBasedDosage = userInfo.weight * omega3.dosageCalculation.weightFactor;
          const tabletSize = omega3.dosageInfo?.tabletSize || 1000;
          dosage = Math.ceil(weightBasedDosage / tabletSize);
        }
        
        // 성별에 따른 조정
        if (omega3.dosageCalculation?.genderFactor) {
          dosage *= omega3.dosageCalculation.genderFactor[normalizedGender] || 1;
        }
        
        // 나이에 따른 조정
        if (omega3.dosageCalculation?.ageFactor) {
          dosage *= omega3.dosageCalculation.ageFactor[ageGroup] || 1;
        }
        
        // 최대 복용량 적용
        if (omega3.dosageCalculation?.maxDosage) {
          const maxTablets = Math.ceil(omega3.dosageCalculation.maxDosage / 
            (omega3.dosageInfo?.tabletSize || 1000));
          dosage = Math.min(dosage, maxTablets);
        }
        
        dosage = Math.max(1, Math.round(dosage)); // 최소 1정, 반올림
        
        recommendations.push({
          supplement: omega3,
          dosage: dosage,
          reason: '심혈관 건강과 염증 감소, 뇌 기능 향상에 도움이 됩니다.',
          schedule: calculateDosageSchedule('오메가3', userInfo)
        });
      }
    }
    
    // 5. 루테인 (디지털 기기 사용이 많은 현대인)
    const lutein = products.find(p => p.name === '루테인');
    if (lutein && age >= 30) {
      recommendations.push({
        supplement: lutein,
        dosage: 1,
        reason: '현대인의 블루라이트 노출이 많아 눈 건강 보호에 중요합니다.',
        schedule: calculateDosageSchedule('루테인', userInfo)
      });
    }
    
    // 랜덤으로 1-2개 더 추가 (추천 수가 3개 미만인 경우)
    if (recommendations.length < 3) {
      const alreadyRecommended = recommendations.map(r => r.supplement.name);
      const availableSupplements = products.filter(p => !alreadyRecommended.includes(p.name));
      
      // 랜덤하게 선택 (최대 2개)
      const shuffled = [...availableSupplements].sort(() => 0.5 - Math.random());
      const additionalCount = Math.min(3 - recommendations.length, 2);
      
      for (let i = 0; i < additionalCount && i < shuffled.length; i++) {
        recommendations.push({
          supplement: shuffled[i],
          dosage: 1,
          reason: `${userInfo.name || '사용자'}님의 전반적인 건강 관리에 도움이 될 수 있습니다.`,
          schedule: calculateDosageSchedule(shuffled[i].name, userInfo)
        });
      }
    }
  } catch (error) {
    console.error('추천 생성 중 오류:', error);
  }
  
  return recommendations;
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
      try {
        const subRef = collection(db, "users", username, "subscriptions");
        const q = query(subRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        subscribedProducts = querySnapshot.docs
          .filter(doc => doc.data().status === "active")
          .map(doc => doc.data().supplement?.productName || "");
      } catch (error) {
        console.error("구독 정보 조회 오류:", error);
      }
    }

    // 영양제 추천 계산
    const supplementRecommendations = recommendSupplements(userInfo);
    
    // 구독 중인 제품은 추천에서 제외
    const filteredRecommendations = supplementRecommendations.filter(
      rec => !subscribedProducts.includes(rec.supplement.name)
    );

    // AI 응답 생성
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `당신은 Nutri AI 영양 상담 전문가입니다. 영양제에 대한 질문에 전문적으로 답변하세요.

1. 답변 형식:
- 간결하고 정확한 정보를 제공하세요
- 전문 용어는 쉽게 설명하세요
- 항상 한국어로 답변하세요

2. 영양제 추천 시:
- 영양제 이름 앞에 '[추천]' 표시를 붙이세요
- 형식: [추천] 영양제이름 : 복용량 / 복용시간(식전 또는 식후 명시)
- 각 영양제의 효능과 복용 이유를 간략히 설명하세요

3. 영양제 정보:
- 다음 영양제 목록에서만 선택하여 추천하세요: ${products.map(s => s.name).join(', ')}
- 각 영양제의 효능, 복용법, 주의사항 등을 정확히 설명하세요
- 사용자의 특성(성별, 나이, 체중 등)에 맞게 맞춤 추천하세요

4. 복용 방법:
- 아침/점심/저녁/취침 전 중 최적의 시간을 제안하세요
- 식전/식후 복용 여부와 그 이유를 설명하세요
- 영양제 간 상호작용과 함께 복용 가능 여부에 대해 안내하세요

사용자의 건강 정보:
- 성별: ${userInfo.gender}
- 키: ${userInfo.height}cm
- 몸무게: ${userInfo.weight}kg
- 생년월일: ${userInfo.birthDate}`
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
      max_tokens: 1000
    });

    let aiReply = completion.choices[0].message.content || "";

    // 영양제 추천이 있고 AI 응답에 추천 표시가 없는 경우, 추천 정보 추가
    if (filteredRecommendations.length > 0 && !aiReply.includes('[추천]')) {
      const recommendationsText = filteredRecommendations
        .map(rec => {
          const scheduleTexts = rec.schedule.map(sch => {
            const mealText = sch.withMeal ? "식후" : "식전";
            return `${sch.time} ${sch.amount}알 (${mealText})`;
          }).join(', ');
          
          return `[추천] ${rec.supplement.name} : ${rec.dosage}알/일 / ${scheduleTexts}\n${rec.reason}\n${rec.supplement.benefits?.join(', ') || ''}\n`;
        })
        .join('\n');
      
      aiReply += `\n\n영양제 추천:\n${recommendationsText}`;
    }

    // 응답 반환
    return NextResponse.json({
      reply: aiReply,
      recommendations: filteredRecommendations.map(rec => {
        // products 배열에서 해당 영양제의 1알 가격 찾기
        const productInfo = products.find(p => p.name === rec.supplement.name) || { pricePerUnit: 0, tags: [] };
        const pricePerUnit = productInfo.pricePerUnit || 0;
        
        // 일일 복용량에 따른 일일 가격 계산
        const dailyPrice = pricePerUnit * rec.dosage;
        
        // 월간 가격 계산 (일일 가격 * 30일)
        const monthlyPrice = dailyPrice * 30;
        
        return {
          id: rec.supplement.id,
          name: rec.supplement.name,
          productName: rec.supplement.name, // chat/page.tsx와 호환되도록 productName 추가
          description: rec.supplement.description,
          category: rec.supplement.category,
          dosage: rec.dosage,
          dailyDosage: rec.dosage, // chat/page.tsx와 호환되도록 dailyDosage 추가
          reason: rec.reason,
          benefits: rec.supplement.benefits || [],
          precautions: rec.supplement.precautions || [],
          pricePerUnit: pricePerUnit, // 1알 가격
          dailyPrice: dailyPrice,    // 일일 가격
          monthlyPrice: monthlyPrice, // 월간 가격
          schedule: rec.schedule.map(sch => ({
            time: sch.time,
            amount: sch.amount,
            withMeal: sch.withMeal,
            reason: sch.reason
          })),
          dosageSchedule: rec.schedule.map(sch => ({  // chat/page.tsx와 호환되도록 dosageSchedule 추가
            time: sch.time,
            amount: sch.amount,
            withMeal: sch.withMeal,
            reason: sch.reason
          })),
          tags: productInfo.tags || []  // chat/page.tsx와 호환되도록 tags 추가
        }
      })
    });

  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}