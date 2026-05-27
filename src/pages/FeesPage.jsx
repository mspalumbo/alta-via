import PageWrapper from '../components/layout/PageWrapper'
import FeeList from '../components/fees/FeeList'

export default function FeesPage() {
  return (
    <PageWrapper breadcrumb="Fee Development">
      <FeeList />
    </PageWrapper>
  )
}
