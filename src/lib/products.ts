// lib/products.ts

import { ReactNode } from 'react';
import { IoMdHeart } from 'react-icons/io';
import { GiStomach, GiMedicines } from 'react-icons/gi';
import { RiMentalHealthLine } from 'react-icons/ri';
import { TbEye } from 'react-icons/tb';

export interface Product {
  id: string
  name: string
  description: string
  category: string
  pricePerUnit: number
  imageUrl?: string
  tags: string[]
  benefits?: string[]
  dosage?: string
  precautions?: string[]
  scientificName?: string
  dailyIntake?: string
  sideEffects?: string[]
  interactions?: string[]
  foodSources?: string[]
  iconName?: string
  color?: string
  dosageInfo?: {
    tabletSize: number
    tabletUnit: string
    recommendedDailyTablets: number
  }
  dosageCalculation?: {
    baseAmount: number
    weightFactor?: number
    genderFactor?: { male: number; female: number }
    ageFactor?: { under30: number; between30And50: number; above50: number }
    maxDosage?: number
  }
}

export const products: Product[] = [
  {
    id: 'omega3',
    name: '오메가3',
    description: '심혈관 건강과 인지 기능 개선에 도움을 주는 필수 지방산입니다. EPA와 DHA가 주요 성분으로, 체내에서 생성되지 않아 음식이나 보충제로 섭취해야 합니다.',
    category: '지방산',
    pricePerUnit: 300,
    imageUrl: '/images/omega3.jpg',
    iconName: 'heart',
    color: "from-red-400 to-red-600",
    tags: ['심장건강', '뇌건강', '항염증'],
    benefits: [
      '심혈관 건강 개선 및 콜레스테롤 수치 관리',
      '뇌 기능 향상과 인지능력 지원',
      '염증 감소 및 관절 건강 지원',
      '시력 보호와 안구 건조증 완화',
      '태아 두뇌 발달 지원(임산부)'
    ],
    dosage: '1일 1회, 1캡슐 (1000mg)',
    precautions: [
      '혈액 응고제를 복용 중인 경우 의사와 상담 필요',
      '과다 섭취 시 설사 유발 가능',
      '알레르기 반응 주의',
      '수술 예정인 경우 최소 2주 전에 중단 권장'
    ],
    scientificName: 'Omega-3 Fatty Acids (EPA/DHA)',
    dailyIntake: '250-2000mg',
    sideEffects: ['설사', '소화불량', '입냄새', '위장 불편감'],
    interactions: ['혈액응고제', '아스피린', '혈압약'],
    foodSources: ['연어', '고등어', '참치', '아마씨', '호두'],
    dosageInfo: { tabletSize: 1000, tabletUnit: 'mg', recommendedDailyTablets: 1 },
    dosageCalculation: {
      baseAmount: 1000,
      weightFactor: 0.01,
      genderFactor: { male: 1.2, female: 1.0 },
      ageFactor: { under30: 0.9, between30And50: 1.0, above50: 1.2 },
      maxDosage: 3000
    }
  },
  {
    id: 'vitaminC',
    name: '비타민C',
    description: '면역력 증진과 피부 건강에 필수적인 수용성 항산화 비타민입니다. 콜라겐 생성을 돕고 철분 흡수를 촉진하며 세포 손상을 방지합니다.',
    category: '비타민',
    pricePerUnit: 200,
    imageUrl: '/supplements/vitamin-c.jpg',
    iconName: 'medicine',
    color: "from-orange-400 to-orange-600",
    tags: ['면역력', '피부건강', '항산화'],
    benefits: [
      '면역력 강화 및 감염 저항성 향상',
      '피부 건강 개선과 콜라겐 합성 촉진',
      '철분 흡수 촉진과 빈혈 예방 도움',
      '항산화 작용으로 세포 손상 방지',
      '상처 치유 촉진과 잇몸 건강 지원'
    ],
    dosage: '1일 1회, 1정 (500mg)',
    precautions: [
      '신장 질환이 있는 경우 주의',
      '과다 섭취 시 설사, 위경련 유발 가능',
      '철분제와 함께 복용 시 효과 증가',
      '대량 투여 후 갑작스러운 중단 시 괴혈병 유사 증상 주의'
    ],
    scientificName: 'Ascorbic Acid',
    dailyIntake: '75-2000mg',
    sideEffects: ['설사', '신장결석 위험 증가', '위장 불편감', '두통'],
    interactions: ['철분제', '알루미늄제', '항응고제', '아스피린'],
    foodSources: ['오렌지', '키위', '브로콜리', '피망', '딸기', '구아바'],
    dosageInfo: { tabletSize: 500, tabletUnit: 'mg', recommendedDailyTablets: 1 },
    dosageCalculation: {
      baseAmount: 500,
      weightFactor: 0.0075,
      genderFactor: { male: 1.0, female: 1.1 },
      ageFactor: { under30: 0.9, between30And50: 1.0, above50: 1.1 },
      maxDosage: 2000
    }
  },
  {
    id: 'probiotics',
    name: '프로바이오틱스',
    description: '장 건강 개선과 면역력 강화에 도움을 주는 유익균입니다. 유산균, 비피더스균 등 다양한 균주가 포함되어 장내 미생물 균형을 유지하는데 도움을 줍니다.',
    category: '유산균',
    pricePerUnit: 350,
    imageUrl: '/images/probiotics.jpg',
    iconName: 'stomach',
    color: "from-green-400 to-green-600",
    tags: ['장건강', '면역력', '소화'],
    benefits: [
      '장 건강 개선 및 소화 기능 최적화',
      '면역력 강화와 면역 체계 균형 유지',
      '소화 기능 향상과 영양소 흡수 촉진',
      '변비, 설사 등 장 문제 완화',
      '장-뇌 축을 통한 정신 건강 지원'
    ],
    dosage: '1일 1회, 1캡슐',
    precautions: [
      '항생제 복용 시 2시간 간격 유지 필요',
      '유당 불내증 환자 주의',
      '면역력이 저하된 경우 의사와 상담 필요',
      '냉장 보관이 필요한 제품은 지시사항 확인'
    ],
    scientificName: 'Lactobacillus, Bifidobacterium',
    dailyIntake: '10억-100억 CFU',
    sideEffects: ['가스', '복부팽만감', '일시적인 소화 불편'],
    interactions: ['항생제', '면역억제제'],
    foodSources: ['요구르트', '김치', '된장', '미소', '케피어', '콤부차'],
    dosageInfo: { tabletSize: 10, tabletUnit: '억 CFU', recommendedDailyTablets: 1 },
    dosageCalculation: {
      baseAmount: 10,
      genderFactor: { male: 1.0, female: 1.0 },
      ageFactor: { under30: 0.9, between30And50: 1.0, above50: 1.3 },
      maxDosage: 100
    }
  },
  {
    id: 'lutein',
    name: '루테인',
    description: '눈 건강과 시력 보호에 필수적인 카로티노이드 성분입니다. 블루라이트 차단과 황반변성 예방에 도움을 주며, 지아잔틴과 함께 섭취 시 더 효과적입니다.',
    category: '카로티노이드',
    pricePerUnit: 550,
    imageUrl: '/supplements/lutein.jpg',
    iconName: 'eye',
    color: "from-blue-400 to-blue-600",
    tags: ['눈건강', '황반변성', '블루라이트'],
    benefits: [
      '눈 건강 보호와 황반색소 밀도 증가',
      '황반변성 및 백내장 위험 감소',
      '블루라이트로부터 눈 보호',
      '산화 스트레스로부터 눈 조직 보호',
      '눈의 피로도 감소 및 시력 선명도 개선'
    ],
    dosage: '1일 1회, 1정 (20mg)',
    precautions: [
      '흡연자는 의사와 상담 필요',
      '과다 섭취 시 피부 변색 가능성',
      '지용성 영양소이므로 식사와 함께 복용',
      '정기적인 시력 검사와 병행 권장'
    ],
    scientificName: 'Lutein, Zeaxanthin',
    dailyIntake: '6-20mg',
    sideEffects: ['피부 변색', '위장 불편감', '두통'],
    interactions: ['베타카로틴', '비타민E'],
    foodSources: ['시금치', '케일', '브로콜리', '옥수수', '달걀 노른자', '파프리카'],
    dosageInfo: { tabletSize: 20, tabletUnit: 'mg', recommendedDailyTablets: 1 },
    dosageCalculation: {
      baseAmount: 20,
      ageFactor: { under30: 0.8, between30And50: 1.0, above50: 1.5 },
      maxDosage: 40
    }
  },
  {
    id: 'magnesium',
    name: '마그네슘',
    description: '스트레스 완화와 수면 개선에 효과적인 필수 미네랄입니다. 300개 이상의 효소 반응에 관여하며 근육 이완, 신경 전달, 혈압 조절 등 다양한 기능을 수행합니다.',
    category: '미네랄',
    pricePerUnit: 200,
    imageUrl: '/images/magnesium.jpg',
    iconName: 'mental',
    color: "from-purple-400 to-purple-600",
    tags: ['수면', '스트레스', '근육이완'],
    benefits: [
      '스트레스 완화 및 정신 안정 효과',
      '수면의 질 개선 및 불면증 완화',
      '근육 이완과 경련 예방',
      '에너지 대사 지원 및 피로 감소',
      '심혈관 건강 지원 및 혈압 조절'
    ],
    dosage: '1일 1회, 1정 (400mg)',
    precautions: [
      '신장 질환이 있는 경우 주의 필요',
      '설사 유발 가능성 (산화마그네슘 형태)',
      '칼슘제와 함께 복용 시 시너지 효과',
      '일부 항생제, 이뇨제와 상호작용 가능'
    ],
    scientificName: 'Magnesium (citrate, glycinate, oxide)',
    dailyIntake: '310-420mg',
    sideEffects: ['설사', '복부경련', '구역질', '근육 약화'],
    interactions: ['칼슘제', '이뇨제', '항생제', '비스포스포네이트'],
    foodSources: ['아몬드', '시금치', '아보카도', '다크초콜릿', '통곡물', '콩류'],
    dosageInfo: { tabletSize: 400, tabletUnit: 'mg', recommendedDailyTablets: 1 },
    dosageCalculation: {
      baseAmount: 1,
      weightFactor: 0.005,
      genderFactor: { male: 1.0, female: 1.1 },
      ageFactor: { under30: 0.9, between30And50: 1.0, above50: 1.2 },
      maxDosage: 2
    }
  },
  {
    id: 'vitaminD',
    name: '비타민D',
    description: '뼈 건강과 면역력 강화에 필수적인 지용성 비타민입니다. 햇빛 노출을 통해 체내에서 생성되지만, 현대인의 실내 생활로 인해 부족하기 쉬운 영양소입니다.',
    category: '비타민',
    pricePerUnit: 250,
    imageUrl: '/images/vitaminD.jpg',
    iconName: 'medicine',
    color: "from-yellow-400 to-yellow-600",
    tags: ['골다공증예방', '면역력', '기분개선'],
    benefits: [
      '뼈 건강 강화 및 골다공증 예방',
      '면역력 증진 및 감염 위험 감소',
      '기분 개선 및 계절성 우울증 완화',
      '근력 향상 및 낙상 위험 감소',
      '심혈관 및 신경계 건강 지원'
    ],
    dosage: '1일 1회, 1정 (1000IU)',
    precautions: [
      '과다 섭취 시 중독 위험 (고칼슘혈증)',
      '신장 질환자나 고칼슘혈증 환자 주의',
      '지용성이므로 식사와 함께 복용 권장',
      '특정 의약품과 상호작용 가능성'
    ],
    scientificName: 'Cholecalciferol (D3)',
    dailyIntake: '600-4000IU',
    sideEffects: ['구토', '식욕감퇴', '신장결석', '근육 약화'],
    interactions: ['칼슘제', '이뇨제', '스테로이드제'],
    foodSources: ['연어', '참치', '계란 노른자', '버섯', '강화 우유'],
    dosageInfo: { tabletSize: 1000, tabletUnit: 'IU', recommendedDailyTablets: 1 },
    dosageCalculation: {
      baseAmount: 1,
      ageFactor: { under30: 0.8, between30And50: 1.0, above50: 1.5 },
      maxDosage: 4
    }
  },
  {
    id: 'coenzymeQ10',
    name: '코엔자임Q10',
    description: '에너지 생산과 항산화 작용에 중요한 보조효소입니다. 나이가 들수록 체내 생성량이 감소하여 보충이 필요할 수 있으며, 심장 건강에 특히 좋습니다.',
    category: '보조효소',
    pricePerUnit: 400,
    imageUrl: '/images/coenzymeQ10.jpg',
    iconName: 'heart',
    color: "from-red-400 to-red-600",
    tags: ['에너지', '항산화', '심장건강'],
    benefits: [
      '에너지 생산 촉진 및 세포 활력 증가',
      '항산화 작용으로 세포 손상 방지',
      '심장 건강 지원 및 심혈관 기능 개선',
      '피로감 감소 및 활력 증가',
      '스타틴 약물의 근육 부작용 감소 도움'
    ],
    dosage: '1일 1회, 1정 (100mg)',
    precautions: [
      '혈압약과 함께 복용 시 주의',
      '임산부, 수유부는 의사와 상담 필요',
      '지용성이므로 식사와 함께 복용 권장',
      '항응고제 복용자는 의사와 상담 필요'
    ],
    scientificName: 'Ubiquinone, Ubiquinol',
    dailyIntake: '30-200mg',
    sideEffects: ['소화불량', '두통', '불면증', '발진'],
    interactions: ['혈압약', '항응고제', '화학요법제'],
    foodSources: ['소고기', '닭고기', '생선', '견과류', '유채유'],
    dosageInfo: { tabletSize: 100, tabletUnit: 'mg', recommendedDailyTablets: 1 },
    dosageCalculation: {
      baseAmount: 100,
      weightFactor: 0.001,
      genderFactor: { male: 1.1, female: 1.0 },
      ageFactor: { under30: 0.8, between30And50: 1.0, above50: 1.3 },
      maxDosage: 300
    }
  },
  {
    id: 'vitaminB',
    name: '비타민B 복합체',
    description: '에너지 대사와 신경 기능에 필수적인 비타민군입니다. B1, B2, B3, B5, B6, B7, B9, B12를 포함하며 각각 신체의 다양한 기능을 지원합니다.',
    category: '비타민',
    pricePerUnit: 300,
    imageUrl: '/images/vitaminB.jpg',
    iconName: 'medicine',
    color: "from-green-400 to-green-600",
    tags: ['에너지', '신경건강', '피로감소'],
    benefits: [
      '에너지 대사 지원 및 피로 감소',
      '신경 기능 개선 및 뇌 건강 지원',
      '스트레스 관리 및 기분 개선',
      '피부, 머리카락, 손톱 건강 증진',
      '적혈구 생성 및 빈혈 예방 도움'
    ],
    dosage: '1일 1회, 1정',
    precautions: [
      '과다 섭취 시 소변 색상 변화 가능',
      '수용성이므로 정기적인 섭취 필요',
      '알코올 섭취 시 비타민B1 필요량 증가',
      '특정 약물과 상호작용 가능성'
    ],
    scientificName: 'B-Complex Vitamins',
    dailyIntake: '각 비타민별 권장량',
    sideEffects: ['소변 색상 변화', '메스꺼움', '두통'],
    interactions: ['알코올', '항생제', '항경련제'],
    foodSources: ['전곡류', '견과류', '계란', '우유', '녹색 채소', '고기류'],
    dosageInfo: { tabletSize: 100, tabletUnit: '%', recommendedDailyTablets: 1 },
    dosageCalculation: {
      baseAmount: 1,
      ageFactor: { under30: 0.9, between30And50: 1.0, above50: 1.1 },
      maxDosage: 2
    }
  },
  {
    id: 'calcium',
    name: '칼슘',
    description: '뼈와 치아 건강에 필수적인 미네랄입니다. 근육 수축, 신경 전달, 혈액 응고에도 중요한 역할을 하며, 비타민D와 함께 섭취하면 흡수가 향상됩니다.',
    category: '미네랄',
    pricePerUnit: 400,
    imageUrl: '/images/calcium.jpg',
    iconName: 'mental',
    color: "from-blue-400 to-blue-600",
    tags: ['뼈건강', '치아건강', '근육기능'],
    benefits: [
      '뼈 건강 강화 및 골다공증 예방',
      '치아 건강 지원 및 잇몸 질환 예방',
      '근육 기능 개선 및 경련 예방',
      '신경 전달 및 혈액 응고 지원',
      '혈압 조절 및 심혈관 건강 지원'
    ],
    dosage: '1일 1회, 1정 (500mg)',
    precautions: [
      '철분제와 함께 복용 시 흡수 저하 가능',
      '과다 섭취 시 신장결석 위험 증가',
      '비타민D와 함께 복용 시 흡수율 향상',
      '특정 약물과 상호작용 가능성 (갑상선 약물, 항생제 등)'
    ],
    scientificName: 'Calcium (carbonate, citrate)',
    dailyIntake: '1000-1200mg',
    sideEffects: ['변비', '복부팽만감', '속쓰림'],
    interactions: ['철분제', '항생제', '갑상선 약물', '비스포스포네이트'],
    foodSources: ['우유', '치즈', '요구르트', '두부', '칼슘 강화 식품', '녹색 채소'],
    dosageInfo: { tabletSize: 500, tabletUnit: 'mg', recommendedDailyTablets: 1 },
    dosageCalculation: {
      baseAmount: 500,
      weightFactor: 0.007,
      genderFactor: { male: 1.0, female: 1.3 },
      ageFactor: { under30: 1.0, between30And50: 1.0, above50: 1.4 },
      maxDosage: 1200
    }
  }
]
