export interface Product {
  id: string
  name: string
  description: string
  category: string
  pricePerUnit: number
  imageUrl?: string
  tags: string[]
}

export const products: Product[] = [
  {
    id: '1',
    name: '오메가-3',
    description: '고품질 생선에서 추출한 순수 오메가-3 지방산',
    category: '영양',
    pricePerUnit: 300,
    tags: ['심장건강', '뇌건강', '항염증'],
    imageUrl: '/images/omega3.jpg'
  },
  {
    id: '2',
    name: '비타민 D',
    description: '면역력 강화와 뼈 건강을 위한 비타민 D3',
    category: '영양',
    pricePerUnit: 250,
    tags: ['면역력', '뼈건강', '기분개선'],
    imageUrl: '/images/vitaminD.jpg'
  },
  {
    id: '3',
    name: '마그네슘',
    description: '수면과 근육 이완을 돕는 마그네슘',
    category: '수면',
    pricePerUnit: 200,
    tags: ['수면', '근육이완', '스트레스'],
    imageUrl: '/images/magnesium.jpg'
  },
  {
    id: '4',
    name: '프로바이오틱스',
    description: '장 건강을 위한 유익균',
    category: '영양',
    pricePerUnit: 350,
    tags: ['장건강', '면역력', '소화'],
    imageUrl: '/images/probiotics.jpg'
  },
  {
    id: 'vitamin-c',
    name: '비타민C 1000',
    description: '항산화 작용과 면역력 강화에 도움을 주는 비타민',
    category: '면역력',
    pricePerUnit: 200,
    imageUrl: '/supplements/vitamin-c.jpg',
    tags: ['비타민C', '항산화', '면역력']
  },
  {
    id: 'aronamin-gold',
    name: '아로나민 골드',
    description: '피로 회복과 에너지 증진에 도움을 주는 비타민B 복합제',
    category: '에너지',
    pricePerUnit: 300,
    imageUrl: '/supplements/aronamin-gold.jpg',
    tags: ['비타민B', '피로 회복', '에너지']
  },
  {
    id: 'lutein',
    name: '루테인',
    description: '눈 피로 완화와 시력 보호에 도움을 주는 영양제',
    category: '시력',
    pricePerUnit: 550,
    imageUrl: '/supplements/lutein.jpg',
    tags: ['루테인', '눈 피로', '시력 보호']
  },
  {
    id: 'triple-plus-woman',
    name: '트리플러스 우먼',
    description: '여성 건강과 에너지 증진을 위한 종합 영양제',
    category: '여성건강',
    pricePerUnit: 700,
    imageUrl: '/supplements/triple-plus-woman.jpg',
    tags: ['멀티비타민', '여성 건강', '에너지']
  },
  {
    id: 'calcium-magnesium-d',
    name: '칼슘 마그네슘 비타민D',
    description: '뼈 건강과 근육 기능 향상에 도움을 주는 복합 영양제',
    category: '뼈건강',
    pricePerUnit: 400,
    imageUrl: '/supplements/calcium-magnesium-d.jpg',
    tags: ['칼슘', '마그네슘', '뼈 건강']
  },
  {
    id: 'probiotics-story',
    name: '덴마크 유산균 이야기',
    description: '장 건강과 소화 기능 개선에 도움을 주는 유산균',
    category: '장건강',
    pricePerUnit: 650,
    imageUrl: '/supplements/probiotics-story.jpg',
    tags: ['유산균', '장 건강', '소화']
  },
  {
    id: 'folic-acid',
    name: '엽산 400',
    description: '임신 준비와 혈액 생성에 도움을 주는 영양제',
    category: '임신준비',
    pricePerUnit: 350,
    imageUrl: '/supplements/folic-acid.jpg',
    tags: ['엽산', '임신 준비', '혈액 생성']
  },
  {
    id: 'probiotics-1b',
    name: '프로바이오틱스 10억',
    description: '장 건강과 소화 기능 개선에 도움을 주는 고함량 유산균',
    category: '장건강',
    pricePerUnit: 600,
    imageUrl: '/supplements/probiotics-1b.jpg',
    tags: ['유산균', '장 건강', '소화']
  },
  {
    id: 'vitamin-e',
    name: '비타민E 400 IU',
    description: '피부 건강과 항산화 작용에 도움을 주는 비타민',
    category: '피부건강',
    pricePerUnit: 250,
    imageUrl: '/supplements/vitamin-e.jpg',
    tags: ['비타민E', '피부 건강', '항산화']
  },
  {
    id: 'arginine',
    name: '아르기닌 500mg',
    description: '근육 강화와 혈액 순환 개선에 도움을 주는 아미노산',
    category: '근육건강',
    pricePerUnit: 350,
    imageUrl: '/supplements/arginine.jpg',
    tags: ['아르기닌', '근육 강화', '혈액 순환']
  }
]
  
  