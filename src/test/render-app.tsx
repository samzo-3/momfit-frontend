import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '../app/routes'

// 실제 라우트 전체를 렌더링한다. 테스트에서는 mutation을 재시도하지 않는다.
export function renderApp(path: string, state?: unknown) {
  const router = createMemoryRouter(routes, {
    initialEntries: [{ pathname: path, state }],
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
