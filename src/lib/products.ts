export type Product = {
    name: string;
    tags: string[];
    pricePerUnit: number;
  };
  
  export const productList: Product[] = [
    {
      name: '비타민C 1000',
      tags: ['비타민C', '항산화', '면역력'],
      pricePerUnit: 200,
      // 브랜드: 고려은단
    },
    {
      name: '오메가3',
      tags: ['오메가3', '혈행 개선', '심혈관 건강'],
      pricePerUnit: 500,
      // 브랜드: 종근당건강
    },
    {
      name: '아로나민 골드',
      tags: ['비타민B', '피로 회복', '에너지'],
      pricePerUnit: 300,
      // 브랜드: 일동제약
    },
    {
      name: '루테인',
      tags: ['루테인', '눈 피로', '시력 보호'],
      pricePerUnit: 550,
      // 브랜드: 안국건강
    },
    {
      name: '트리플러스 우먼',
      tags: ['멀티비타민', '여성 건강', '에너지'],
      pricePerUnit: 700,
      // 브랜드: 세노비스 (국내 유통사 기준)
    },
    {
      name: '칼슘 마그네슘 비타민D',
      tags: ['칼슘', '마그네슘', '뼈 건강'],
      pricePerUnit: 400,
      // 브랜드: 뉴트리코어
    },
    {
      name: '덴마크 유산균 이야기',
      tags: ['유산균', '장 건강', '소화'],
      pricePerUnit: 650,
      // 브랜드: 덴프스
    },
    {
      name: '엽산 400',
      tags: ['엽산', '임신 준비', '혈액 생성'],
      pricePerUnit: 350,
      // 브랜드: 솔가 (해외 브랜드지만 국내 유통 있음 → 제외 가능)
    }
    // 필요한 만큼 더 추가 가능!
  ]
  