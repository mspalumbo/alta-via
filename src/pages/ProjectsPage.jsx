import PageWrapper from '../components/layout/PageWrapper'
import ProjectList from '../components/projects/ProjectList'

export default function ProjectsPage() {
  return (
    <PageWrapper breadcrumb="Projects">
      <ProjectList />
    </PageWrapper>
  )
}
