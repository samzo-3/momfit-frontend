import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

describe('routes', () => {
  it('루트 경로에서 홈 화면을 보여준다', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: '맘핏' })).toBeInTheDocument()
  })

  it('존재하지 않는 경로에서 404 화면을 보여준다', () => {
    renderAt('/no-such-page')
    expect(
      screen.getByRole('heading', { name: '페이지를 찾을 수 없습니다' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '홈으로 돌아가기' }),
    ).toHaveAttribute('href', '/')
  })
})
