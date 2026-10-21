import { render, screen } from '@testing-library/react'
import ConsentFields from './ConsentFields'

function renderFields() {
  render(
    <ConsentFields
      terms={false}
      healthData={false}
      onTermsChange={() => {}}
      onHealthDataChange={() => {}}
    />,
  )
}

describe('ConsentFields', () => {
  it('두 체크박스는 같은 크기이고 문구가 길어 줄바꿈돼도 줄어들지 않는다', () => {
    renderFields()

    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(2)
    for (const box of boxes) {
      // 줄어들지 않게(shrink-0) 고정하지 않으면 긴 문구 쪽 체크박스만 찌그러진다.
      expect(box).toHaveClass('size-5', 'shrink-0')
    }
  })

  it('체크 색은 대표 색이다', () => {
    renderFields()

    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toHaveClass('accent-brand-text')
    }
  })
})
