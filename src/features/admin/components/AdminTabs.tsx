import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/admin', label: '현황', end: true },
  { to: '/admin/members', label: '회원관리', end: false },
]

// 관리자 화면 안의 이동. 헤더에는 "관리자" 링크 하나만 있고, 세부 화면은 여기서 오간다.
function AdminTabs() {
  return (
    <nav aria-label="관리자 메뉴" className="flex gap-1 border-b border-line">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `-mb-px border-b-2 px-4 py-2 text-[15px] font-medium transition-colors ${
              isActive
                ? 'border-brand-text text-brand-text'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default AdminTabs
