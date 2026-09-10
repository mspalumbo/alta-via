import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const SECTIONS = [
  {
    label: 'CRM',
    modules: [
      { label: 'Clients & Contacts', path: '/clients', built: true },
      { label: 'BD & Pursuits', path: '/bd', built: false },
    ],
  },
  {
    label: 'Projects',
    modules: [
      { label: 'Contract', path: '/projects', built: true },
      { label: 'Billing', path: '/billing', built: false },
      { label: 'Accounts Receivable', path: '/ar', built: false },
    ],
  },
  {
    label: 'Employee',
    modules: [
      { label: 'Timecards', path: '/timesheets', built: true },
      { label: 'PTO Management', path: '/pto', built: false },
      { label: 'Expense Reports', path: '/expenses', built: false },
      { label: 'Utilization Projection', path: '/utilization', built: false },
      { label: 'CV / Talent Profile', path: '/cv', built: false },
      { label: 'Performance Evaluations', path: '/performance', built: false },
    ],
  },
  {
    label: 'Management',
    modules: [
      { label: 'Rate Builder', path: '/rate-builder', built: true },
      { label: 'Employee Management', path: '/employee-management', built: false },
      { label: 'Profit & Margins', path: '/profit', built: false },
      { label: 'Staff Utilization', path: '/staff-utilization', built: false },
      { label: 'Project Financials', path: '/project-financials', built: false },
      { label: 'Firm Expenses', path: '/firm-expenses', built: false },
      { label: 'EBITDA Dashboard', path: '/ebitda', built: false },
      { label: 'Management Visibility', path: '/management', built: false },
    ],
  },
]

function moduleLinkClass({ isActive }) {
  return `flex items-center px-3 py-2 rounded text-sm transition-colors ${
    isActive
      ? 'text-white border-l-4 border-[#F2903A] bg-white/10 pl-4'
      : 'bg-white/8 text-white/60 hover:text-white hover:bg-white/12 pl-5'
  }`
}

const comingSoonClass = 'flex items-center px-3 py-2 pl-5 rounded text-sm bg-white/5 text-white/30 cursor-not-allowed'

function dashboardLinkClass({ isActive }) {
  return `flex items-center w-full px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'text-white bg-white/10 border-l-4 border-[#F2903A]'
      : 'text-white/80 hover:bg-white/5'
  }`
}

function DashboardLink({ onNavigate }) {
  return (
    <div className="border-b border-white/10 mb-2">
      <NavLink to="/" end onClick={onNavigate} className={dashboardLinkClass}>
        Dashboard
      </NavLink>
    </div>
  )
}

function ModuleItem({ module, onNavigate }) {
  if (!module.built) {
    return (
      <div className={comingSoonClass} aria-disabled="true">
        {module.label}
      </div>
    )
  }
  return (
    <NavLink to={module.path} onClick={onNavigate} className={moduleLinkClass}>
      {module.label}
    </NavLink>
  )
}

function SectionGroup({ section, open, onToggle, onNavigate }) {
  return (
    <div className="mb-2 border-t border-white/10 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-white/70 transition-colors"
        aria-expanded={open}
      >
        <span>{section.label}</span>
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {section.modules.map((m) => (
            <ModuleItem key={m.path} module={m} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSections, setOpenSections] = useState(() => {
    try {
      const saved = sessionStorage.getItem('cortina-sidebar-sections')
      return saved ? JSON.parse(saved) : SECTIONS.reduce((acc, s) => ({ ...acc, [s.label]: false }), {})
    } catch {
      return SECTIONS.reduce((acc, s) => ({ ...acc, [s.label]: false }), {})
    }
  })

  function toggleSection(label) {
    setOpenSections((prev) => {
      const next = { ...prev, [label]: !prev[label] }
      try { sessionStorage.setItem('cortina-sidebar-sections', JSON.stringify(next)) } catch {}
      return next
    })
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-[#1E3D2F] z-40">
        {/* Logo area */}
        <div className="flex items-center justify-center h-16 border-b border-white/10 shrink-0">
          <span className="text-white font-bold tracking-widest text-lg">CORTINA</span>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <DashboardLink />
          {SECTIONS.map((section) => (
            <SectionGroup
              key={section.label}
              section={section}
              open={openSections[section.label]}
              onToggle={() => toggleSection(section.label)}
            />
          ))}
        </nav>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#1E3D2F] z-40 flex items-center justify-between px-4">
        <span className="text-white font-bold tracking-widest">CORTINA</span>
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
        <div className="md:hidden fixed top-14 left-0 right-0 bottom-0 bg-[#1E3D2F] z-40 border-t border-white/10 overflow-y-auto">
          <nav className="px-2 py-2">
            <DashboardLink onNavigate={() => setMobileOpen(false)} />
            {SECTIONS.map((section) => (
              <SectionGroup
                key={section.label}
                section={section}
                open={openSections[section.label]}
                onToggle={() => toggleSection(section.label)}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
