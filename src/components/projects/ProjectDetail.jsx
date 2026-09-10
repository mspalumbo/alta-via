import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import ProjectForm from './ProjectForm'
import FeeList from '../fees/FeeList'

// Hardcoded test user — auth is not built yet. Replace with auth.uid() once login exists.
const TEST_USER_ID = '1683e702-bbee-426f-92fd-cad64b8cd731'

const STATUS_STYLES = {
  'Pursuit':   'bg-gray-100 text-[#6B7280]',
  'Active':    'bg-green-50 text-[#10B981]',
  'On Hold':   'bg-purple-50 text-[#8B5CF6]',
  'Complete':  'bg-green-50 text-[#10B981]',
  'Lost':      'bg-red-50 text-[#EF4444]',
  'Cancelled': 'bg-red-50 text-[#EF4444]',
}

const ADD_SERVICE_STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'contract', label: 'Contract' },
  { key: 'fees', label: 'Fee Development' },
  { key: 'team', label: 'Team' },
]

const CONTRACT_TYPES = ['AIA', 'Custom-PSA', 'Other']
const PAYMENT_TERMS_OPTIONS = ['Net 30', 'Net 45', 'Net 60', 'Due on Receipt']
const INVOICE_DETAIL_LEVELS = ['Summary', 'By-Employee', 'By-Employee-with-Descriptions']

const RATE_ROLES = [
  'Principal', 'Sr-PM', 'PM', 'Coordinator', 'Contracts',
  'CM', 'Scheduling', 'Sustainability', 'BD', 'Admin', 'Custom',
]

const INPUT_CLS =
  'border border-[#E5E7EB] rounded px-2 py-1.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]'

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-[#6B7280] mb-1">{label}</div>
      <div className="text-sm text-[#1A1A2E]">{value ?? '—'}</div>
    </div>
  )
}

function formatDate(val) {
  if (!val) return null
  return new Date(val + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(val) {
  if (val == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

function formatRate(val) {
  if (val == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val)
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'overview')

  // Team assignments
  const [assignments, setAssignments] = useState([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [users, setUsers] = useState([])

  // Contract tab
  const [overrides, setOverrides] = useState([])
  const [addServices, setAddServices] = useState([])
  const [standardRates, setStandardRates] = useState({})

  useEffect(() => {
    fetchProject()
    fetchAssignments()
    fetchUsers()
    fetchOverrides()
    fetchAddServices()
    fetchStandardRates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchProject() {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*, clients(client_id, company_name)')
      .eq('project_id', id)
      .single()

    if (error) {
      console.error('Error fetching project:', error)
    } else {
      setProject(data)
    }
    setLoading(false)
  }

  async function fetchAssignments() {
    setAssignmentsLoading(true)
    const { data, error } = await supabase
      .from('project_team_assignments')
      .select('*, users(user_id, first_name, last_name, role)')
      .eq('project_id', id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching assignments:', error)
    } else {
      setAssignments(data ?? [])
    }
    setAssignmentsLoading(false)
  }

  async function fetchUsers() {
    const { data } = await supabase
      .from('users')
      .select('user_id, first_name, last_name, role')
      .eq('is_active', true)
      .order('last_name', { ascending: true })
    setUsers(data ?? [])
  }

  async function fetchOverrides() {
    const { data, error } = await supabase
      .from('rate_overrides')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true })
    if (error) console.error('Error fetching rate overrides:', error)
    else setOverrides(data ?? [])
  }

  async function fetchAddServices() {
    const { data, error } = await supabase
      .from('add_services')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching add services:', error)
    else setAddServices(data ?? [])
  }

  async function fetchStandardRates() {
    const { data, error } = await supabase
      .from('rate_cards')
      .select('role, billable_rate')
      .eq('rate_type', 'Role-Based')
      .eq('is_active', true)
      .order('effective_date', { ascending: true })
    if (error) {
      console.error('Error fetching standard rates:', error)
      return
    }
    const map = {}
    for (const r of data ?? []) map[r.role] = r.billable_rate
    setStandardRates(map)
  }

  async function handleRemoveMember(assignmentId) {
    const { error } = await supabase
      .from('project_team_assignments')
      .update({ is_active: false })
      .eq('assignment_id', assignmentId)

    if (!error) fetchAssignments()
  }

  // Generic single-field save for the projects record — used by Contract Details
  // and the document upload/remove actions.
  async function updateProjectField(field, value) {
    setProject((prev) => (prev ? { ...prev, [field]: value } : prev))
    const { error } = await supabase.from('projects').update({ [field]: value }).eq('project_id', id)
    if (error) console.error(`Error updating project.${field}:`, error)
  }

  if (loading) {
    return <div className="text-sm text-[#6B7280]">Loading...</div>
  }

  if (!project) {
    return <div className="text-sm text-[#EF4444]">Project not found.</div>
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <button
            onClick={() => navigate('/projects')}
            className="text-sm text-[#6B7280] hover:text-[#1A1A2E] mb-1 flex items-center gap-1"
          >
            ← Back to Projects
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#1A1A2E]">{project.project_name}</h1>
            {project.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[project.status] ?? 'bg-gray-100 text-[#6B7280]'}`}>
                {project.status}
              </span>
            )}
          </div>
          {project.project_number && (
            <div className="text-xs font-mono text-[#6B7280] mt-0.5">{project.project_number}</div>
          )}
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="text-sm border border-[#E5E7EB] px-4 py-2 rounded text-[#1A1A2E] hover:bg-[#F8F9FA] self-start"
        >
          Edit
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[#E5E7EB] mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={
              activeTab === tab.key
                ? 'border-b-2 border-[#1E3D2F] text-[#1E3D2F] font-medium text-sm px-4 py-2 whitespace-nowrap'
                : 'text-[#6B7280] hover:text-[#1A1A2E] cursor-pointer text-sm px-4 py-2 whitespace-nowrap'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab project={project} />}

      {activeTab === 'contract' && (
        <ContractTab
          project={project}
          projectId={id}
          onUpdateField={updateProjectField}
          onProjectReload={fetchProject}
          overrides={overrides}
          onReloadOverrides={fetchOverrides}
          standardRates={standardRates}
          addServices={addServices}
          onReloadAddServices={fetchAddServices}
        />
      )}

      {activeTab === 'fees' && (
        <div className="bg-white rounded border border-[#E5E7EB] p-6">
          <FeeList
            projectId={id}
            projectName={project.project_name}
            onSelect={(fee) =>
              navigate(`/fees/${fee.fee_id}`, {
                state: {
                  fromProjectId: project.project_id,
                  fromProjectName: project.project_name,
                },
              })
            }
          />
        </div>
      )}

      {activeTab === 'team' && (
        <TeamTab
          assignments={assignments}
          assignmentsLoading={assignmentsLoading}
          onAddMember={() => setShowAddMemberModal(true)}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {/* Edit Project Modal */}
      {showEditModal && (
        <Modal title="Edit Project" onClose={() => setShowEditModal(false)}>
          <ProjectForm
            project={project}
            onSave={() => {
              setShowEditModal(false)
              fetchProject()
            }}
            onCancel={() => setShowEditModal(false)}
          />
        </Modal>
      )}

      {/* Add Team Member Modal */}
      {showAddMemberModal && (
        <Modal title="Add Team Member" onClose={() => setShowAddMemberModal(false)}>
          <AddMemberForm
            projectId={id}
            users={users}
            onSave={() => {
              setShowAddMemberModal(false)
              fetchAssignments()
            }}
            onCancel={() => setShowAddMemberModal(false)}
          />
        </Modal>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------
function OverviewTab({ project }) {
  return (
    <>
      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-[#6B7280] mb-1">Client</div>
            <div className="text-sm">
              {project.clients ? (
                <Link
                  to={`/clients/${project.clients.client_id}`}
                  className="text-[#1E3D2F] hover:text-[#F2903A] font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  {project.clients.company_name}
                </Link>
              ) : '—'}
            </div>
          </div>
          <Field label="Project Type" value={project.project_type} />
          <Field label="Current Phase" value={project.current_phase} />
          {project.description && (
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="text-xs text-[#6B7280] mb-1">Description</div>
              <div className="text-sm text-[#1A1A2E]">{project.description}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Timeline</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Projected Start" value={formatDate(project.projected_start_date)} />
          <Field label="Projected End" value={formatDate(project.projected_end_date)} />
          <Field label="Actual Start" value={formatDate(project.actual_start_date)} />
          <Field label="Actual End" value={formatDate(project.actual_end_date)} />
        </div>
      </div>

      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Financial</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Contracted Fee" value={formatCurrency(project.contracted_fee)} />
          <Field label="Fee Method" value={project.fee_method} />
          <Field label="Billing Method" value={project.billing_method} />
          <Field label="Payment Terms" value={project.payment_terms} />
          <Field label="Invoice Detail" value={project.invoice_detail_level} />
          <Field label="Add Svc Threshold" value={project.add_services_threshold_pct != null ? `${project.add_services_threshold_pct}%` : null} />
        </div>
      </div>

      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Invoices</h2>
        <div className="text-sm text-[#6B7280]">Invoices will appear here once the Invoicing module is built.</div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Team tab
// ---------------------------------------------------------------------------
function TeamTab({ assignments, assignmentsLoading, onAddMember, onRemoveMember }) {
  return (
    <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Team</h2>
        <button
          onClick={onAddMember}
          className="text-sm bg-[#F2903A] text-white px-3 py-1.5 rounded hover:bg-orange-500"
        >
          + Add Team Member
        </button>
      </div>

      {assignmentsLoading ? (
        <div className="text-sm text-[#6B7280]">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="text-sm text-[#6B7280]">No team members assigned. Add one above.</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {['Name', 'System Role', 'Role on Project', 'Start', 'End', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide py-2 pr-4 bg-[#F3F4F6] first:pl-2 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.assignment_id} className="border-b border-[#E5E7EB] last:border-0">
                  <td className="py-2 pr-4 pl-2 whitespace-nowrap font-medium text-[#1A1A2E]">
                    {a.users ? `${a.users.first_name} ${a.users.last_name}` : '—'}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-[#6B7280]">
                    {a.users?.role ?? '—'}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-[#1A1A2E]">
                    {a.role_on_project ?? '—'}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-[#6B7280]">
                    {formatDate(a.start_date) ?? '—'}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-[#6B7280]">
                    {formatDate(a.end_date) ?? '—'}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      onClick={() => onRemoveMember(a.assignment_id)}
                      className="text-xs text-[#EF4444] hover:text-red-700 border border-[#E5E7EB] px-2 py-1 rounded hover:bg-[#F8F9FA]"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contract tab — Details, Document, Rate Overrides, Add Services
// ---------------------------------------------------------------------------
function ContractTab({
  project,
  projectId,
  onUpdateField,
  onProjectReload,
  overrides,
  onReloadOverrides,
  standardRates,
  addServices,
  onReloadAddServices,
}) {
  return (
    <>
      <ContractDetailsSection project={project} onUpdateField={onUpdateField} />
      <ContractDocumentSection project={project} projectId={projectId} onProjectReload={onProjectReload} />
      <RateOverridesSection projectId={projectId} overrides={overrides} standardRates={standardRates} onReload={onReloadOverrides} />
      <AddServicesSection
        projectId={projectId}
        project={project}
        addServices={addServices}
        onReloadAddServices={onReloadAddServices}
        onProjectReload={onProjectReload}
      />
    </>
  )
}

// ---- Section 1: Contract Details ----
function ContractDetailsSection({ project, onUpdateField }) {
  function commitText(field, raw) {
    const next = raw.trim() || null
    if ((next ?? '') === (project[field] ?? '')) return
    onUpdateField(field, next)
  }

  function commitNumber(field, raw) {
    const parsed = parseFloat(raw)
    const next = Number.isFinite(parsed) ? parsed : null
    if (next === project[field]) return
    onUpdateField(field, next)
  }

  return (
    <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
      <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Contract Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[#6B7280] mb-1">Contract Type</label>
          <select
            value={project.contract_type ?? ''}
            onChange={(e) => onUpdateField('contract_type', e.target.value || null)}
            className={`w-full ${INPUT_CLS}`}
          >
            <option value="">—</option>
            {CONTRACT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#6B7280] mb-1">Contract Executed Date</label>
          <input
            key={`executed-${project.contract_executed_date ?? ''}`}
            type="date"
            defaultValue={project.contract_executed_date ?? ''}
            onBlur={(e) => onUpdateField('contract_executed_date', e.target.value || null)}
            className={`w-full ${INPUT_CLS}`}
          />
        </div>
        <div>
          <label className="block text-xs text-[#6B7280] mb-1">PO Number</label>
          <input
            key={`po-${project.po_number ?? ''}`}
            type="text"
            defaultValue={project.po_number ?? ''}
            onBlur={(e) => commitText('po_number', e.target.value)}
            className={`w-full ${INPUT_CLS}`}
          />
        </div>
        <div>
          <label className="block text-xs text-[#6B7280] mb-1">Payment Terms</label>
          <select
            value={project.payment_terms ?? ''}
            onChange={(e) => onUpdateField('payment_terms', e.target.value || null)}
            className={`w-full ${INPUT_CLS}`}
          >
            <option value="">—</option>
            {PAYMENT_TERMS_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#6B7280] mb-1">Invoice Detail Level</label>
          <select
            value={project.invoice_detail_level ?? ''}
            onChange={(e) => onUpdateField('invoice_detail_level', e.target.value)}
            className={`w-full ${INPUT_CLS}`}
          >
            {INVOICE_DETAIL_LEVELS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#6B7280] mb-1">Add Services Threshold</label>
          <div className="flex items-center gap-1">
            <input
              key={`threshold-${project.add_services_threshold_pct ?? ''}`}
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={project.add_services_threshold_pct ?? ''}
              onBlur={(e) => commitNumber('add_services_threshold_pct', e.target.value)}
              className={`w-full ${INPUT_CLS}`}
            />
            <span className="text-sm text-[#6B7280]">%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Section 2: Contract Document ----
function ContractDocumentSection({ project, projectId, onProjectReload }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  function parseFilename(url) {
    try {
      const last = decodeURIComponent(url.split('/').pop())
      return last.replace(/^\d+-/, '')
    } catch {
      return url
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted.')
      return
    }
    setError(null)
    setUploading(true)
    const path = `${projectId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('contract-documents').upload(path, file)
    if (uploadError) {
      console.error('Error uploading contract document:', uploadError)
      setError(uploadError.message)
      setUploading(false)
      return
    }
    const { data: pub } = supabase.storage.from('contract-documents').getPublicUrl(path)
    const { error: updateError } = await supabase
      .from('projects')
      .update({ contract_document_url: pub.publicUrl })
      .eq('project_id', projectId)
    if (updateError) console.error('Error saving document url:', updateError)
    await onProjectReload()
    setUploading(false)
  }

  async function handleRemove() {
    const { error: updateError } = await supabase
      .from('projects')
      .update({ contract_document_url: null })
      .eq('project_id', projectId)
    if (updateError) console.error('Error removing document:', updateError)
    await onProjectReload()
  }

  return (
    <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
      <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Contract Document</h2>
      {error && (
        <div className="text-sm text-[#EF4444] bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
          {error}
        </div>
      )}
      {project.contract_document_url ? (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-[#1A1A2E] truncate max-w-xs">
            {parseFilename(project.contract_document_url)}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={project.contract_document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm border border-[#E5E7EB] px-3 py-1.5 rounded text-[#1A1A2E] hover:bg-[#F8F9FA]"
            >
              View Document
            </a>
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-[#EF4444] hover:text-red-700 border border-[#E5E7EB] px-3 py-1.5 rounded hover:bg-[#F8F9FA]"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded cursor-pointer ${uploading ? 'bg-gray-200 text-[#6B7280] cursor-wait' : 'bg-[#F2903A] text-white hover:bg-orange-500'}`}>
          {uploading ? 'Uploading…' : 'Upload Contract (PDF)'}
          <input type="file" accept="application/pdf" className="hidden" disabled={uploading} onChange={handleFileSelect} />
        </label>
      )}
    </div>
  )
}

// ---- Section 3: Rate Overrides ----
function RateOverridesSection({ projectId, overrides, standardRates, onReload }) {
  async function updateOverride(overrideId, field, value) {
    const { error } = await supabase.from('rate_overrides').update({ [field]: value }).eq('override_id', overrideId)
    if (error) console.error('Error updating rate override:', error)
    await onReload()
  }

  async function deleteOverride(overrideId) {
    if (!window.confirm('Delete this rate override?')) return
    const { error } = await supabase.from('rate_overrides').delete().eq('override_id', overrideId)
    if (error) console.error('Error deleting rate override:', error)
    await onReload()
  }

  async function insertOverride({ role, override_rate, effective_date, notes }) {
    const { error } = await supabase.from('rate_overrides').insert([
      {
        project_id: projectId,
        role,
        override_rate,
        effective_date,
        notes,
        created_by: TEST_USER_ID,
      },
    ])
    if (error) console.error('Error creating rate override:', error)
    await onReload()
  }

  return (
    <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
      <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Rate Overrides</h2>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              {['Role', 'Standard Rate', 'Override Rate', 'Effective Date', 'Notes', ''].map((h) => (
                <th key={h} className="text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide py-2 pr-4 bg-[#F3F4F6] first:pl-2 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {overrides.map((o) => (
              <tr key={o.override_id} className="border-b border-[#E5E7EB] last:border-0 align-top">
                <td className="py-2 pr-4 pl-2">
                  <select
                    value={o.role ?? ''}
                    onChange={(e) => updateOverride(o.override_id, 'role', e.target.value)}
                    className={`${INPUT_CLS}`}
                  >
                    <option value="">—</option>
                    {RATE_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4 text-[#6B7280] whitespace-nowrap">
                  {standardRates[o.role] != null ? `${formatRate(standardRates[o.role])}/hr` : '—'}
                </td>
                <td className="py-2 pr-4">
                  <input
                    key={`${o.override_id}-rate-${o.override_rate}`}
                    type="number"
                    step="0.01"
                    defaultValue={o.override_rate ?? ''}
                    onBlur={(e) => {
                      const parsed = parseFloat(e.target.value)
                      if (Number.isFinite(parsed) && parsed !== Number(o.override_rate)) {
                        updateOverride(o.override_id, 'override_rate', parsed)
                      }
                    }}
                    className={`w-24 ${INPUT_CLS}`}
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    key={`${o.override_id}-date-${o.effective_date}`}
                    type="date"
                    defaultValue={o.effective_date ?? ''}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== o.effective_date) {
                        updateOverride(o.override_id, 'effective_date', e.target.value)
                      }
                    }}
                    className={INPUT_CLS}
                  />
                </td>
                <td className="py-2 pr-4 min-w-[10rem]">
                  <input
                    key={`${o.override_id}-notes-${o.notes}`}
                    type="text"
                    defaultValue={o.notes ?? ''}
                    onBlur={(e) => {
                      const next = e.target.value.trim()
                      if (next && next !== o.notes) updateOverride(o.override_id, 'notes', next)
                    }}
                    className={`w-full ${INPUT_CLS}`}
                  />
                </td>
                <td className="py-2 pr-2">
                  <button
                    type="button"
                    onClick={() => deleteOverride(o.override_id)}
                    aria-label="Delete override"
                    className="w-8 h-8 rounded text-lg leading-none text-[#EF4444] hover:bg-red-50"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}

            <NewOverrideRow standardRates={standardRates} onInsert={insertOverride} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function NewOverrideRow({ standardRates, onInsert }) {
  const [role, setRole] = useState('')
  const [rate, setRate] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [resetKey, setResetKey] = useState(0)

  function handleRowBlur(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return
    const parsedRate = parseFloat(rate)
    if (role && Number.isFinite(parsedRate) && notes.trim()) {
      onInsert({ role, override_rate: parsedRate, effective_date: effectiveDate, notes: notes.trim() })
      setRole('')
      setRate('')
      setEffectiveDate(todayISO())
      setNotes('')
      setResetKey((k) => k + 1)
    }
  }

  return (
    <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]" onBlur={handleRowBlur}>
      <td className="py-2 pr-4 pl-2">
        <select value={role} onChange={(e) => setRole(e.target.value)} className={INPUT_CLS}>
          <option value="">Select role...</option>
          {RATE_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-4 text-[#6B7280] whitespace-nowrap">
        {role && standardRates[role] != null ? `${formatRate(standardRates[role])}/hr` : '—'}
      </td>
      <td className="py-2 pr-4">
        <input
          key={`new-rate-${resetKey}`}
          type="number"
          step="0.01"
          placeholder="0.00"
          defaultValue={rate}
          onChange={(e) => setRate(e.target.value)}
          className={`w-24 ${INPUT_CLS}`}
        />
      </td>
      <td className="py-2 pr-4">
        <input
          key={`new-date-${resetKey}`}
          type="date"
          defaultValue={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          className={INPUT_CLS}
        />
      </td>
      <td className="py-2 pr-4 min-w-[10rem]">
        <input
          key={`new-notes-${resetKey}`}
          type="text"
          placeholder="Reason for override (required)"
          defaultValue={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`w-full ${INPUT_CLS}`}
        />
      </td>
      <td className="py-2 pr-2" />
    </tr>
  )
}

// ---- Section 4: Add Services ----
function AddServicesSection({ projectId, project, addServices, onReloadAddServices, onProjectReload }) {
  const [description, setDescription] = useState('')
  const [additionalFee, setAdditionalFee] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleApprove(row) {
    const additional = Number(row.additional_fee ?? 0)
    const newTotal = Number(project.contracted_fee ?? 0) + additional
    const { error: e1 } = await supabase
      .from('add_services')
      .update({ status: 'Approved', approved_at: new Date().toISOString(), new_contracted_fee: newTotal })
      .eq('add_service_id', row.add_service_id)
    if (e1) console.error('Error approving add service:', e1)
    const { error: e2 } = await supabase.from('projects').update({ contracted_fee: newTotal }).eq('project_id', projectId)
    if (e2) console.error('Error updating contracted fee:', e2)
    await Promise.all([onReloadAddServices(), onProjectReload()])
  }

  async function handleReject(row) {
    const { error } = await supabase.from('add_services').update({ status: 'Rejected' }).eq('add_service_id', row.add_service_id)
    if (error) console.error('Error rejecting add service:', error)
    await onReloadAddServices()
  }

  async function handleSubmitRequest() {
    const parsedFee = parseFloat(additionalFee)
    if (!description.trim() || !Number.isFinite(parsedFee)) return
    setSubmitting(true)
    const { error } = await supabase.from('add_services').insert([
      {
        project_id: projectId,
        description: description.trim(),
        additional_fee: parsedFee,
        notes: notes.trim() || null,
        status: 'Pending',
        requested_by: TEST_USER_ID,
      },
    ])
    if (error) console.error('Error requesting add service:', error)
    await onReloadAddServices()
    setDescription('')
    setAdditionalFee('')
    setNotes('')
    setSubmitting(false)
  }

  const canSubmit = description.trim() && additionalFee !== '' && Number.isFinite(parseFloat(additionalFee))

  return (
    <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
      <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Add Services</h2>

      {addServices.length > 0 && (
        <div className="overflow-x-auto -mx-6 px-6 mb-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {['Description', 'Additional Fee', 'New Total Fee', 'Status', 'Notes', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide py-2 pr-4 bg-[#F3F4F6] first:pl-2 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {addServices.map((s) => (
                <tr key={s.add_service_id} className="border-b border-[#E5E7EB] last:border-0">
                  <td className="py-2 pr-4 pl-2 text-[#1A1A2E]">{s.description}</td>
                  <td className="py-2 pr-4 whitespace-nowrap text-[#1A1A2E]">{formatCurrency(s.additional_fee)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap text-[#1A1A2E]">
                    {formatCurrency(Number(project.contracted_fee ?? 0) + Number(s.additional_fee ?? 0))}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ADD_SERVICE_STATUS_STYLES[s.status] ?? 'bg-gray-100 text-[#6B7280]'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-[#6B7280]">{s.notes ?? '—'}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {s.status === 'Pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(s)}
                          className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:opacity-90"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(s)}
                          className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:opacity-90"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#6B7280]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-[#E5E7EB] pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full ${INPUT_CLS}`}
            />
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Additional Fee</label>
            <input
              type="number"
              step="0.01"
              value={additionalFee}
              onChange={(e) => setAdditionalFee(e.target.value)}
              className={`w-full ${INPUT_CLS}`}
            />
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`w-full ${INPUT_CLS}`}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmitRequest}
          disabled={!canSubmit || submitting}
          className="mt-3 text-sm bg-[#F2903A] text-white px-4 py-2 rounded hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : 'Request Add Service'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Team Member modal form
// ---------------------------------------------------------------------------
function AddMemberForm({ projectId, users, onSave, onCancel }) {
  const [form, setForm] = useState({
    user_id: '',
    role_on_project: '',
    start_date: '',
    end_date: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit() {
    if (!form.user_id) {
      setError('Please select a team member.')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      project_id: projectId,
      user_id: form.user_id,
      role_on_project: form.role_on_project || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: true,
    }

    const { error: err } = await supabase
      .from('project_team_assignments')
      .insert([payload])

    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      onSave()
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-[#EF4444] bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Team Member <span className="text-[#EF4444]">*</span>
        </label>
        <select
          name="user_id"
          value={form.user_id}
          onChange={handleChange}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        >
          <option value="">Select a team member...</option>
          {users.map((u) => (
            <option key={u.user_id} value={u.user_id}>
              {u.first_name} {u.last_name} — {u.role}
            </option>
          ))}
        </select>
        {users.length === 0 && (
          <p className="text-xs text-[#6B7280] mt-1">No users found. Add users via Supabase Auth first.</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Role on Project</label>
        <input
          name="role_on_project"
          value={form.role_on_project}
          onChange={handleChange}
          placeholder="e.g. Project Manager, Lead CM"
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Start Date</label>
          <input
            type="date"
            name="start_date"
            value={form.start_date}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">End Date</label>
          <input
            type="date"
            name="end_date"
            value={form.end_date}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="text-sm text-[#6B7280] px-4 py-2 border border-[#E5E7EB] rounded hover:bg-[#F8F9FA]"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="text-sm bg-[#F2903A] text-white px-4 py-2 rounded hover:bg-orange-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add Member'}
        </button>
      </div>
    </div>
  )
}
