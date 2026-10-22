import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../../../shared/components/Button'
import Notice from '../../../shared/components/Notice'
import TextField from '../../../shared/components/TextField'
import {
  MEMBER_PAGE_SIZE,
  type MemberListQuery,
  type MemberStatus,
} from '../api/members-api'
import { PROVIDER_LABELS, formatKstDate, formatPlainDate } from '../format'
import { useMemberList } from '../hooks/useMembers'
import StatusBadge from './StatusBadge'

const STATUS_FILTERS: { value: MemberStatus | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'active', label: '이용 중' },
  { value: 'withdrawn', label: '탈퇴 유예' },
]

// 검색어·상태·페이지는 주소(?q=&status=&page=)에 담아, 상세에서 돌아와도 보던 목록 그대로 보이게 한다.
function readQuery(params: URLSearchParams): MemberListQuery {
  const status = params.get('status')
  const page = Number(params.get('page'))
  return {
    q: params.get('q') ?? '',
    status: status === 'active' || status === 'withdrawn' ? status : '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

function MemberListView() {
  const [params, setParams] = useSearchParams()
  const query = readQuery(params)
  const [text, setText] = useState(query.q)
  const members = useMemberList(query)

  function update(next: Partial<MemberListQuery>) {
    const merged = { ...query, ...next }
    const search = new URLSearchParams()
    if (merged.q) search.set('q', merged.q)
    if (merged.status) search.set('status', merged.status)
    if (merged.page > 1) search.set('page', String(merged.page))
    setParams(search)
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    update({ q: text.trim(), page: 1 })
  }

  const data = members.data
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <form
          role="search"
          onSubmit={handleSearch}
          className="flex items-end gap-2"
        >
          <TextField
            label="검색"
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="닉네임·이메일·아이디"
            maxLength={100}
          />
          <Button type="submit" variant="brand" size="sm" className="mb-1">
            검색
          </Button>
        </form>
        <div role="group" aria-label="상태" className="flex gap-1 pb-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={query.status === filter.value}
              onClick={() => update({ status: filter.value, page: 1 })}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                query.status === filter.value
                  ? 'bg-brand text-on-brand'
                  : 'text-ink-secondary hover:bg-primary'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {members.isError && (
        <Notice kind="error">회원 목록을 불러오지 못했어요.</Notice>
      )}

      {data && (
        <section
          aria-label="회원 목록"
          className={`rounded-3xl bg-white p-6 ring-1 ring-primary-strong transition-opacity ${
            members.isPlaceholderData ? 'opacity-50' : ''
          }`}
        >
          {data.items.length === 0 ? (
            <p className="py-12 text-center text-[15px] text-ink-secondary">
              조건에 맞는 회원이 없어요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-176 text-left text-sm">
                <caption className="sr-only">회원 목록</caption>
                <thead className="text-ink-secondary">
                  <tr>
                    {[
                      '닉네임',
                      '이메일',
                      '가입 방식',
                      '상태',
                      '가입일',
                      '마지막 방문',
                      '완료 운동',
                    ].map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="py-2 pr-4 font-medium"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((member) => (
                    <tr key={member.id} className="border-t border-line/60">
                      <td className="py-3 pr-4 font-medium">
                        <Link
                          to={`/admin/members/${member.id}`}
                          className="text-link hover:underline"
                        >
                          {member.nickname}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">{member.email ?? '-'}</td>
                      <td className="py-3 pr-4">
                        {PROVIDER_LABELS[member.provider]}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {formatKstDate(member.createdAt)}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {formatPlainDate(member.lastVisitDate)}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {member.completedExercises.toLocaleString('ko-KR')}회
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <nav
            aria-label="페이지"
            className="mt-4 flex items-center justify-between border-t border-line/60 pt-4 text-sm"
          >
            <p className="text-ink-secondary">
              총 {data.total.toLocaleString('ko-KR')}명 · {data.page} /{' '}
              {totalPages} 페이지 (한 페이지 {MEMBER_PAGE_SIZE}명)
            </p>
            <div className="flex gap-2">
              <Button
                variant="brand-outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => update({ page: data.page - 1 })}
              >
                이전
              </Button>
              <Button
                variant="brand-outline"
                size="sm"
                disabled={data.page >= totalPages}
                onClick={() => update({ page: data.page + 1 })}
              >
                다음
              </Button>
            </div>
          </nav>
        </section>
      )}
    </div>
  )
}

export default MemberListView
