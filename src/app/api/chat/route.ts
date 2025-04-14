import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getDoc, getDocs, doc, collection, query, orderBy, where } from 'firebase/firestore'
import { products } from '@/lib/products'
import { OpenAI } from 'openai'

// 영양제 정보 인터페이스 (nutrition-details/page.tsx와 일치)
interface Supplement {
  id: string
  name: string
  description: string
  benefits: string[]
  dosage: string
  precautions: string[]
  category: string
  scientificName?: string
  dailyIntake?: string
  sideEffects?: string[]
  interactions?: string[]
  foodSources?: string[]
  dosageInfo?: {
    recommendedDailyTablets: number
  }
  dosageCalculation?: {
    weightFactor?: number
    genderFactor?: {
      male?: number
      female?: number
    }
    baseAmount?: number
    ageFactor?: {
      under30?: number
      between30And50?: number
      above50?: number
    }
    maxDosage?: number
  }
}

// 스케줄 인터페이스 명시적 정의
interface DosageSchedule {
  time: "아침" | "점심" | "저녁" | "취침전";
  amount: number;
  withMeal: boolean; // 식전/식후 여부
  reason: string;
}

// 추천 아이템 인터페이스 명시적 정의
interface SupplementRecommendation {
  supplement: Supplement;
  dosage: number;
  reason: string;
  schedule: DosageSchedule[];
}

// 영양제 데이터 (nutrition-details/page.tsx에서 가져온 데이터)
const supplements: Supplement[] = [
  {
    id: 'omega3',
    name: '오메가3',
    description: '심혈관 건강과 인지 기능 개선에 도움을 주는 필수 지방산입니다.',
    benefits: [
      '심혈관 건강 개선',
      '뇌 기능 향상',
      '염증 감소',
      '시력 보호'
    ],
    dosage: '1일 1회, 1캡슐 (1000mg)',
    precautions: [
      '혈액 응고제를 복용 중인 경우 의사와 상담 필요',
      '과다 섭취 시 설사 유발 가능',
      '알레르기 반응 주의'
    ],
    category: '지방산',
    scientificName: 'Omega-3 Fatty Acids',
    dailyIntake: '250-2000mg',
    sideEffects: ['설사', '소화불량', '입냄새'],
    interactions: ['혈액응고제', '아스피린'],
    foodSources: ['연어', '고등어', '참치', '아마씨']
  },
  {
    id: 'vitaminC',
    name: '비타민C',
    description: '면역력 증진과 피부 건강에 필수적인 항산화 비타민입니다.',
    benefits: [
      '면역력 강화',
      '피부 건강 개선',
      '철분 흡수 촉진',
      '항산화 작용'
    ],
    dosage: '1일 1회, 1정 (500mg)',
    precautions: [
      '신장 질환이 있는 경우 주의',
      '과다 섭취 시 설사 유발 가능',
      '철분제와 함께 복용 시 효과 증가'
    ],
    category: '비타민',
    scientificName: 'Ascorbic Acid',
    dailyIntake: '75-2000mg',
    sideEffects: ['설사', '신장결석 위험 증가'],
    interactions: ['철분제', '알루미늄제'],
    foodSources: ['오렌지', '키위', '브로콜리', '피망']
  },
  {
    id: 'probiotics',
    name: '프로바이오틱스',
    description: '장 건강 개선과 면역력 강화에 도움을 주는 유익균입니다.',
    benefits: [
      '장 건강 개선',
      '면역력 강화',
      '소화 기능 향상',
      '변비 완화'
    ],
    dosage: '1일 1회, 1캡슐',
    precautions: [
      '항생제 복용 시 2시간 간격 유지',
      '유당 불내증 환자 주의',
      '면역력이 저하된 경우 의사와 상담 필요'
    ],
    category: '유산균',
    scientificName: 'Lactobacillus, Bifidobacterium',
    dailyIntake: '10억-100억 CFU',
    sideEffects: ['가스', '복부팽만감'],
    interactions: ['항생제'],
    foodSources: ['요구르트', '김치', '된장', '미소']
  },
  {
    id: 'lutein',
    name: '루테인',
    description: '눈 건강과 시력 보호에 필수적인 카로티노이드입니다.',
    benefits: [
      '눈 건강 보호',
      '황반변성 예방',
      '시력 보호',
      '블루라이트 차단'
    ],
    dosage: '1일 1회, 1정 (20mg)',
    precautions: [
      '흡연자는 의사와 상담 필요',
      '과다 섭취 시 피부 변색 가능',
      '지용성 영양소이므로 식사와 함께 복용'
    ],
    category: '카로티노이드',
    scientificName: 'Lutein',
    dailyIntake: '6-20mg',
    sideEffects: ['피부 변색'],
    interactions: ['베타카로틴'],
    foodSources: ['시금치', '케일', '브로콜리', '옥수수']
  },
  {
    id: 'magnesium',
    name: '마그네슘',
    description: '스트레스 완화와 수면 개선에 효과적인 미네랄입니다.',
    benefits: [
      '스트레스 완화',
      '수면 개선',
      '근육 이완',
      '에너지 대사 지원'
    ],
    dosage: '1일 1회, 1정 (400mg)',
    precautions: [
      '신장 질환이 있는 경우 주의',
      '설사 유발 가능성',
      '칼슘제와 함께 복용 시 효과 증가'
    ],
    category: '미네랄',
    scientificName: 'Magnesium',
    dailyIntake: '310-420mg',
    sideEffects: ['설사', '복부경련'],
    interactions: ['칼슘제', '이뇨제'],
    foodSources: ['아몬드', '시금치', '아보카도', '다크초콜릿']
  },
  {
    id: 'vitaminD',
    name: '비타민D',
    description: '뼈 건강과 면역력 강화에 필수적인 지용성 비타민입니다.',
    benefits: [
      '뼈 건강 강화',
      '면역력 증진',
      '기분 개선',
      '근력 향상'
    ],
    dosage: '1일 1회, 1정 (1000IU)',
    precautions: [
      '과다 섭취 시 중독 위험',
      '신장 질환자 주의',
      '지용성이므로 식사와 함께 복용'
    ],
    category: '비타민',
    scientificName: 'Cholecalciferol',
    dailyIntake: '600-4000IU',
    sideEffects: ['구토', '식욕감퇴', '신장결석'],
    interactions: ['칼슘제', '이뇨제'],
    foodSources: ['연어', '참치', '계란 노른자', '버섯']
  },
  {
    id: 'coenzymeQ10',
    name: '코엔자임Q10',
    description: '에너지 생산과 항산화 작용에 중요한 보조효소입니다.',
    benefits: [
      '에너지 생산 촉진',
      '항산화 작용',
      '심장 건강 지원',
      '피로감 감소'
    ],
    dosage: '1일 1회, 1정 (100mg)',
    precautions: [
      '혈압약과 함께 복용 시 주의',
      '임산부는 의사와 상담 필요',
      '지용성이므로 식사와 함께 복용'
    ],
    category: '보조효소',
    scientificName: 'Ubiquinone',
    dailyIntake: '30-200mg',
    sideEffects: ['소화불량', '두통'],
    interactions: ['혈압약', '항응고제'],
    foodSources: ['소고기', '닭고기', '생선', '견과류']
  },
  {
    id: 'vitaminB',
    name: '비타민B 복합체',
    description: '에너지 대사와 신경 기능에 필수적인 비타민군입니다.',
    benefits: [
      '에너지 대사 지원',
      '신경 기능 개선',
      '피로감 감소',
      '피부 건강 지원'
    ],
    dosage: '1일 1회, 1정',
    precautions: [
      '과다 섭취 시 소변 색상 변화 가능',
      '수용성이므로 정기적인 섭취 필요',
      '알코올 섭취 시 비타민B1 필요량 증가'
    ],
    category: '비타민',
    scientificName: 'B-Complex Vitamins',
    dailyIntake: '각 비타민별 권장량',
    sideEffects: ['소변 색상 변화'],
    interactions: ['알코올'],
    foodSources: ['전곡류', '견과류', '계란', '우유']
  },
  {
    id: 'calcium',
    name: '칼슘',
    description: '뼈와 치아 건강에 필수적인 미네랄입니다.',
    benefits: [
      '뼈 건강 강화',
      '치아 건강 지원',
      '근육 기능 개선',
      '신경 기능 지원'
    ],
    dosage: '1일 1회, 1정 (500mg)',
    precautions: [
      '철분제와 함께 복용 시 흡수 저하',
      '과다 섭취 시 신장결석 위험',
      '비타민D와 함께 복용 시 효과 증가'
    ],
    category: '미네랄',
    scientificName: 'Calcium',
    dailyIntake: '1000-1200mg',
    sideEffects: ['변비', '복부팽만감'],
    interactions: ['철분제', '항생제'],
    foodSources: ['우유', '치즈', '요구르트', '두부']
  },
  {
    id: 'curcumin',
    name: '커큐민',
    description: '강력한 항염증과 항산화 작용을 가진 우유황의 주요 성분입니다.',
    benefits: [
      '항염증 작용',
      '항산화 효과',
      '관절 건강 지원',
      '소화 기능 개선'
    ],
    dosage: '1일 1회, 1정 (500mg)',
    precautions: [
      '담석 환자 주의',
      '임산부는 의사와 상담 필요',
      '지용성이므로 식사와 함께 복용'
    ],
    category: '식물성 화합물',
    scientificName: 'Curcumin',
    dailyIntake: '500-2000mg',
    sideEffects: ['소화불량', '설사'],
    interactions: ['항응고제', '당뇨약'],
    foodSources: ['우유황', '커리', '강황']
  }
];

// 사용자 정보 인터페이스
interface UserHealthInfo {
  username?: string;
  gender: string;
  height: number;
  weight: number;
  name?: string;
  birthDate: string;
}

// 영양제 복용 시간 계산 - 개인 맞춤형으로 업데이트
const calculateDosageSchedule = (supplementName: string, userInfo: UserHealthInfo) => {
  // 해당 영양제 정보 조회
  const supplement = supplements.find(s => s.name === supplementName);
  if (!supplement) return { dosage: 0, schedule: [] };
  
  // 기본 복용량 설정
  let dailyDosage = 1; // 기본값 1알

  // dosageInfo 필드가 있는 경우 해당 정보 사용
  if (supplement.dosageInfo && supplement.dosageInfo.recommendedDailyTablets !== undefined) {
    dailyDosage = supplement.dosageInfo.recommendedDailyTablets;
  }
  // 마그네슘의 경우 항상 1정
  else if (supplement.id === 'magnesium') {
    dailyDosage = 1;
  }
  // 기존 로직에 따라 계산
  else if (supplement.dosageCalculation) {
    // 성별 구분
    const isMale = userInfo.gender.toLowerCase() === 'male' || 
                  userInfo.gender === '남' || 
                  userInfo.gender === '남성' || 
                  userInfo.gender === '남자';
    
    // 복용량 계산 로직
    let calculatedAmount = supplement.dosageCalculation.baseAmount || 1;
    
    // 체중 조정 (weightFactor가 있는 경우에만)
    if (supplement.dosageCalculation.weightFactor) {
      calculatedAmount += userInfo.weight * supplement.dosageCalculation.weightFactor;
    }
    
    // 성별 조정 (genderFactor가 있는 경우에만)
    if (supplement.dosageCalculation.genderFactor) {
      if (isMale && supplement.dosageCalculation.genderFactor.male) {
        calculatedAmount *= supplement.dosageCalculation.genderFactor.male;
      } else if (!isMale && supplement.dosageCalculation.genderFactor.female) {
        calculatedAmount *= supplement.dosageCalculation.genderFactor.female;
      }
    }
    
    // 나이 조정 (ageFactor가 있는 경우에만)
    if (supplement.dosageCalculation.ageFactor) {
      const birthDate = new Date(userInfo.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 30 && supplement.dosageCalculation.ageFactor.under30) {
        calculatedAmount *= supplement.dosageCalculation.ageFactor.under30;
      } else if (age >= 30 && age <= 50 && supplement.dosageCalculation.ageFactor.between30And50) {
        calculatedAmount *= supplement.dosageCalculation.ageFactor.between30And50;
      } else if (age > 50 && supplement.dosageCalculation.ageFactor.above50) {
        calculatedAmount *= supplement.dosageCalculation.ageFactor.above50;
      }
    }
    
    // 최대 복용량 제한 (maxDosage가 있는 경우에만)
    if (supplement.dosageCalculation.maxDosage) {
      calculatedAmount = Math.min(calculatedAmount, supplement.dosageCalculation.maxDosage);
    }
    
    // 알약 개수로 변환 (반올림)
    // baseAmount가 있는 경우에만 나누기 계산 수행
    if (supplement.dosageCalculation.baseAmount && supplement.dosageCalculation.baseAmount > 0) {
      dailyDosage = Math.round(calculatedAmount / supplement.dosageCalculation.baseAmount);
    } else {
      dailyDosage = Math.round(calculatedAmount);
    }
    
    // 최소 1알
    if (dailyDosage < 1) dailyDosage = 1;
  }
  
  // 복용 스케줄 생성
  const schedule: DosageSchedule[] = [];
  
  switch (supplement.id) {
    case 'omega3':
      // 오메가3는 지용성으로 식사와 함께 복용
      if (dailyDosage > 1) {
        schedule.push({
          time: "아침",
          amount: Math.ceil(dailyDosage / 2),
          withMeal: true,
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
      
    case 'vitaminC':
      // 비타민C는 수용성으로 공복에 복용해도 됨
      schedule.push({
        time: "아침",
        amount: dailyDosage,
        withMeal: false,
        reason: "비타민C는 수용성 비타민으로 공복에 복용하면 빠르게 흡수됩니다. 위 자극이 있다면 식후에 복용하세요."
      });
      break;
      
    case 'probiotics':
      // 프로바이오틱스는 식전 공복에 복용이 효과적
      schedule.push({
        time: "아침",
        amount: dailyDosage,
        withMeal: false,
        reason: "프로바이오틱스는 위산이 적은 식전 공복 상태에서 더 많은 유산균이 장까지 도달할 수 있습니다."
      });
      break;
      
    case 'magnesium':
      // 마그네슘은 수면에 도움이 되므로 저녁에 복용
      schedule.push({
        time: "취침전",
        amount: dailyDosage,
        withMeal: true,
        reason: "마그네슘은 수면과 근육 이완에 도움을 주어 취침 전 복용이 효과적입니다. 식후 복용 시 위장 자극을 줄일 수 있습니다."
      });
      break;
      
    case 'vitaminD':
      // 비타민D는 지용성으로 식사와 함께 복용
      schedule.push({
        time: "아침",
        amount: dailyDosage,
        withMeal: true,
        reason: "비타민D는 지용성 비타민으로 식사 중 지방과 함께 섭취하면 흡수율이 높아집니다. 아침에 복용하면 하루 중 활동량 증가에 도움이 됩니다."
      });
      break;
      
    case 'coenzymeQ10':
      // 코엔자임Q10은 지용성으로 식사와 함께 복용
      schedule.push({
        time: "아침",
        amount: dailyDosage,
        withMeal: true,
        reason: "코엔자임Q10은 지용성 성분으로 지방이 포함된 식사와 함께 복용 시 흡수율이 높아집니다. 에너지 생산에 관여하므로 아침 복용이 효과적입니다."
      });
      break;
      
    case 'vitaminB':
      // 비타민B는 에너지 대사에 관여하므로 아침에 복용
      schedule.push({
        time: "아침",
        amount: dailyDosage,
        withMeal: true,
        reason: "비타민B는 에너지 대사에 관여하여 아침에 복용하면 활력을 높이는데 도움이 됩니다. 식후 복용으로 위장 불편함을 줄일 수 있습니다."
      });
      break;
      
    case 'calcium':
      // 칼슘은 나누어 복용하는 것이 흡수에 좋음
      if (dailyDosage > 1) {
        schedule.push({
          time: "아침",
          amount: Math.ceil(dailyDosage / 2),
          withMeal: true,
          reason: "칼슘은 한 번에 많은 양을 섭취하면 흡수율이 낮아지므로 나누어 복용하는 것이 좋습니다. 식사와 함께 복용하면 흡수가 촉진됩니다."
        });
        schedule.push({
          time: "저녁",
          amount: Math.floor(dailyDosage / 2),
          withMeal: true,
          reason: "취침 전 칼슘 복용은 뼈의 재구성에 도움이 됩니다. 마그네슘이나 비타민D와 함께 복용하면 시너지 효과가 있습니다."
        });
      } else {
        schedule.push({
          time: "저녁",
          amount: dailyDosage,
          withMeal: true,
          reason: "취침 전 칼슘 복용은 뼈의 재구성에 도움이 됩니다. 마그네슘이나 비타민D와 함께 복용하면 시너지 효과가 있습니다."
        });
      }
      break;
      
    case 'lutein':
      // 루테인은 지용성으로 식사와 함께 복용
      schedule.push({
        time: "점심",
        amount: dailyDosage,
        withMeal: true,
        reason: "루테인은 지용성 성분으로 지방이 포함된 식사와 함께 복용하면 흡수율이 높아집니다. 하루 중 가장 눈을 많이 사용하는 시간 전에 복용하면 좋습니다."
      });
      break;
      
    case 'curcumin':
      // 커큐민은 지용성으로 흡수율이 낮아 식사와 함께 복용
      schedule.push({
        time: "점심",
        amount: dailyDosage,
        withMeal: true,
        reason: "커큐민은 흡수율이 낮아 식사와 함께 복용하면 흡수가 증가합니다. 후추나 지방과 함께 섭취하면 생체이용률이 향상됩니다."
      });
      break;
      
    default:
      // 기본 스케줄
      if (dailyDosage > 1) {
        schedule.push({
          time: "아침",
          amount: Math.ceil(dailyDosage / 2),
          withMeal: true,
          reason: "영양소의 효과적인 흡수를 위해 식사와 함께 복용하세요."
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
  
  return { dosage: dailyDosage, schedule };
};

// 사용자 정보 기반 영양제 추천
const recommendSupplements = (userInfo: UserHealthInfo): SupplementRecommendation[] => {
  const recommendations: SupplementRecommendation[] = [];

  // 성별 확인
  const isMale = userInfo.gender.toLowerCase() === 'male' || 
                userInfo.gender === '남' || 
                userInfo.gender === '남성' || 
                userInfo.gender === '남자';
  
  // 나이 계산
  const birthDate = new Date(userInfo.birthDate);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  
  // BMI 계산
  const heightInMeters = userInfo.height / 100;
  const bmi = userInfo.weight / (heightInMeters * heightInMeters);
  
  // 모든 사용자에게 비타민D 추천
  const vitaminD = supplements.find(s => s.id === 'vitaminD');
  if (vitaminD) {
    const schedule = calculateDosageSchedule(vitaminD.name, userInfo);
    recommendations.push({
      supplement: vitaminD,
      dosage: schedule.dosage,
      reason: "대부분의 현대인들은 실내 활동이 많아 비타민D가 부족할 수 있습니다. 면역 기능과 뼈 건강에 중요합니다.",
      schedule: schedule.schedule
    });
  }
  
  // 성별에 따른 추천
  if (isMale) {
    // 남성을 위한 권장 영양제
    const omega3 = supplements.find(s => s.id === 'omega3');
    if (omega3) {
      const schedule = calculateDosageSchedule(omega3.name, userInfo);
      recommendations.push({
        supplement: omega3,
        dosage: schedule.dosage,
        reason: "남성의 심혈관 건강과 콜레스테롤 관리에 도움이 됩니다.",
        schedule: schedule.schedule
      });
    }
    
    // 40대 이상 남성을 위한 추천
    if (age >= 40) {
      const coq10 = supplements.find(s => s.id === 'coenzymeQ10');
      if (coq10) {
        const schedule = calculateDosageSchedule(coq10.name, userInfo);
        recommendations.push({
          supplement: coq10,
          dosage: schedule.dosage,
          reason: "40대 이상 남성의 심장 건강과 에너지 생산에 도움이 됩니다.",
          schedule: schedule.schedule
        });
      }
    }
  } else {
    // 여성을 위한 권장 영양제
    const calcium = supplements.find(s => s.id === 'calcium');
    if (calcium) {
      const schedule = calculateDosageSchedule(calcium.name, userInfo);
      recommendations.push({
        supplement: calcium,
        dosage: schedule.dosage,
        reason: "여성은 호르몬 변화로 인해 뼈 건강에 더 주의가 필요합니다.",
        schedule: schedule.schedule
      });
    }
    
    // 35세 이상 여성을 위한 추천
    if (age >= 35) {
      const magnesium = supplements.find(s => s.id === 'magnesium');
      if (magnesium) {
        const schedule = calculateDosageSchedule(magnesium.name, userInfo);
        recommendations.push({
          supplement: magnesium,
          dosage: schedule.dosage,
          reason: "호르몬 변화와 스트레스 관리, 수면의 질 향상에 도움이 됩니다.",
          schedule: schedule.schedule
        });
      }
    }
  }
  
  // BMI에 따른 추천
  if (bmi > 25) {
    // 과체중인 경우 커큐민 추천
    const curcumin = supplements.find(s => s.id === 'curcumin');
    if (curcumin) {
      const schedule = calculateDosageSchedule(curcumin.name, userInfo);
      recommendations.push({
        supplement: curcumin,
        dosage: schedule.dosage,
        reason: "항염 작용과 신진대사 개선에 도움이 될 수 있습니다.",
        schedule: schedule.schedule
      });
    }
  } else if (bmi < 18.5) {
    // 저체중인 경우 비타민B 복합체 추천
    const vitaminB = supplements.find(s => s.id === 'vitaminB');
    if (vitaminB) {
      const schedule = calculateDosageSchedule(vitaminB.name, userInfo);
      recommendations.push({
        supplement: vitaminB,
        dosage: schedule.dosage,
        reason: "에너지 대사와 적절한 체중 유지에 도움이 됩니다.",
        schedule: schedule.schedule
      });
    }
  }
  
  // 모든 성인에게 좋은 비타민C
  const vitaminC = supplements.find(s => s.id === 'vitaminC');
  if (vitaminC) {
    const schedule = calculateDosageSchedule(vitaminC.name, userInfo);
    recommendations.push({
      supplement: vitaminC,
      dosage: schedule.dosage,
      reason: "항산화 작용과 면역력 강화에 효과적입니다.",
      schedule: schedule.schedule
    });
  }
  
  // 모든 연령대의 장 건강을 위한 프로바이오틱스
  const probiotics = supplements.find(s => s.id === 'probiotics');
  if (probiotics) {
    const schedule = calculateDosageSchedule(probiotics.name, userInfo);
    recommendations.push({
      supplement: probiotics,
      dosage: schedule.dosage,
      reason: "장 건강과 면역력 증진에 도움이 됩니다.",
      schedule: schedule.schedule
    });
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
- 다음 영양제 목록에서만 선택하여 추천하세요: ${supplements.map(s => s.name).join(', ')}
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
          
          return `[추천] ${rec.supplement.name} : ${rec.dosage}알/일 / ${scheduleTexts}\n${rec.reason}\n${rec.supplement.benefits.join(', ')}\n`;
        })
        .join('\n');
      
      aiReply += `\n\n영양제 추천:\n${recommendationsText}`;
    }

    // 응답 반환
    return NextResponse.json({
      reply: aiReply,
      recommendations: filteredRecommendations.map(rec => ({
        id: rec.supplement.id,
        name: rec.supplement.name,
        description: rec.supplement.description,
        category: rec.supplement.category,
        dosage: rec.dosage,
        reason: rec.reason,
        benefits: rec.supplement.benefits,
        precautions: rec.supplement.precautions,
        schedule: rec.schedule.map(sch => ({
          time: sch.time,
          amount: sch.amount,
          withMeal: sch.withMeal,
          reason: sch.reason
        }))
      }))
    });

  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}