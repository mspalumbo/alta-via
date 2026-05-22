import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ContactForm({ contact, clientId, onSave, onCancel }) {
  const [form, setForm] = useState({
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    title: contact?.title ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    is_primary_billing: contact?.is_primary_billing ?? false,
    is_invoice_recipient: contact?.is_invoice_recipient ?? false,
    is_cc_recipient: contact?.is_cc_recipient ?? false,
    notes: contact?.notes ?? '',
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
    if (!form.first_name.trim()) {
      setError('First name is required.')
      return
    }
    if (!form.last_name.trim()) {
      setError('Last name is required.')
      return
    }
    setSaving(true)
    setError(null)

    let result
    if (contact?.contact_id) {
      result = await supabase
        .from('client_contacts')
        .update(form)
        .eq('contact_id', contact.contact_id)
    } else {
      result = await supabase
        .from('client_contacts')
        .insert([{ ...form, client_id: clientId }])
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
    } else {
      onSave()
    }
  }

  const inputClass =
    'w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]'

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-[#EF4444] bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">
            First Name <span className="text-[#EF4444]">*</span>
          </label>
          <input
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">
            Last Name <span className="text-[#EF4444]">*</span>
          </label>
          <input
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Title</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Phone</label>
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <label className="block text-xs font-medium text-[#6B7280] mb-2">
          Invoice Roles
        </label>
        {[
          { name: 'is_primary_billing', label: 'Primary billing contact' },
          { name: 'is_invoice_recipient', label: 'Invoice recipient (appears in To: field)' },
          { name: 'is_cc_recipient', label: 'CC on invoices (appears in CC: field)' },
        ].map(({ name, label }) => (
          <div key={name} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={name}
              name={name}
              checked={form[name]}
              onChange={handleChange}
              className="accent-[#F2903A]"
            />
            <label htmlFor={name} className="text-sm text-[#1A1A2E]">
              {label}
            </label>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Notes</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          className={inputClass}
        />
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
          {saving ? 'Saving...' : contact?.contact_id ? 'Save Changes' : 'Add Contact'}
        </button>
      </div>
    </div>
  )
}
