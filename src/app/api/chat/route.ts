import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { getDoc, getDocs, doc, collection, query, orderBy } from 'firebase/firestore'
import { productList } from '@/lib/products'

export async function POST(req: Request) {
  try {
    const { message, userInfo, conversation } = await req.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키를 찾을 수 없습니다.' }, { status: 500 })
    }

    // 🔹 사용자 마인드맵 키워드 추출
    let sortedKeywords: string[] = []
    if (userInfo?.username) {
      const userDoc = await getDoc(doc(db, 'users', userInfo.username))
      const mindmap = userDoc.exists() ? userDoc.data().mindmapKeywords || {} : {}
      sortedKeywords = Object.entries(mindmap as Record<string, number>)
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => key)
        .slice(0, 3)
    }

    // 🔹 이전 추천 제품 목록 Firestore에서 불러오기
    const previousList: string[] = []
    if (userInfo?.username) {
      const recRef = collection(db, 'users', userInfo.username, 'recommendations')
      const recQuery = query(recRef, orderBy('createdAt', 'desc'))
      const recSnapshot = await getDocs(recQuery)

      recSnapshot.forEach(doc => {
        const data = doc.data()
        const items = data.items || []
        items.forEach((item: any) => {
          if (item.text) {
            const productName = item.text.split(':')[0].trim()
            if (!previousList.includes(productName)) {
              previousList.push(productName)
            }
          }
        })
      })
    }

    const previousText = previousList.map(p => `- ${p}`).join('\n')

    const productContext = `
[판매 중인 제품 목록]
${productList.map(p => `- ${p.name} (${p.tags.join(', ')})`).join('\n')}

위 제품들은 모두 Nutri AI에서 커스터마이징하여 제조 및 판매하는 영양제입니다.
이 목록 외의 제품은 추천하지 마세요.
`

    const previousPrompt = previousList.length > 0 ? `
[이전에 이미 추천한 제품 목록]
${previousText}

위 제품들은 이미 사용자에게 추천된 제품입니다. 다시 추천하지 마세요.
` : ''

    const systemPrompt = `
당신은 Nutri AI라는 이름의 영양제 상담 전문가입니다.
목표:
1. 사용자의 건강 고민을 듣고 그에 맞는 영양제를 추천해주세요.
2. [추천] 섹션을 사용하여 제품명을 목록으로 정리해주세요.
3. 가격 계산이나 월구독 금액 제안은 하지 마세요.
4. 모든 답변은 한국어로 작성하세요.
5. 중복 추천은 절대 하지 마세요.
6. 외부 브랜드는 언급하지 마세요.
7. 추천은 개인화된 섭취량, 성별, 키, 몸무게 등 고려
8. 궁금증이 끝나면 구독 신청을 제안하세요.
`

    const keywordContext = sortedKeywords.length > 0
      ? `\n[건강 키워드]\n- 최근 사용자 언급 이슈: ${sortedKeywords.join(', ')}`
      : ''

    const userPrompt = `
[사용자 기본 정보]
- 이름: ${userInfo.name}
- 성별: ${userInfo.gender}
- 생년월일: ${userInfo.birth}
- 키: ${userInfo.height} cm
- 몸무게: ${userInfo.weight} kg
- 좌 시력: ${userInfo.leftVision}
- 우 시력: ${userInfo.rightVision}
- 운동 빈도: ${userInfo.exerciseFrequency}
- 식습관: ${userInfo.dietType}
- 수면의 질: ${userInfo.sleepQuality}
- 건강 목표: ${userInfo.healthGoal}
- 알레르기 정보: ${userInfo.allergies}
${keywordContext}

사용자의 최신 메시지: ${message}
`

    const messagesArray = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: productContext },
      ...(previousPrompt ? [{ role: 'user', content: previousPrompt }] : []),
      { role: 'user', content: userPrompt }
    ]

    if (conversation && Array.isArray(conversation)) {
      conversation.forEach((msg: any) => {
        const role = msg.sender === 'gpt' ? 'assistant' : 'user'
        messagesArray.push({ role, content: msg.content })
      })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messagesArray,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || '죄송해요, 응답을 가져오지 못했어요.'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('오류 발생 (/api/chat):', error)
    return NextResponse.json({ reply: '오류가 발생했어요. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }
}
