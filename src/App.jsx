import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PageWrapper from './components/layout/PageWrapper'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import RateCardsPage from './pages/RateCardsPage'
import FeesPage from './pages/FeesPage'
import FeeDetailPage from './pages/FeeDetailPage'
import RateBuilderPage from './pages/RateBuilderPage'

// Placeholder pages — will be replaced as modules are built
function Dashboard() {
  return <PageWrapper breadcrumb="Dashboard"><div className="text-[#1A1A2E]">Dashboard — coming soon</div></PageWrapper>
}

function ComingSoon({ label }) {
  return (
    <PageWrapper breadcrumb={label}>
      <div className="text-[#1A1A2E]">{label} — coming soon</div>
    </PageWrapper>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/fees" element={<FeesPage />} />
        <Route path="/fees/:id" element={<FeeDetailPage />} />
        <Route path="/rates" element={<RateCardsPage />} />

        {/* CRM */}
        <Route path="/bd" element={<ComingSoon label="BD & Pursuits" />} />

        {/* Projects */}
        <Route path="/contracts" element={<ComingSoon label="Contract" />} />
        <Route path="/billing" element={<ComingSoon label="Billing" />} />
        <Route path="/ar" element={<ComingSoon label="Accounts Receivable" />} />

        {/* Employee */}
        <Route path="/timesheets" element={<ComingSoon label="Timecards" />} />
        <Route path="/pto" element={<ComingSoon label="PTO Management" />} />
        <Route path="/expenses" element={<ComingSoon label="Expense Reports" />} />
        <Route path="/utilization" element={<ComingSoon label="Utilization Projection" />} />
        <Route path="/cv" element={<ComingSoon label="CV / Talent Profile" />} />
        <Route path="/performance" element={<ComingSoon label="Performance Evaluations" />} />

        {/* Management */}
        <Route path="/rate-builder" element={<RateBuilderPage />} />
        <Route path="/employee-management" element={<ComingSoon label="Employee Management" />} />
        <Route path="/profit" element={<ComingSoon label="Profit & Margins" />} />
        <Route path="/staff-utilization" element={<ComingSoon label="Staff Utilization" />} />
        <Route path="/project-financials" element={<ComingSoon label="Project Financials" />} />
        <Route path="/firm-expenses" element={<ComingSoon label="Firm Expenses" />} />
        <Route path="/ebitda" element={<ComingSoon label="EBITDA Dashboard" />} />
        <Route path="/management" element={<ComingSoon label="Management Visibility" />} />

        {/* Retained legacy route — no sidebar entry */}
        <Route path="/invoicing" element={<ComingSoon label="Invoicing & AR" />} />
      </Routes>
    </BrowserRouter>
  )
}
