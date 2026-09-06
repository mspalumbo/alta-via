import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import FeeForm from './FeeForm'

// Fee status badge colors (matches FeeDetail)
const STATUS_STYLES = {
  'Draft':        'bg-gray-100 text-[#6B7280]',
  'Under-Review': 'bg-amber-50 text-[#F59E0B]',
  'Executed':     'bg-green-50 text-[#10B981]',
  'Superseded':   'bg-gray-100 text-[#6B7280]',
}

// Project status badge colors
const PROJECT_STATUS_COLORS = {
  'Pursuit':   'bg-blue-100 text-blue-700',
  'Active':    'bg-green-100 text-green-700',
  'On Hold':   'bg-purple-100 text-purple-700',
  'Complete':  'bg-gray-100 text-gray-600',
  'Lost':      'bg-red-100 text-red-700',
  'Cancelled': 'bg-red-100 text-red-700',
}

function formatCurrency(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(val)
}

function formatDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// Shown in firm-wide mode when user clicks Add Fee — lets them pick a project first
function ProjectSelectorStep({ onSelect, onCancel }) {
  const [projects, setProjects] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('projects')
        .select('project_id, project_name, project_number')
        .order('project_name', { ascending: true })
      setProjects(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const selected = projects.find((p) => p.project_id === selectedId)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Project <span className="text-[#EF4444]">*</span>
        </label>
        {loading ? (
          <div className="text-sm text-[#6B7280]">Loading projects...</div>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.project_number ? `${p.project_number} — ` : ''}{p.project_name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="text-sm text-[#6B7280] px-4 py-2 border border-[#E5E7EB] rounded hover:bg-[#F8F9FA]"
        >
          Cancel
        </button>
        <button
          onClick={() => selected && onSelect(selected.project_id, selected.project_name)}
          disabled={!selectedId}
          className="text-sm bg-[#F2903A] text-white px-4 py-2 rounded hover:bg-orange-500 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// projectId + projectName: if provided, operates in embedded (project-scoped) mode
export default function FeeList({ projectId, projectName }) {
  const navigate = useNavigate()
  const embedded = Boolean(projectId)

  // Embedded mode — flat list of this project's fees
  const [fees, setFees] = useState([])
  // Firm-wide mode — project list with expandable fees
  const [projects, setProjects] = useState([])
  const [feesByProject, setFeesByProject] = useState({}) // projectId → fee[]
  const [expandedProjects, setExpandedProjects] = useState(new Set())

  // Firm-wide project filters / sort
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name') // 'name' | 'status' | 'fee-count'

  const [loading, setLoading] = useState(true)

  // Modal state: null=closed, 'select-project'=step1 (firm-wide only), 'create-fee'=step2
  const [modalStep, setModalStep] = useState(null)
  const [pendingProjectId, setPendingProjectId] = useState(null)
  const [pendingProjectName, setPendingProjectName] = useState(null)

  useEffect(() => {
    fetchData()
  }, [projectId])

  async function fetchData() {
    setLoading(true)

    if (embedded) {
      const { data, error } = await supabase
        .from('fee_records')
        .select('*, projects(project_id, project_name, project_number)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) console.error('Error fetching fees:', error)
      setFees(data ?? [])
      setLoading(false)
      return
    }

    const [projRes, feeRes] = await Promise.all([
      supabase
        .from('projects')
        .select('project_id, project_name, project_number, status')
        .order('project_name'),
      supabase
        .from('fee_records')
        .select('*, projects(project_name, project_number)')
        .order('created_at', { ascending: false }),
    ])

    if (projRes.error) console.error('Error fetching projects:', projRes.error)
    if (feeRes.error) console.error('Error fetching fees:', feeRes.error)

    setProjects(projRes.data ?? [])

    const map = {}
    for (const fee of feeRes.data ?? []) {
      if (!map[fee.project_id]) map[fee.project_id] = []
      map[fee.project_id].push(fee)
    }
    setFeesByProject(map)
    setLoading(false)
  }

  function toggleProject(pid) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }

  function openAddFee() {
    if (embedded) {
      // Already know the project — go straight to fee form
      setPendingProjectId(projectId)
      setPendingProjectName(projectName)
      setModalStep('create-fee')
    } else {
      setModalStep('select-project')
    }
  }

  function handleProjectSelected(pid, pname) {
    setPendingProjectId(pid)
    setPendingProjectName(pname)
    setModalStep('create-fee')
  }

  function closeModal() {
    setModalStep(null)
    setPendingProjectId(null)
    setPendingProjectName(null)
  }

  function handleFeeCreated() {
    const pid = pendingProjectId
    // Auto-expand the project the new fee belongs to (firm-wide mode)
    if (pid && !embedded) {
      setExpandedProjects((prev) => new Set([...prev, pid]))
    }
    closeModal()
    fetchData()
  }

  const modals = (
    <>
      {modalStep === 'select-project' && (
        <Modal title="Add Fee — Select Project" onClose={closeModal}>
          <ProjectSelectorStep
            onSelect={handleProjectSelected}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {modalStep === 'create-fee' && (
        <Modal title="Add Fee" onClose={closeModal}>
          <FeeForm
            projectId={pendingProjectId}
            projectName={pendingProjectName}
            onSave={handleFeeCreated}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </>
  )

  // ---------------------------------------------------------------------------
  // Embedded mode — flat single-project fee list (unchanged behavior)
  // ---------------------------------------------------------------------------
  if (embedded) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Fee Development</h2>
          <button
            onClick={openAddFee}
            className="text-sm bg-[#F2903A] text-white px-3 py-1.5 rounded hover:bg-orange-500"
          >
            + Add Fee
          </button>
        </div>

        <div className="overflow-x-auto rounded border border-[#E5E7EB] bg-white -mx-6 px-6">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F3F4F6] text-[#6B7280] uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3">Fee Name</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Method</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
                <th className="text-right px-4 py-3 whitespace-nowrap">Total Fee</th>
                <th className="text-right px-4 py-3 whitespace-nowrap">Discounted Fee</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[#6B7280]">Loading...</td>
                </tr>
              )}
              {!loading && fees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[#6B7280]">No fees yet. Add one above.</td>
                </tr>
              )}
              {!loading && fees.map((fee) => (
                <tr
                  key={fee.fee_id}
                  onClick={() => navigate(`/fees/${fee.fee_id}`)}
                  className="border-t border-[#E5E7EB] hover:bg-[#F8F9FA] cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-[#1A1A2E]">{fee.fee_name}</td>
                  <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{fee.method}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[fee.status] ?? 'bg-gray-100 text-[#6B7280]'}`}>
                      {fee.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[#1A1A2E] whitespace-nowrap">
                    {formatCurrency(fee.total_fee)}
                  </td>
                  <td className="px-4 py-3 text-right text-[#1A1A2E] whitespace-nowrap">
                    {formatCurrency(fee.discounted_fee)}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                    {formatDate(fee.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {modals}
      </div>
    )
  }

  const filteredProjects = projects
    .filter((p) => {
      const matchesSearch =
        search === '' ||
        p.project_name.toLowerCase().includes(search.toLowerCase()) ||
        p.project_number?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.project_name.localeCompare(b.project_name)
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      if (sortBy === 'fee-count') {
        const aCount = (feesByProject[a.project_id] || []).length
        const bCount = (feesByProject[b.project_id] || []).length
        return bCount - aCount // most fees first
      }
      return 0
    })

  // ---------------------------------------------------------------------------
  // Firm-wide mode — project list, each expandable to reveal its fees
  // ---------------------------------------------------------------------------
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1A2E]">Fee Development</h1>
          <p className="text-sm text-[#6B7280] mt-1">All fee records across all projects.</p>
        </div>
        <button
          onClick={openAddFee}
          className="bg-[#F2903A] text-white text-sm px-4 py-2 rounded hover:bg-orange-500 transition-colors"
        >
          + New Fee
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-[#E5E7EB] rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-[#1E3D2F]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-[#E5E7EB] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#1E3D2F]"
        >
          <option value="all">All Statuses</option>
          <option value="Pursuit">Pursuit</option>
          <option value="Active">Active</option>
          <option value="On Hold">On Hold</option>
          <option value="Complete">Complete</option>
          <option value="Lost">Lost</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border border-[#E5E7EB] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#1E3D2F]"
        >
          <option value="name">Sort: Name</option>
          <option value="status">Sort: Status</option>
          <option value="fee-count">Sort: Fee Count</option>
        </select>
      </div>

      {loading && (
        <div className="text-sm text-[#6B7280] px-4 py-6">Loading...</div>
      )}

      {!loading && projects.length === 0 && (
        <div className="text-sm text-[#6B7280] px-4 py-6">
          No projects found. Create a project first to start building fees.
        </div>
      )}

      {!loading && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="text-sm text-[#6B7280] italic py-4 text-center">
          No projects match your search or filters.
        </div>
      )}

      {!loading && filteredProjects.map((project) => {
        const projectFees = feesByProject[project.project_id] ?? []
        const isExpanded = expandedProjects.has(project.project_id)
        const n = projectFees.length
        return (
          <div key={project.project_id}>
            <div
              onClick={() => toggleProject(project.project_id)}
              className="flex items-center justify-between px-4 py-3 bg-white border border-[#E5E7EB] rounded-lg cursor-pointer hover:bg-[#F8F9FA] transition-colors mb-2"
            >
              <div className="flex items-center min-w-0">
                <span className="text-[#6B7280] mr-2">{isExpanded ? '▾' : '▸'}</span>
                <span className="font-medium text-[#1A1A2E] truncate">{project.project_name}</span>
                {project.project_number && (
                  <span className="text-sm text-[#6B7280] ml-2 whitespace-nowrap">{project.project_number}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs bg-[#F3F4F6] text-[#6B7280] px-2 py-0.5 rounded-full">
                  {n} fee{n !== 1 ? 's' : ''}
                </span>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${PROJECT_STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {project.status}
                </span>
              </div>
            </div>

            {isExpanded && (
              <div>
                {projectFees.length === 0 ? (
                  <div className="ml-6 px-4 py-2 text-sm text-[#6B7280] italic mb-1.5">
                    No fees yet — click "+ New Fee" to add one.
                  </div>
                ) : (
                  projectFees.map((fee) => (
                    <div
                      key={fee.fee_id}
                      onClick={() => navigate(`/fees/${fee.fee_id}`)}
                      className="flex items-center justify-between px-4 py-2.5 ml-6 bg-white border border-[#E5E7EB] rounded-lg cursor-pointer hover:bg-[#F8F9FA] transition-colors mb-1.5"
                    >
                      <div className="flex items-center min-w-0">
                        <span className="text-sm font-medium text-[#1A1A2E] truncate">{fee.fee_name}</span>
                        <span className="text-xs text-[#6B7280] ml-2 whitespace-nowrap">{fee.method}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-medium text-[#1A1A2E]">
                          {fee.total_fee > 0 ? formatCurrency(fee.total_fee) : '—'}
                        </span>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[fee.status] ?? 'bg-gray-100 text-[#6B7280]'}`}>
                          {fee.status}
                        </span>
                        <span className="text-xs text-[#6B7280] whitespace-nowrap">{formatDate(fee.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}

      {modals}
    </div>
  )
}
