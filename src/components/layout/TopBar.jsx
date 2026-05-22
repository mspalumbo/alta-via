import { useFirm } from '../../context/FirmContext'
import { useAuth } from '../../context/AuthContext'

export default function TopBar({ breadcrumb }) {
  const { firm } = useFirm()
  const { user } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 md:left-56 h-14 bg-white border-b border-[#E5E7EB] z-30 flex items-center justify-between px-4 md:px-6">
      {/* Breadcrumb */}
      <div className="text-sm text-[#6B7280]">
        <span className="text-[#1A1A2E] font-medium">
          {firm?.firm_name ?? 'Alta•Via'}
        </span>
        {breadcrumb && (
          <>
            <span className="mx-2">/</span>
            <span>{breadcrumb}</span>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Approval queue badge */}
        <button className="relative text-[#6B7280] hover:text-[#1A1A2E] text-sm">
          Approvals
          <span className="absolute -top-1 -right-3 bg-[#F2903A] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            0
          </span>
        </button>

        {/* User */}
        <div className="text-sm text-[#6B7280]">
          {user?.email ?? 'Guest'}
        </div>
      </div>
    </header>
  )
}