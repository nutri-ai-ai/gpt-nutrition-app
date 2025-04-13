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
            icon: <IoMdHeart className="w-8 h-8" />,
            color: "from-red-400 to-red-600",
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
            icon: <GiMedicines className="w-8 h-8" />,
            color: "from-orange-400 to-orange-600",
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
            icon: <GiStomach className="w-8 h-8" />,
            color: "from-green-400 to-green-600",
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
            icon: <TbEye className="w-8 h-8" />,
            color: "from-blue-400 to-blue-600",
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
            icon: <RiMentalHealthLine className="w-8 h-8" />,
            color: "from-purple-400 to-purple-600",
            category: '미네랄',
            scientificName: 'Magnesium',
            dailyIntake: '310-420mg',
            sideEffects: ['설사', '복부경련'],
            interactions: ['칼슘제', '이뇨제'],
            foodSources: ['아몬드', '시금치', '아보카도', '다크초콜릿']
          }
        ]

        // 추가 영양제 데이터
        const additionalSupplements: Supplement[] = [
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
            icon: <GiMedicines className="w-8 h-8" />,
            color: "from-yellow-400 to-yellow-600",
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
            icon: <IoMdHeart className="w-8 h-8" />,
            color: "from-pink-400 to-pink-600",
            category: '보조효소',
            scientificName: 'Ubiquinone',
            dailyIntake: '30-200mg',
            sideEffects: ['소화불량', '두통'],
            interactions: ['혈압약', '항응고제'],
            foodSources: ['소고기', '닭고기', '생선', '견과류']
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
            icon: <GiMedicines className="w-8 h-8" />,
            color: "from-amber-400 to-amber-600",
            category: '식물성 화합물',
            scientificName: 'Curcumin',
            dailyIntake: '500-2000mg',
            sideEffects: ['소화불량', '설사'],
            interactions: ['항응고제', '당뇨약'],
            foodSources: ['우유황', '커리', '강황']
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
            icon: <GiMedicines className="w-8 h-8" />,
            color: "from-indigo-400 to-indigo-600",
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
            icon: <GiMedicines className="w-8 h-8" />,
            color: "from-gray-400 to-gray-600",
            category: '미네랄',
            scientificName: 'Calcium',
            dailyIntake: '1000-1200mg',
            sideEffects: ['변비', '복부팽만감'],
            interactions: ['철분제', '항생제'],
            foodSources: ['우유', '치즈', '요구르트', '두부']
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