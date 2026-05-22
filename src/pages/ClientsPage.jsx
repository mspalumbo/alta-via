import PageWrapper from '../components/layout/PageWrapper'
import ClientList from '../components/clients/ClientList'

export default function ClientsPage() {
  return (
    <PageWrapper breadcrumb="Clients">
      <ClientList />
    </PageWrapper>
  )
}