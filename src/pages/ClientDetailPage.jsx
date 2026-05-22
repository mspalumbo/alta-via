import PageWrapper from '../components/layout/PageWrapper'
import ClientDetail from '../components/clients/ClientDetail'

export default function ClientDetailPage() {
  return (
    <PageWrapper breadcrumb="Clients / Detail">
      <ClientDetail />
    </PageWrapper>
  )
}