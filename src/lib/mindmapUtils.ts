import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const keywordMap: Record<string, string[]> = {
  두통: ['머리 아파', '두통', '편두통', '머리 욱신', '머리 깨질 것 같아'],
  수면: ['잠이 안와', '불면증', '수면 부족', '피곤한데 잠이 안와'],
  무릎: ['무릎 아파', '계단 내려갈 때 힘들어', '무릎 쑤심'],
  피로: ['기운이 없어', '너무 피곤해', '에너지 없음', '피로 누적']
}

export function extractKeywords(text: string): string[] {
  const found: string[] = []
  for (const [key, variants] of Object.entries(keywordMap)) {
    if (variants.some((phrase) => text.includes(phrase))) {
      found.push(key)
    }
  }
  return found
}

export async function updateMindmapKeywords(username: string, keywords: string[]) {
  const userRef = doc(db, 'users', username)
  const updates: Record<string, any> = {}
  keywords.forEach((kw) => {
    updates[`mindmapKeywords.${kw}`] = increment(1)
  })
  await updateDoc(userRef, updates)
}
