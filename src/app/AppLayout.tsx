import { Outlet } from 'react-router-dom'
import SiteHeader from './SiteHeader'

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1 bg-surface">
        <Outlet />
      </div>
    </div>
  )
}

export default AppLayout
