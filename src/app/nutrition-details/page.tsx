'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { IoMdHeart } from 'react-icons/io'
import { GiStomach, GiMedicines } from 'react-icons/gi'
import { RiMentalHealthLine } from 'react-icons/ri'
import { TbEye } from 'react-icons/tb'

// 영양제 데이터 타입 정의
interface Supplement {
  id: string
  name: string
  description: string
  benefits: string[]
  dosage: string
  precautions: string[]
  icon: JSX.Element
  color: string
  category: string
  scientificName?: string
  dailyIntake?: string
  sideEffects?: string[]
  interactions?: string[]
  foodSources?: string[]
  // 개선된 복용량 정보
  dosageInfo?: {
    tabletSize: number // 1정당 용량 (mg 또는 IU)
    tabletUnit: string // 단위 (mg, IU, CFU 등)
    recommendedDailyTablets: number // 권장 일일 정 수 (1정, 2정 등)
  }
  dosageCalculation?: {
    baseAmount: number, // 기본 복용량 (mg 또는 IU)
    weightFactor?: number, // 체중에 따른 복용량 조정 계수
    genderFactor?: { // 성별에 따른 복용량 조정
      male: number,
      female: number
    },
    ageFactor?: { // 나이에 따른 복용량 조정
      under30: number,
      between30And50: number,
      above50: number
    },
    maxDosage?: number // 최대 권장 복용량
  }
}

export default function NutritionDetailsPage() {
  const router = useRouter()
  const [selectedSupplement, setSelectedSupplement] = useState<Supplement | null>(null)
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [loading, setLoading] = useState(true)

  // 영양제 데이터 초기화
  useEffect(() => {
    const fetchSupplements = async () => {
      try {
        // 기본 영양제 데이터
        const baseSupplements: Supplement[] = [
          {
            id: 'omega3',
            name: '오메가3',
            description: '심혈관 건강과 인지 기능 개선에 도움을 주는 필수 지방산입니다. EPA와 DHA가 주요 성분으로, 체내에서 생성되지 않아 음식이나 보충제로 섭취해야 합니다.',
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
            icon: <IoMdHeart className="w-8 h-8" />,
            color: "from-red-400 to-red-600",
            category: '지방산',
            scientificName: 'Omega-3 Fatty Acids (EPA/DHA)',
            dailyIntake: '250-2000mg',
            sideEffects: ['설사', '소화불량', '입냄새', '위장 불편감'],
            interactions: ['혈액응고제', '아스피린', '혈압약'],
            foodSources: ['연어', '고등어', '참치', '아마씨', '호두'],
            dosageInfo: {
              tabletSize: 1000, // 1정당 1000mg
              tabletUnit: 'mg',
              recommendedDailyTablets: 1 // 일일 1정 권장
            },
            dosageCalculation: {
              baseAmount: 1000, // 1000mg
              weightFactor: 0.01, // 체중 1kg당 10mg 추가
              genderFactor: { male: 1.2, female: 1.0 },
              ageFactor: { under30: 0.9, between30And50: 1.0, above50: 1.2 },
              maxDosage: 3000 // 최대 3000mg
            }
          },
          {
            id: 'vitaminC',
            name: '비타민C',
            description: '면역력 증진과 피부 건강에 필수적인 수용성 항산화 비타민입니다. 콜라겐 생성을 돕고 철분 흡수를 촉진하며 세포 손상을 방지합니다.',
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
            icon: <GiMedicines className="w-8 h-8" />,
            color: "from-orange-400 to-orange-600",
            category: '비타민',
            scientificName: 'Ascorbic Acid',
            dailyIntake: '75-2000mg',
            sideEffects: ['설사', '신장결석 위험 증가', '위장 불편감', '두통'],
            interactions: ['철분제', '알루미늄제', '항응고제', '아스피린'],
            foodSources: ['오렌지', '키위', '브로콜리', '피망', '딸기', '구아바'],
            dosageInfo: {
              tabletSize: 500, // 1정당 500mg
              tabletUnit: 'mg',
              recommendedDailyTablets: 1 // 일일 1정 권장
            },
            dosageCalculation: {
              baseAmount: 500, // 500mg
              weightFactor: 0.0075, // 체중 1kg당 7.5mg 추가
              genderFactor: { male: 1.0, female: 1.1 }, // 여성은 약간 더 필요
              ageFactor: { under30: 0.9, between30And50: 1.0, above50: 1.1 },
              maxDosage: 2000 // 최대 2000mg
            }
          },
          {
            id: 'probiotics',
            name: '프로바이오틱스',
            description: '장 건강 개선과 면역력 강화에 도움을 주는 유익균입니다. 유산균, 비피더스균 등 다양한 균주가 포함되어 장내 미생물 균형을 유지하는데 도움을 줍니다.',
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
            icon: <GiStomach className="w-8 h-8" />,
            color: "from-green-400 to-green-600",
            category: '유산균',
            scientificName: 'Lactobacillus, Bifidobacterium',
            dailyIntake: '10억-100억 CFU',
            sideEffects: ['가스', '복부팽만감', '일시적인 소화 불편'],
            interactions: ['항생제', '면역억제제'],
            foodSources: ['요구르트', '김치', '된장', '미소', '케피어', '콤부차'],
            dosageInfo: {
              tabletSize: 10, // 10억 CFU
              tabletUnit: '억 CFU',
              recommendedDailyTablets: 1 // 일일 1정 권장
            },
            dosageCalculation: {
              baseAmount: 10, // 10억 CFU
              weightFactor: 0, // 체중에 따른 변화 없음
              genderFactor: { male: 1.0, female: 1.0 },
              ageFactor: { under30: 0.9, between30And50: 1.0, above50: 1.3 },
              maxDosage: 100 // 최대 100억 CFU
            }
          },
          {
            id: 'lutein',
            name: '루테인',
            description: '눈 건강과 시력 보호에 필수적인 카로티노이드 성분입니다. 블루라이트 차단과 황반변성 예방에 도움을 주며, 지아잔틴과 함께 섭취 시 더 효과적입니다.',
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
            icon: <TbEye className="w-8 h-8" />,
            color: "from-blue-400 to-blue-600",
            category: '카로티노이드',
            scientificName: 'Lutein, Zeaxanthin',
            dailyIntake: '6-20mg',
            sideEffects: ['피부 변색', '위장 불편감', '두통'],
            interactions: ['베타카로틴', '비타민E'],
            foodSources: ['시금치', '케일', '브로콜리', '옥수수', '달걀 노른자', '파프리카'],
            dosageInfo: {
              tabletSize: 20, // 1정당 20mg
              tabletUnit: 'mg',
              recommendedDailyTablets: 1 // 일일 1정 권장
            },
            dosageCalculation: {
              baseAmount: 20, // 20mg
              weightFactor: 0, // 체중에 따른 변화 없음
              genderFactor: { male: 1.0, female: 1.0 },
              ageFactor: { under30: 0.8, between30And50: 1.0, above50: 1.5 },
              maxDosage: 40 // 최대 40mg
            }
          },
          {
            id: 'magnesium',
            name: '마그네슘',
            description: '스트레스 완화와 수면 개선에 효과적인 필수 미네랄입니다. 300개 이상의 효소 반응에 관여하며 근육 이완, 신경 전달, 혈압 조절 등 다양한 기능을 수행합니다.',
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
            icon: <RiMentalHealthLine className="w-8 h-8" />,
            color: "from-purple-400 to-purple-600",
            category: '미네랄',
            scientificName: 'Magnesium (citrate, glycinate, oxide)',
            dailyIntake: '310-420mg',
            sideEffects: ['설사', '복부경련', '구역질', '근육 약화'],
            interactions: ['칼슘제', '이뇨제', '항생제', '비스포스포네이트'],
            foodSources: ['아몬드', '시금치', '아보카도', '다크초콜릿', '통곡물', '콩류'],
            dosageInfo: {
              tabletSize: 400, // 1정당 400mg
              tabletUnit: 'mg',
              recommendedDailyTablets: 1 // 일일 1정 권장
            },
            dosageCalculation: {
              baseAmount: 400, // 400mg
              weightFactor: 0.005, // 체중 1kg당 5mg 추가
              genderFactor: { male: 1.0, female: 1.1 },
              ageFactor: { under30: 0.9, between30And50: 1.0, above50: 1.2 },
              maxDosage: 600 // 최대 600mg
            }
          }
        ]

        // 추가 영양제 데이터
        const additionalSupplements: Supplement[] = [
          {
            id: 'vitaminD',
            name: '비타민D',
            description: '뼈 건강과 면역력 강화에 필수적인 지용성 비타민입니다. 햇빛 노출을 통해 체내에서 합성되며, 칼슘 흡수, 면역 기능 조절, 세포 성장 등에 중요한 역할을 합니다.',
            benefits: [
              '뼈 건강 강화와 골다공증 위험 감소',
              '면역력 증진 및 감염 저항성 향상',
              '기분 개선과 우울감 감소 도움',
              '근력 향상 및 낙상 위험 감소',
              '인슐린 민감성 개선과 심혈관 건강 지원'
            ],
            dosage: '1일 1회, 1정 (1000IU)',
            precautions: [
              '과다 섭취 시 고칼슘혈증과 같은 중독 위험',
              '신장 질환자 주의 필요',
              '지용성이므로 식사와 함께 복용 권장',
              '칼슘 보충제와 함께 섭취 시 시너지 효과'
            ],
            icon: <GiMedicines className="w-8 h-8" />,
            color: "from-yellow-400 to-yellow-600",
            category: '비타민',
            scientificName: 'Cholecalciferol (D3), Ergocalciferol (D2)',
            dailyIntake: '600-4000IU',
            sideEffects: ['구토', '식욕감퇴', '신장결석', '변비'],
            interactions: ['칼슘제', '이뇨제', '코르티코스테로이드'],
            foodSources: ['연어', '참치', '계란 노른자', '버섯', '강화 우유'],
            dosageInfo: {
              tabletSize: 1000, // 1정당 1000IU
              tabletUnit: 'IU',
              recommendedDailyTablets: 1 // 일일 1정 권장
            },
            dosageCalculation: {
              baseAmount: 1000, // 1000IU
              weightFactor: 0, // 체중에 따른 변화 없음
              genderFactor: { male: 1.0, female: 1.1 },
              ageFactor: { under30: 0.8, between30And50: 1.0, above50: 1.5 },
              maxDosage: 4000 // 최대 4000IU
            }
          },
          {
            id: 'coenzymeQ10',
            name: '코엔자임Q10',
            description: '에너지 생산과 항산화 작용에 중요한 보조효소입니다. 미토콘드리아에서 ATP 생성에 관여하며, 스타틴 계열 약물 복용자와 심장 건강 관리에 특히 중요합니다.',
            benefits: [
              '세포 에너지 생산 촉진',
              '강력한 항산화 작용으로 세포 보호',
              '심장 건강 지원 및 심부전 증상 완화',
              '피로감 감소와 운동 능력 향상',
              '스타틴 약물 부작용 완화 도움'
            ],
            dosage: '1일 1회, 1정 (100mg)',
            precautions: [
              '혈압약과 함께 복용 시 상호작용 주의',
              '임산부는 전문가와 상담 후 복용 필요',
              '지용성이므로 식사와 함께 복용 권장',
              '항응고제와 함께 복용 시 주의 필요'
            ],
            icon: <IoMdHeart className="w-8 h-8" />,
            color: "from-pink-400 to-pink-600",
            category: '보조효소',
            scientificName: 'Ubiquinone, Ubiquinol',
            dailyIntake: '30-200mg',
            sideEffects: ['소화불량', '두통', '피로감', '발진'],
            interactions: ['혈압약', '항응고제', '베타차단제', '스타틴계 약물'],
            foodSources: ['소고기', '닭고기', '생선', '견과류', '시금치'],
            dosageInfo: {
              tabletSize: 100, // 1정당 100mg
              tabletUnit: 'mg',
              recommendedDailyTablets: 1 // 일일 1정 권장
            },
            dosageCalculation: {
              baseAmount: 100, // 100mg
              weightFactor: 0.001, // 체중 1kg당 1mg 추가
              genderFactor: { male: 1.1, female: 1.0 },
              ageFactor: { under30: 0.8, between30And50: 1.0, above50: 1.3 },
              maxDosage: 300 // 최대 300mg
            }
          },
          {
            id: 'curcumin',
            name: '커큐민',
            description: '강력한 항염증과 항산화 작용을 가진 강황(우콘)의 주요 활성 성분입니다. 생체이용률이 낮아 흑후추 성분인 피페린과 함께 복용하면 흡수율이 크게 증가합니다.',
            benefits: [
              '강력한 항염증 작용으로 만성 염증 감소',
              '항산화 효과로 세포 손상 방지',
              '관절 건강 지원 및 관절통 완화',
              '소화 기능 개선과 소화기관 건강 지원',
              '간 기능 지원 및 독소 배출 도움'
            ],
            dosage: '1일 1회, 1정 (500mg)',
            precautions: [
              '담석 환자는 복용 전 의사와 상담 필요',
              '임산부는 대량 복용 피해야 함',
              '지용성이므로 식사와 함께 복용 권장',
              '피페린 함유 제품 선택 시 흡수율 향상'
            ],
            icon: <GiMedicines className="w-8 h-8" />,
            color: "from-amber-400 to-amber-600",
            category: '식물성 화합물',
            scientificName: 'Curcumin (diferuloylmethane)',
            dailyIntake: '500-2000mg',
            sideEffects: ['소화불량', '설사', '메스꺼움', '알레르기 반응'],
            interactions: ['항응고제', '당뇨약', '위산 억제제', 'NSAIDs'],
            foodSources: ['우콘(강황)', '커리', '강황 차', '강황 우유'],
            dosageInfo: {
              tabletSize: 500, // 1정당 500mg
              tabletUnit: 'mg',
              recommendedDailyTablets: 1 // 일일 1정 권장
            },
            dosageCalculation: {
              baseAmount: 500, // 500mg
              weightFactor: 0.005, // 체중 1kg당 5mg 추가
              genderFactor: { male: 1.0, female: 1.0 },
              ageFactor: { under30: 0.9, between30And50: 1.0, above50: 1.1 },
              maxDosage: 2000 // 최대 2000mg
            }
          },
          {
            id: 'vitaminB',
            name: '비타민B 복합체',
            description: '에너지 대사와 신경 기능에 필수적인 수용성 비타민군입니다. B1, B2, B3, B5, B6, B7, B9, B12 등 8가지 비타민으로 구성되며, 각각 중요한 역할을 담당합니다.',
            benefits: [
              '에너지 대사 지원 및 탄수화물 분해 촉진',
              '신경 기능 개선과 뇌 건강 지원',
              '피로감 감소와 스트레스 저항력 증가',
              '피부와 모발 건강 유지',
              '적혈구 생성 및 DNA 합성 지원'
            ],
            dosage: '1일 1회, 1정',
            precautions: [
              '과다 섭취 시 소변 색상 변화(진한 노란색) 가능',
              '수용성이므로 정기적인 섭취 필요',
              '알코올 섭취 시 비타민B1 필요량 증가',
              'B6 과다 복용 시 신경 손상 가능성 주의'
            ],
            icon: <GiMedicines className="w-8 h-8" />,
            color: "from-indigo-400 to-indigo-600",
            category: '비타민',
            scientificName: 'B-Complex Vitamins (Thiamine, Riboflavin, Niacin 등)',
            dailyIntake: '각 비타민별 권장량',
            sideEffects: ['소변 색상 변화', '메스꺼움', '피부 홍조'],
            interactions: ['알코올', '항생제', '항경련제'],
            foodSources: ['전곡류', '견과류', '계란', '우유', '녹색 잎채소', '육류'],
            dosageInfo: {
              tabletSize: 100, // 1정당 복합 영양소 100% 함유
              tabletUnit: '%',
              recommendedDailyTablets: 1 // 일일 1정 권장
            },
            dosageCalculation: {
              baseAmount: 1, // 1정
              weightFactor: 0, // 체중에 따른 변화 없음
              genderFactor: { male: 1.0, female: 1.1 },
              ageFactor: { under30: 0.9, between30And50: 1.0, above50: 1.1 },
              maxDosage: 2 // 최대 2정
            }
          },
          {
            id: 'calcium',
            name: '칼슘',
            description: '뼈와 치아 건강에 필수적인 미네랄로, 근육 수축, 신경 전달, 혈액 응고 등 다양한 생리적 기능에도 관여합니다. 비타민D와 함께 섭취 시 흡수율이 높아집니다.',
            benefits: [
              '뼈 밀도 강화 및 골다공증 예방',
              '치아 건강 유지와 충치 예방',
              '근육 기능 개선 및 경련 감소',
              '신경 전달 및 호르몬 분비 조절',
              '혈압 조절과 심혈관 건강 지원'
            ],
            dosage: '1일 1회, 1정 (500mg)',
            precautions: [
              '철분제와 함께 복용 시 흡수 저하될 수 있음',
              '과다 섭취 시 신장결석 위험 증가',
              '비타민D와 마그네슘과 함께 복용 시 효과 증가',
              '일부 항생제, 갑상선 약물과 상호작용 가능'
            ],
            icon: <GiMedicines className="w-8 h-8" />,
            color: "from-gray-400 to-gray-600",
            category: '미네랄',
            scientificName: 'Calcium (carbonate, citrate, gluconate)',
            dailyIntake: '1000-1200mg',
            sideEffects: ['변비', '복부팽만감', '위산 역류', '신장결석'],
            interactions: ['철분제', '항생제', '갑상선약', '이뇨제'],
            foodSources: ['우유', '치즈', '요구르트', '두부', '연어', '녹색 잎채소'],
            dosageInfo: {
              tabletSize: 500, // 1정당 500mg
              tabletUnit: 'mg',
              recommendedDailyTablets: 1 // 일일 1정 권장
            },
            dosageCalculation: {
              baseAmount: 500, // 500mg
              weightFactor: 0.007, // 체중 1kg당 7mg 추가
              genderFactor: { male: 1.0, female: 1.3 }, // 여성은 더 많이 필요
              ageFactor: { under30: 1.0, between30And50: 1.0, above50: 1.4 },
              maxDosage: 1200 // 최대 1200mg
            }
          }
        ]

        // 모든 영양제 데이터 합치기
        const allSupplements = [...baseSupplements, ...additionalSupplements]
        setSupplements(allSupplements)
      } catch (error) {
        console.error('영양제 데이터 로드 중 오류 발생:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSupplements()
  }, [])

  // URL 파라미터에서 영양제 ID 가져오기
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const supplementId = params.get('id')
    if (supplementId) {
      const supplement = supplements.find(s => s.id === supplementId)
      if (supplement) {
        setSelectedSupplement(supplement)
      }
    }
  }, [supplements])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </main>
    )
  }

  if (!selectedSupplement) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* 헤더 */}
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">뒤로가기</span>
            </button>
            <h1 className="text-xl font-bold text-gray-800">영양제 정보</h1>
            <div className="w-20"></div> {/* 균형을 위한 빈 공간 */}
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supplements.map((supp) => (
              <motion.div
                key={supp.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedSupplement(supp)}
                className={`bg-gradient-to-br ${supp.color} rounded-xl p-6 text-white cursor-pointer`}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                    {supp.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{supp.name}</h2>
                    <p className="text-sm text-white/90">{supp.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => setSelectedSupplement(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">뒤로가기</span>
          </button>
          <h1 className="text-xl font-bold text-gray-800">영양제 정보</h1>
          <div className="w-20"></div> {/* 균형을 위한 빈 공간 */}
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br ${selectedSupplement.color} rounded-2xl p-8 text-white`}
        >
          <div className="flex items-start gap-6">
            <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
              {selectedSupplement.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{selectedSupplement.name}</h1>
              {selectedSupplement.scientificName && (
                <p className="text-sm text-white/80 mb-2">학명: {selectedSupplement.scientificName}</p>
              )}
              <p className="text-lg mb-6">{selectedSupplement.description}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold mb-4">주요 효능</h2>
              <ul className="space-y-2">
                {selectedSupplement.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg className="w-5 h-5 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {benefit}
                  </li>
                ))}
              </ul>

              {selectedSupplement.foodSources && (
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4">식품 출처</h2>
                  <div className="flex flex-wrap gap-2">
                    {selectedSupplement.foodSources.map((food, index) => (
                      <span key={index} className="bg-white/20 rounded-full px-3 py-1 text-sm">
                        {food}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">섭취 방법</h2>
              <p className="mb-2">{selectedSupplement.dosage}</p>
              {selectedSupplement.dailyIntake && (
                <p className="text-sm text-white/80 mb-6">권장 일일 섭취량: {selectedSupplement.dailyIntake}</p>
              )}

              <h2 className="text-xl font-bold mb-4">주의사항</h2>
              <ul className="space-y-2">
                {selectedSupplement.precautions.map((precaution, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg className="w-5 h-5 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {precaution}
                  </li>
                ))}
              </ul>

              {selectedSupplement.sideEffects && (
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4">부작용</h2>
                  <ul className="space-y-2">
                    {selectedSupplement.sideEffects.map((effect, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg className="w-5 h-5 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {effect}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedSupplement.interactions && (
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4">약물 상호작용</h2>
                  <ul className="space-y-2">
                    {selectedSupplement.interactions.map((interaction, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg className="w-5 h-5 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {interaction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* AI 상담 버튼 */}
          <div className="mt-8 pt-8 border-t border-white/20">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/chat')}
              className="w-full bg-white text-gray-800 py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:bg-gray-50 transition-colors"
            >
              나에게 맞춘 영양제 AI 상담하기
            </motion.button>
          </div>
        </motion.div>
      </div>
    </main>
  )
} 