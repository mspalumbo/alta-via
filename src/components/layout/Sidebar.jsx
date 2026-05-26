import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Clients', path: '/clients' },
  { label: 'Projects', path: '/projects' },
  { label: 'Fee Development', path: '/fees' },
  { label: 'Rate Cards', path: '/rates' },
  { label: 'Timesheets', path: '/timesheets' },
  { label: 'Invoicing & AR', path: '/invoicing' },
]

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-[#1E3D2F] z-40">
        {/* Logo area */}
        <div className="flex items-center justify-center h-16 border-b border-white/10">
          <span className="text-white font-bold tracking-widest text-lg">ALTA•VIA</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'text-white border-l-4 border-[#F2903A] bg-white/10 pl-2'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#1E3D2F] z-40 flex items-center justify-between px-4">
        <span className="text-white font-bold tracking-widest">ALTA•VIA</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white p-2"
          aria-label="Toggle menu"
        >
          <div className="w-5 h-0.5 bg-white mb-1" />
          <div className="w-5 h-0.5 bg-white mb-1" />
          <div className="w-5 h-0.5 bg-white" />
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 bg-[#1E3D2F] z-40 border-t border-white/10">
          <nav className="px-2 py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded text-sm ${
                    isActive
                      ? 'text-white border-l-4 border-[#F2903A] bg-white/10 pl-2'
                      : 'text-white/60'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}