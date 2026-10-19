import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { mockReducedMotion } from './motion'

// 테스트는 기본으로 "동작 줄이기"를 켠 것처럼 둔다.
// 모달 등이 애니메이션을 기다리지 않고 즉시 나타나고 사라져서 테스트가 단순해진다.
// 애니메이션 자체를 검증하는 테스트는 mockReducedMotion(false)로 끈다.
beforeEach(() => {
  mockReducedMotion(true)
})

// waitFor·findBy의 기본 대기 시간(1초)은 부하가 있는 환경에서 모자랄 수 있다.
configure({ asyncUtilTimeout: 5000 })
