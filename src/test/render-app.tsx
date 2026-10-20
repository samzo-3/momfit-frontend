import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '../app/routes'

// 실제 라우트 전체를 렌더링한다. 테스트에서는 mutation을 재시도하지 않는다.
export function renderApp(path: string, state?: unknown) {
  // "/login?error=x"처럼 쿼리가 붙은 경로는 pathname과 search로 나눠서 넣어야 쿼리로 해석된다.
  const [pathname, query] = path.split('?')
  const router = createMemoryRouter(routes, {
    initialEntries: [{ pathname, search: query ? `?${query}` : '', state }],
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}
