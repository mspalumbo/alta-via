import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function PageWrapper({ breadcrumb, children }) {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <TopBar breadcrumb={breadcrumb} />

      {/* Main content area */}
      <main className="pt-14 md:ml-56 min-h-screen">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
