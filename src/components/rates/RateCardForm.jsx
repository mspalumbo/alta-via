import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const RATE_ROLES = [
  'Principal', 'Sr-PM', 'PM', 'Coordinator', 'Contracts',
  'CM', 'Scheduling', 'Sustainability', 'BD', 'Admin', 'Custom',
]

const RATE_TYPES = ['Role-Based', 'Person-Specific']

export default function RateCardForm({ defaultRateType, onSave, onCancel }) {
  const [form, setForm] = useState({
    role: 'PM',
    rate_type: defaultRateType ?? 'Role-Based',
    billable_rate: '',
    internal_cost_rate: '',
    effective_date: new Date().toISOString().split('T')[0],
    notes: '',
    user_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit() {
    if (!form.billable_rate || isNaN(parseFloat(form.billable_rate))) {
      setError('Billable rate is required and must be a number.')
      return
    }
    if (!form.effective_date) {
      setError('Effective date is required.')
      return
    }
    if (form.rate_type === 'Person-Specific' && !form.user_id.trim()) {
      setError('User ID is required for person-specific rates.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      role: form.role,
      rate_type: form.rate_type,
      billable_rate: parseFloat(form.billable_rate),
      internal_cost_rate: form.internal_cost_rate ? parseFloat(form.internal_cost_rate) : null,
      effective_date: form.effective_date,
      notes: form.notes || null,
      is_active: true,
      user_id: form.rate_type === 'Person-Specific' ? form.user_id.trim() : null,
    }

    const { error: err } = await supabase.from('rate_cards').insert([payload])

    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      onSave()
    }
  }

  const isPersonSpecific = form.rate_type === 'Person-Specific'

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-[#EF4444] bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-[#6B7280]">
        Rates are permanent records. To update a rate, end the current one and add a new record with a new effective date.
      </div>

      {/* Rate Type */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-2">Rate Type</label>
        <div className="flex gap-4">
          {RATE_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm text-[#1A1A2E] cursor-pointer">
              <input
                type="radio"
                name="rate_type"
                value={t}
                checked={form.rate_type === t}
                onChange={handleChange}
                className="accent-[#F2903A]"
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      {/* User ID — only for Person-Specific */}
      {isPersonSpecific && (
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">
            User ID (UUID) <span className="text-[#EF4444]">*</span>
          </label>
          <input
            name="user_id"
            value={form.user_id}
            onChange={handleChange}
            placeholder="Paste user UUID from Supabase Auth"
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm font-mono text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
          <p className="text-xs text-[#6B7280] mt-1">User picker will be added in Phase 4 when auth is implemented.</p>
        </div>
      )}

      {/* Role */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Role <span className="text-[#EF4444]">*</span></label>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        >
          {RATE_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Billable Rate / Internal Cost Rate */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">
            Billable Rate ($/hr) <span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="number"
            name="billable_rate"
            value={form.billable_rate}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">
            Internal Cost Rate ($/hr)
          </label>
          <input
            type="number"
            name="internal_cost_rate"
            value={form.internal_cost_rate}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
        </div>
      </div>

      {/* Effective Date */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Effective Date <span className="text-[#EF4444]">*</span>
        </label>
        <input
          type="date"
          name="effective_date"
          value={form.effective_date}
          onChange={handleChange}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Notes</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          placeholder="e.g. 2026 annual rate increase"
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
          {saving ? 'Saving...' : 'Add Rate'}
        </button>
      </div>
    </div>
  )
}
