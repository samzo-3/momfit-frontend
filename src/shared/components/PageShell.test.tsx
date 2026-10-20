import { render, screen } from '@testing-library/react'
import PageShell from './PageShell'

describe('PageShell', () => {
  it('기본은 회색 화면이다', () => {
    render(
      <PageShell title="로그인" description="설명">
        내용
      </PageShell>,
    )

    expect(screen.getByRole('main')).toHaveClass('bg-surface')
    expect(screen.getByRole('heading', { name: '로그인' })).not.toHaveClass(
      'text-cocoa',
    )
  })

  it('warm이면 살구색 배경과 코코아 글자를 쓴다', () => {
    render(
      <PageShell title="내 정보" description="설명" tone="warm">
        내용
      </PageShell>,
    )

    expect(screen.getByRole('main')).toHaveClass('bg-primary-soft')
    expect(screen.getByRole('heading', { name: '내 정보' })).toHaveClass(
      'text-cocoa',
    )
    expect(screen.getByText('설명')).toHaveClass('text-cocoa-secondary')
  })

  it('남는 높이를 채워 푸터 위에 다른 색 띠가 생기지 않게 한다', () => {
    render(<PageShell title="제목">내용</PageShell>)

    expect(screen.getByRole('main')).toHaveClass('flex-1')
  })
})
