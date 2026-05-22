import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PageWrapper from './components/layout/PageWrapper'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'

// Placeholder pages — will be replaced as modules are built
function Dashboard() {
  return <PageWrapper breadcrumb="Dashboard"><div className="text-[#1A1A2E]">Dashboard — coming soon</div></PageWrapper>
}
function Projects() {
  return <PageWrapper breadcrumb="Projects"><div className="text-[#1A1A2E]">Projects — coming soon</div></PageWrapper>
}
function Fees() {
  return <PageWrapper breadcrumb="Fee Development"><div className="text-[#1A1A2E]">Fee Development — coming soon</div></PageWrapper>
}
function Rates() {
  return <PageWrapper breadcrumb="Rate Cards"><div className="text-[#1A1A2E]">Rate Cards — coming soon</div></PageWrapper>
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
        <Route path="/projects" element={<Projects />} />
        <Route path="/fees" element={<Fees />} />
        <Route path="/rates" element={<Rates />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/invoicing" element={<Invoicing />} />
      </Routes>
    </BrowserRouter>
  )
}