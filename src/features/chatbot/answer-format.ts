// 서버는 답변 끝에 "※ 일반 정보이며 의료 조언이 아닙니다..." 면책 문구를 붙여 보낸다.
// 본문과 구분해서 작게 보여주기 위해 나눈다.
export function splitDisclaimer(answer: string): {
  body: string
  note: string | null
} {
  const index = answer.lastIndexOf('※')
  if (index < 0) return { body: answer.trim(), note: null }
  return {
    body: answer.slice(0, index).trim(),
    note: answer.slice(index).trim(),
  }
}

const JURISDICTION_LABELS: Record<string, string> = {
  KR: '한국',
  US: '미국',
  UK: '영국',
  INTL: '국제',
}

// 자료가 어느 나라 기준인지 알려 한국 지침으로 오해하지 않게 한다.
export function jurisdictionLabel(code: string): string {
  return JURISDICTION_LABELS[code] ?? code
}

// 출처 링크는 https 주소만 연다. (잘못된 주소로 스크립트나 다른 방식이 실행되지 않게 한다)
export function isSafeUrl(url: string): boolean {
  return /^https:\/\//i.test(url)
}
