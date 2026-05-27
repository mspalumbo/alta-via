import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import ProjectForm from './ProjectForm'
import FeeList from '../fees/FeeList'

const STATUS_STYLES = {
  'Pursuit':   'bg-gray-100 text-[#6B7280]',
  'Active':    'bg-green-50 text-[#10B981]',
  'On Hold':   'bg-purple-50 text-[#8B5CF6]',
  'Complete':  'bg-green-50 text-[#10B981]',
  'Lost':      'bg-red-50 text-[#EF4444]',
  'Cancelled': 'bg-red-50 text-[#EF4444]',
}

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

const USER_ROLES = [
  'Principal', 'Sr-PM', 'PM', 'Coordinator', 'Contracts',
  'CM', 'Scheduling', 'Sustainability', 'BD', 'Admin', 'Custom',
]

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  // Team assignments
  const [assignments, setAssignments] = useState([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchProject()
    fetchAssignments()
    fetchUsers()
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

  async function handleRemoveMember(assignmentId) {
    const { error } = await supabase
      .from('project_team_assignments')
      .update({ is_active: false })
      .eq('assignment_id', assignmentId)

    if (!error) fetchAssignments()
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
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

      {/* Overview */}
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

      {/* Timeline */}
      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Timeline</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Projected Start" value={formatDate(project.projected_start_date)} />
          <Field label="Projected End" value={formatDate(project.projected_end_date)} />
          <Field label="Actual Start" value={formatDate(project.actual_start_date)} />
          <Field label="Actual End" value={formatDate(project.actual_end_date)} />
        </div>
      </div>

      {/* Financial */}
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

      {/* Contract */}
      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Contract</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Contract Type" value={project.contract_type} />
          <Field label="Contract Executed" value={formatDate(project.contract_executed_date)} />
          <Field label="PO Number" value={project.po_number} />
        </div>
      </div>

      {/* Team Assignments */}
      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Team</h2>
          <button
            onClick={() => setShowAddMemberModal(true)}
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
                        onClick={() => handleRemoveMember(a.assignment_id)}
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

      {/* Fee Development */}
      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <FeeList projectId={id} projectName={project.project_name} />
      </div>

      {/* Invoices placeholder */}
      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Invoices</h2>
        <div className="text-sm text-[#6B7280]">Invoices will appear here once the Invoicing module is built.</div>
      </div>

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
