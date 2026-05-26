import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PageWrapper from './components/layout/PageWrapper'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import RateCardsPage from './pages/RateCardsPage'

// Placeholder pages — will be replaced as modules are built
function Dashboard() {
  return <PageWrapper breadcrumb="Dashboard"><div className="text-[#1A1A2E]">Dashboard — coming soon</div></PageWrapper>
}
function Fees() {
  return <PageWrapper breadcrumb="Fee Development"><div className="text-[#1A1A2E]">Fee Development — coming soon</div></PageWrapper>
}
function Timesheets() {
  return <PageWrapper breadcrumb="Timesheets"><div className="text-[#1A1A2E]">Timesheets — coming soon</div></PageWrapper>
}
function Invoicing() {
  return <PageWrapper breadcrumb="Invoicing & AR"><div className="text-[#1A1A2E]">Invoicing & AR — coming soon</div></PageWrapper>
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
        <Route path="/fees" element={<Fees />} />
        <Route path="/rates" element={<RateCardsPage />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/invoicing" element={<Invoicing />} />
      </Routes>
    </BrowserRouter>
  )
}