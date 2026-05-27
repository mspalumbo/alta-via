import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const FEE_METHODS = [
  'Scope-Based',
  'Hours-Based-Simple',
  'Hours-Based-Detailed',
  'Target-Fee',
]

export default function FeeForm({ projectId, projectName, onSave, onCancel }) {
  const [form, setForm] = useState({
    fee_name: '',
    method: 'Scope-Based',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit() {
    if (!form.fee_name.trim()) {
      setError('Fee name is required.')
      return
    }
    setSaving(true)
    setError(null)

    const { error: err } = await supabase.from('fee_records').insert([{
      project_id: projectId,
      fee_name: form.fee_name.trim(),
      method: form.method,
      notes: form.notes || null,
      status: 'Draft',
    }])

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

      {/* Project context */}
      <div className="bg-[#F3F4F6] rounded px-3 py-2">
        <div className="text-xs text-[#6B7280]">Adding fee to project</div>
        <div className="text-sm font-medium text-[#1A1A2E]">{projectName ?? projectId}</div>
      </div>

      {/* Fee Name */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Fee Name <span className="text-[#EF4444]">*</span>
        </label>
        <input
          name="fee_name"
          value={form.fee_name}
          onChange={handleChange}
          placeholder="e.g. Scope-Based v1, Target Fee Option"
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
      </div>

      {/* Method */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Fee Method <span className="text-[#EF4444]">*</span>
        </label>
        <select
          name="method"
          value={form.method}
          onChange={handleChange}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        >
          {FEE_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Notes</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
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
          {saving ? 'Saving...' : 'Create Fee'}
        </button>
      </div>
    </div>
  )
}
