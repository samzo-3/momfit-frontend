import '@testing-library/jest-dom/vitest'
import { mockReducedMotion } from './motion'

// 테스트는 기본으로 "동작 줄이기"를 켠 것처럼 둔다.
// 모달 등이 애니메이션을 기다리지 않고 즉시 나타나고 사라져서 테스트가 단순해진다.
// 애니메이션 자체를 검증하는 테스트는 mockReducedMotion(false)로 끈다.
beforeEach(() => {
  mockReducedMotion(true)
})
