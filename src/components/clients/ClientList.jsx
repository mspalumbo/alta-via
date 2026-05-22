import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import ClientForm from './ClientForm'

const CLIENT_TYPES = ['Owner', 'Developer', 'Nonprofit', 'Government', 'Other']

export default function ClientList() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('company_name', { ascending: true })

    if (error) {
      console.error('Error fetching clients:', error)
    } else {
      setClients(data)
    }
    setLoading(false)
  }

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.company_name.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter ? c.client_type === typeFilter : true
    return matchesSearch && matchesType
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-[#1A1A2E]">Clients</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#F2903A] text-white text-sm px-4 py-2 rounded hover:bg-orange-500 transition-colors"
        >
          + Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        >
          <option value="">All Types</option>
          {CLIENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border border-[#E5E7EB] bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F3F4F6] text-[#6B7280] uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3">Company Name</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Payment Terms</th>
              <th className="text-left px-4 py-3">Nonprofit</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[#6B7280]">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[#6B7280]">
                  No clients found.
                </td>
              </tr>
            )}
            {!loading && filtered.map((client) => (
              <tr
                key={client.client_id}
                onClick={() => navigate(`/clients/${client.client_id}`)}
                className="border-t border-[#E5E7EB] hover:bg-[#F8F9FA] cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-[#1A1A2E]">
                  {client.company_name}
                </td>
                <td className="px-4 py-3 text-[#6B7280]">{client.client_type}</td>
                <td className="px-4 py-3 text-[#6B7280]">{client.payment_terms}</td>
                <td className="px-4 py-3 text-[#6B7280]">
                  {client.is_nonprofit ? 'Yes' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <Modal title="Add Client" onClose={() => setShowAddModal(false)}>
          <ClientForm
            onSave={() => {
              setShowAddModal(false)
              fetchClients()
            }}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}
    </div>
  )
}