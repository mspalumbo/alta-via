import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const CLIENT_TYPES = ['Owner', 'Developer', 'Nonprofit', 'Government', 'Other']
const PAYMENT_TERMS = ['Net 30', 'Net 45', 'Net 60', 'Due on Receipt']

export default function ClientForm({ client, onSave, onCancel }) {
  const [form, setForm] = useState({
    company_name: client?.company_name ?? '',
    client_type: client?.client_type ?? 'Owner',
    billing_address: client?.billing_address ?? '',
    billing_city: client?.billing_city ?? '',
    billing_state: client?.billing_state ?? '',
    billing_zip: client?.billing_zip ?? '',
    payment_terms: client?.payment_terms ?? 'Net 30',
    is_nonprofit: client?.is_nonprofit ?? false,
    notes: client?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit() {
    if (!form.company_name.trim()) {
      setError('Company name is required.')
      return
    }
    setSaving(true)
    setError(null)

    let result
    if (client?.client_id) {
      result = await supabase
        .from('clients')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('client_id', client.client_id)
    } else {
      result = await supabase
        .from('clients')
        .insert([form])
    }

    if (result.error) {
      setError(result.error.message)
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

      {/* Company Name */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Company Name <span className="text-[#EF4444]">*</span>
        </label>
        <input
          name="company_name"
          value={form.company_name}
          onChange={handleChange}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
      </div>

      {/* Client Type */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Client Type <span className="text-[#EF4444]">*</span>
        </label>
        <select
          name="client_type"
          value={form.client_type}
          onChange={handleChange}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        >
          {CLIENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Billing Address */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Billing Address
        </label>
        <input
          name="billing_address"
          value={form.billing_address}
          onChange={handleChange}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
      </div>

      {/* City / State / Zip */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">City</label>
          <input
            name="billing_city"
            value={form.billing_city}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">State</label>
          <input
            name="billing_state"
            value={form.billing_state}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Zip</label>
          <input
            name="billing_zip"
            value={form.billing_zip}
            onChange={handleChange}
            className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
          />
        </div>
      </div>

      {/* Payment Terms */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Payment Terms
        </label>
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

      {/* Nonprofit */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="is_nonprofit"
          id="is_nonprofit"
          checked={form.is_nonprofit}
          onChange={handleChange}
          className="accent-[#F2903A]"
        />
        <label htmlFor="is_nonprofit" className="text-sm text-[#1A1A2E]">
          Nonprofit organization
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Notes</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
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
          {saving ? 'Saving...' : client?.client_id ? 'Save Changes' : 'Add Client'}
        </button>
      </div>
    </div>
  )
}