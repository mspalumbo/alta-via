import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const PROJECT_TYPES = [
  'Healthcare', 'Performing Arts', 'Education', 'Commercial',
  'Residential', 'Government', 'Mixed Use', 'Other',
]
const PROJECT_STATUSES = ['Pursuit', 'Active', 'On Hold', 'Complete', 'Lost', 'Cancelled']
const BILLING_METHODS = ['Time-and-Materials', 'Monthly-Fixed', 'Milestone', 'Percent-Complete']
const INVOICE_DETAIL_LEVELS = ['Summary', 'By-Employee', 'By-Employee-with-Descriptions']
const PAYMENT_TERMS = ['Net 30', 'Net 45', 'Net 60', 'Due on Receipt']
const CONTRACT_TYPES = ['AIA', 'Custom-PSA', 'Other']

function generateProjectNumber(firm) {
  const year = new Date().getFullYear()
  const seq = String(firm.project_number_next_seq).padStart(3, '0')
  return firm.project_number_include_year
    ? `${firm.project_number_prefix}-${year}-${seq}`
    : `${firm.project_number_prefix}-${seq}`
}

export default function ProjectForm({ project, onSave, onCancel }) {
  const [form, setForm] = useState({
    project_name: project?.project_name ?? '',
    client_id: project?.client_id ?? '',
    project_type: project?.project_type ?? 'Other',
    status: project?.status ?? 'Pursuit',
    description: project?.description ?? '',
    projected_start_date: project?.projected_start_date ?? '',
    projected_end_date: project?.projected_end_date ?? '',
    billing_method: project?.billing_method ?? 'Time-and-Materials',
    invoice_detail_level: project?.invoice_detail_level ?? 'By-Employee',
    payment_terms: project?.payment_terms ?? 'Net 30',
    po_number: project?.po_number ?? '',
    contract_type: project?.contract_type ?? 'AIA',
    contract_executed_date: project?.contract_executed_date ?? '',
  })
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase
        .from('clients')
        .select('client_id, company_name')
        .order('company_name', { ascending: true })
      setClients(data ?? [])
    }
    loadClients()
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit() {
    if (!form.project_name.trim()) {
      setError('Project name is required.')
      return
    }
    if (!form.client_id) {
      setError('Client is required.')
      return
    }
    setSaving(true)
    setError(null)

    if (project?.project_id) {
      // Edit mode — update without touching project_number
      const { error: err } = await supabase
        .from('projects')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('project_id', project.project_id)

      if (err) {
        setError(err.message)
        setSaving(false)
      } else {
        onSave()
      }
    } else {
      // Add mode — fetch fresh firm_settings for project number
      const { data: firmData, error: firmErr } = await supabase
        .from('firm_settings')
        .select('id, project_number_prefix, project_number_include_year, project_number_next_seq')
        .limit(1)
        .single()

      if (firmErr) {
        setError('Could not load firm settings: ' + firmErr.message)
        setSaving(false)
        return
      }

      const projectNumber = generateProjectNumber(firmData)

      const { error: insertErr } = await supabase
        .from('projects')
        .insert([{ ...form, project_number: projectNumber }])

      if (insertErr) {
        setError(insertErr.message)
        setSaving(false)
        return
      }

      // Increment the sequence
      await supabase
        .from('firm_settings')
        .update({ project_number_next_seq: firmData.project_number_next_seq + 1 })
        .eq('id', firmData.id)

      onSave()
    }
  }

  const isEdit = Boolean(project?.project_id)

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-[#EF4444] bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Project Name */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Project Name <span className="text-[#EF4444]">*</span>
        </label>
        <input
          name="project_name"
          value={form.project_name}
          onChange={handleChange}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
      </div>

      {/* Client */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Client <span className="text-[#EF4444]">*</span>
        </label>
        <select
          name="client_id"
          value={form.client_id}
          onChange={handleChange}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        >
          <option value="">Select a client...</option>
          {clients.map((c) => (
            <option key={c.client_id} value={c.client_id}>{c.company_name}</option>
          ))}
        </select>
      </div>

      {/* Project Type / Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Project Type</label>
          <select
            name="project_type"
            value={form.project_type}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={2}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Projected Start</label>
          <input
            type="date"
            name="projected_start_date"
            value={form.projected_start_date}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Projected End</label>
          <input
            type="date"
            name="projected_end_date"
            value={form.projected_end_date}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
        </div>
      </div>

      {/* Billing Method / Invoice Detail Level */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Billing Method</label>
          <select
            name="billing_method"
            value={form.billing_method}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          >
            {BILLING_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Invoice Detail</label>
          <select
            name="invoice_detail_level"
            value={form.invoice_detail_level}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          >
            {INVOICE_DETAIL_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payment Terms / PO Number */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Payment Terms</label>
          <select
            name="payment_terms"
            value={form.payment_terms}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          >
            {PAYMENT_TERMS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">PO Number</label>
          <input
            name="po_number"
            value={form.po_number}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
        </div>
      </div>

      {/* Contract Type / Contract Executed Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Contract Type</label>
          <select
            name="contract_type"
            value={form.contract_type}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          >
            {CONTRACT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Contract Executed</label>
          <input
            type="date"
            name="contract_executed_date"
            value={form.contract_executed_date}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
        </div>
      </div>

      {/* Actions */}
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
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Project'}
        </button>
      </div>
    </div>
  )
}
