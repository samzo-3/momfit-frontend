import { Outlet } from 'react-router-dom'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1 bg-surface">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  )
}

export default AppLayout
