import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import FeeForm from './FeeForm'

const FEE_METHODS = [
  'Scope-Based', 'Hours-Based-Simple', 'Hours-Based-Detailed', 'Target-Fee',
]

const FEE_STATUSES = ['Draft', 'Under-Review', 'Executed', 'Superseded']

const STATUS_STYLES = {
  'Draft':        'bg-gray-100 text-[#6B7280]',
  'Under-Review': 'bg-amber-50 text-[#F59E0B]',
  'Executed':     'bg-green-50 text-[#10B981]',
  'Superseded':   'bg-gray-100 text-[#6B7280]',
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

  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')

  // Modal state: null=closed, 'select-project'=step1 (firm-wide only), 'create-fee'=step2
  const [modalStep, setModalStep] = useState(null)
  const [pendingProjectId, setPendingProjectId] = useState(null)
  const [pendingProjectName, setPendingProjectName] = useState(null)

  useEffect(() => {
    fetchFees()
  }, [projectId])

  async function fetchFees() {
    setLoading(true)
    let query = supabase
      .from('fee_records')
      .select('*, projects(project_id, project_name, project_number)')
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error fetching fees:', error)
    } else {
      setFees(data ?? [])
    }
    setLoading(false)
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

  const filtered = fees.filter((f) => {
    const q = search.toLowerCase()
    const matchesSearch =
      (f.fee_name ?? '').toLowerCase().includes(q) ||
      (f.projects?.project_name ?? '').toLowerCase().includes(q) ||
      (f.projects?.project_number ?? '').toLowerCase().includes(q)
    const matchesStatus = statusFilter ? f.status === statusFilter : true
    const matchesMethod = methodFilter ? f.method === methodFilter : true
    return matchesSearch && matchesStatus && matchesMethod
  })

  // Columns differ between embedded and firm-wide modes
  const showProjectCols = !embedded

  return (
    <div>
      {/* Page header — firm-wide mode only */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1A2E]">Fee Development</h1>
            <p className="text-sm text-[#6B7280] mt-1">All fee records across all projects.</p>
          </div>
          <button
            onClick={openAddFee}
            className="bg-[#F2903A] text-white text-sm px-4 py-2 rounded hover:bg-orange-500 transition-colors"
          >
            + Add Fee
          </button>
        </div>
      )}

      {/* Embedded header — project-scoped mode */}
      {embedded && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Fee Development</h2>
          <button
            onClick={openAddFee}
            className="text-sm bg-[#F2903A] text-white px-3 py-1.5 rounded hover:bg-orange-500"
          >
            + Add Fee
          </button>
        </div>
      )}

      {/* Filters — firm-wide only */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by project or fee name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] w-full sm:w-72 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          >
            <option value="">All Statuses</option>
            {FEE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          >
            <option value="">All Methods</option>
            {FEE_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      <div className={`overflow-x-auto rounded border border-[#E5E7EB] bg-white ${embedded ? '-mx-6 px-6' : ''}`}>
        <table className="min-w-full text-sm">
          <thead className="bg-[#F3F4F6] text-[#6B7280] uppercase text-xs">
            <tr>
              {showProjectCols && (
                <>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Project #</th>
                  <th className="text-left px-4 py-3">Project Name</th>
                </>
              )}
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
                <td colSpan={showProjectCols ? 8 : 6} className="px-4 py-6 text-center text-[#6B7280]">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={showProjectCols ? 8 : 6} className="px-4 py-6 text-center text-[#6B7280]">
                  {fees.length === 0 ? 'No fees yet. Add one above.' : 'No fees match your filters.'}
                </td>
              </tr>
            )}
            {!loading && filtered.map((fee) => (
              <tr
                key={fee.fee_id}
                onClick={() => navigate(`/fees/${fee.fee_id}`)}
                className="border-t border-[#E5E7EB] hover:bg-[#F8F9FA] cursor-pointer"
              >
                {showProjectCols && (
                  <>
                    <td className="px-4 py-3 font-mono text-xs text-[#6B7280] whitespace-nowrap">
                      {fee.projects?.project_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[#1A1A2E]">
                      {fee.projects?.project_name ?? '—'}
                    </td>
                  </>
                )}
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

      {/* Modals */}
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
            onSave={() => {
              closeModal()
              fetchFees()
            }}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  )
}
