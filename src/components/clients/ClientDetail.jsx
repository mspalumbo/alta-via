import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import ClientForm from './ClientForm'
import ContactList from './ContactList'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchClient()
  }, [id])

  async function fetchClient() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', id)
      .single()

    if (error) {
      console.error('Error fetching client:', error)
    } else {
      setClient(data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="text-[#6B7280] text-sm">Loading...</div>
  }

  if (!client) {
    return <div className="text-[#EF4444] text-sm">Client not found.</div>
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate('/clients')}
            className="text-sm text-[#6B7280] hover:text-[#1A1A2E] mb-1 flex items-center gap-1"
          >
            ← Back to Clients
          </button>
          <h1 className="text-xl font-semibold text-[#1A1A2E]">
            {client.company_name}
          </h1>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="text-sm border border-[#E5E7EB] px-4 py-2 rounded text-[#1A1A2E] hover:bg-[#F8F9FA]"
        >
          Edit
        </button>
      </div>

      {/* Client Info Card */}
      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-6">
        <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-4">
          Client Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-[#6B7280] mb-1">Client Type</div>
            <div className="text-[#1A1A2E]">{client.client_type}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-1">Payment Terms</div>
            <div className="text-[#1A1A2E]">{client.payment_terms}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-1">Nonprofit</div>
            <div className="text-[#1A1A2E]">{client.is_nonprofit ? 'Yes' : 'No'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-1">Billing Address</div>
            <div className="text-[#1A1A2E]">
              {client.billing_address && <div>{client.billing_address}</div>}
              {(client.billing_city || client.billing_state || client.billing_zip) && (
                <div>
                  {[client.billing_city, client.billing_state, client.billing_zip]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              )}
              {!client.billing_address && !client.billing_city && (
                <span className="text-[#6B7280]">—</span>
              )}
            </div>
          </div>
          {client.notes && (
            <div className="sm:col-span-2">
              <div className="text-xs text-[#6B7280] mb-1">Notes</div>
              <div className="text-[#1A1A2E]">{client.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Projects placeholder */}
      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-6">
        <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-4">
          Projects
        </h2>
        <div className="text-sm text-[#6B7280]">
          Projects will appear here once the Projects module is built.
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-white rounded border border-[#E5E7EB] p-6">
        <ContactList clientId={client.client_id} />
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <Modal title="Edit Client" onClose={() => setShowEditModal(false)}>
          <ClientForm
            client={client}
            onSave={() => {
              setShowEditModal(false)
              fetchClient()
            }}
            onCancel={() => setShowEditModal(false)}
          />
        </Modal>
      )}
    </div>
  )
}