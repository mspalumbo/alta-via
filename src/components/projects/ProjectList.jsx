import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import ProjectForm from './ProjectForm'

const PROJECT_TYPES = [
  'Healthcare', 'Performing Arts', 'Education', 'Commercial',
  'Residential', 'Government', 'Mixed Use', 'Other',
]

const PROJECT_STATUSES = ['Pursuit', 'Active', 'On Hold', 'Complete', 'Lost', 'Cancelled']

const STATUS_STYLES = {
  'Pursuit':   'bg-gray-100 text-[#6B7280]',
  'Active':    'bg-green-50 text-[#10B981]',
  'On Hold':   'bg-purple-50 text-[#8B5CF6]',
  'Complete':  'bg-green-50 text-[#10B981]',
  'Lost':      'bg-red-50 text-[#EF4444]',
  'Cancelled': 'bg-red-50 text-[#EF4444]',
}

function formatCurrency(value) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export default function ProjectList() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('project_id, project_number, project_name, project_type, status, contracted_fee, clients(company_name)')
      .order('project_number', { ascending: true })

    if (error) {
      console.error('Error fetching projects:', error)
    } else {
      setProjects(data ?? [])
    }
    setLoading(false)
  }

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase()
    const matchesSearch =
      p.project_name.toLowerCase().includes(q) ||
      (p.project_number ?? '').toLowerCase().includes(q)
    const matchesStatus = statusFilter ? p.status === statusFilter : true
    const matchesType = typeFilter ? p.project_type === typeFilter : true
    return matchesSearch && matchesStatus && matchesType
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-[#1A1A2E]">Projects</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#F2903A] text-white text-sm px-4 py-2 rounded hover:bg-orange-500 transition-colors"
        >
          + Add Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        >
          <option value="">All Statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        >
          <option value="">All Types</option>
          {PROJECT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border border-[#E5E7EB] bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F3F4F6] text-[#6B7280] uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3 whitespace-nowrap">Project #</th>
              <th className="text-left px-4 py-3">Project Name</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Client</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Type</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
              <th className="text-right px-4 py-3 whitespace-nowrap">Contracted Fee</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[#6B7280]">Loading...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[#6B7280]">No projects found.</td>
              </tr>
            )}
            {!loading && filtered.map((project) => (
              <tr
                key={project.project_id}
                onClick={() => navigate(`/projects/${project.project_id}`)}
                className="border-t border-[#E5E7EB] hover:bg-[#F8F9FA] cursor-pointer"
              >
                <td className="px-4 py-3 font-mono text-xs text-[#6B7280] whitespace-nowrap">
                  {project.project_number ?? '—'}
                </td>
                <td className="px-4 py-3 font-medium text-[#1A1A2E]">
                  {project.project_name}
                </td>
                <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                  {project.clients?.company_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                  {project.project_type ?? '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[project.status] ?? 'bg-gray-100 text-[#6B7280]'}`}>
                    {project.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-[#1A1A2E] whitespace-nowrap">
                  {formatCurrency(project.contracted_fee)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <Modal title="Add Project" onClose={() => setShowAddModal(false)}>
          <ProjectForm
            onSave={() => {
              setShowAddModal(false)
              fetchProjects()
            }}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}
    </div>
  )
}
