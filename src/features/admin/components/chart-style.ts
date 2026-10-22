// 차트 색. 데이터 시각화 팔레트 검사(색각 이상 구분·대비)를 통과한 값이라, 서비스 브랜드색 대신 쓴다.
// 1번(파랑)은 한 계열만 있는 차트 전부, 2번(주황)은 두 번째 계열에만 쓴다. 색은 순서대로 고정이고 순위로 바꾸지 않는다.
export const SERIES_1 = '#2a78d6'
export const SERIES_2 = '#eb6834'

export const SURFACE = '#ffffff'
// 격자·축은 면보다 한 단계만 진한 실선 헤어라인
export const GRID = '#ececf0'
export const AXIS_TEXT = '#6e6e73'

export const CHART_MARGIN = { top: 8, right: 28, bottom: 0, left: 0 }

// 운동처럼 종류가 여럿인 계열의 색. 순서대로 고정이고 종류의 순위가 아니라 id 순서로 배정해,
// 필터를 바꿔도 같은 운동은 늘 같은 색이다. 8개를 넘으면 나머지는 "기타"(회색)로 묶는다.
export const CATEGORICAL = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#6250d6',
  '#e34948',
]
export const OTHER_COLOR = '#9a9aa0'
