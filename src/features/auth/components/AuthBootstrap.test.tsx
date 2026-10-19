import { render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import {
  jsonResponse,
  resetAuthStore,
  userBody,
} from '../../../test/auth-test-utils'
import { setupAuth } from '../auth-session'
import { useAuthStore } from '../store/auth-store'
import AuthBootstrap from './AuthBootstrap'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  setupAuth()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AuthBootstrap', () => {
  it('StrictMode에서 effect가 두 번 실행되어도 refresh는 한 번만 보낸다', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          access_token: 'access-1',
          token_type: 'bearer',
          expires_in: 900,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, userBody))

    render(
      <StrictMode>
        <AuthBootstrap>
          <p>앱</p>
        </AuthBootstrap>
      </StrictMode>,
    )

    expect(screen.getByText('앱')).toBeInTheDocument()
    await waitFor(() =>
      expect(useAuthStore.getState().status).toBe('authenticated'),
    )
    const refreshCalls = fetchMock.mock.calls.filter(
      ([url]) => url === '/api/auth/refresh',
    )
    expect(refreshCalls).toHaveLength(1)
  })
})
