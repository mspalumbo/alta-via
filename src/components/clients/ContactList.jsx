import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import ContactForm from './ContactForm'

function Check() {
  return <span className="text-[#10B981] font-medium">✓</span>
}

function Dash() {
  return <span className="text-[#6B7280]">—</span>
}

export default function ContactList({ clientId }) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [modalContact, setModalContact] = useState(undefined) // undefined = closed, null = new, obj = edit

  useEffect(() => {
    fetchContacts()
  }, [clientId])

  async function fetchContacts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('last_name', { ascending: true })

    if (error) {
      console.error('Error fetching contacts:', error)
    } else {
      setContacts(data ?? [])
    }
    setLoading(false)
  }

  async function handleDeactivate(contact) {
    const { error } = await supabase
      .from('client_contacts')
      .update({ is_active: false })
      .eq('contact_id', contact.contact_id)

    if (!error) fetchContacts()
  }

  async function handleReactivate(contact) {
    const { error } = await supabase
      .from('client_contacts')
      .update({ is_active: true })
      .eq('contact_id', contact.contact_id)

    if (!error) fetchContacts()
  }

  const visible = showInactive
    ? contacts
    : contacts.filter((c) => c.is_active)

  const hasInactive = contacts.some((c) => !c.is_active)

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide">
          Contacts
        </h2>
        <div className="flex items-center gap-3">
          {hasInactive && (
            <button
              onClick={() => setShowInactive((v) => !v)}
              className="text-xs text-[#6B7280] hover:text-[#1A1A2E]"
            >
              {showInactive ? 'Hide inactive' : 'Show inactive'}
            </button>
          )}
          <button
            onClick={() => setModalContact(null)}
            className="text-sm bg-[#F2903A] text-white px-3 py-1.5 rounded hover:bg-orange-500"
          >
            + Add Contact
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-[#6B7280]">Loading...</div>
      ) : visible.length === 0 ? (
        <div className="text-sm text-[#6B7280]">No contacts yet. Add one above.</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {[
                  'Name',
                  'Title',
                  'Email',
                  'Phone',
                  'Billing',
                  'Invoice',
                  'CC',
                  'Status',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide py-2 pr-4 whitespace-nowrap bg-[#F3F4F6] first:pl-2"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((contact) => (
                <tr
                  key={contact.contact_id}
                  className={`border-b border-[#E5E7EB] last:border-0 ${
                    !contact.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <td className="py-2 pr-4 pl-2 whitespace-nowrap font-medium text-[#1A1A2E]">
                    {contact.first_name} {contact.last_name}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-[#1A1A2E]">
                    {contact.title || <Dash />}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-[#1A1A2E]">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="hover:text-[#F2903A]"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <Dash />
                    )}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-[#1A1A2E]">
                    {contact.phone || <Dash />}
                  </td>
                  <td className="py-2 pr-4 text-center">
                    {contact.is_primary_billing ? <Check /> : <Dash />}
                  </td>
                  <td className="py-2 pr-4 text-center">
                    {contact.is_invoice_recipient ? <Check /> : <Dash />}
                  </td>
                  <td className="py-2 pr-4 text-center">
                    {contact.is_cc_recipient ? <Check /> : <Dash />}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                        contact.is_active
                          ? 'bg-green-50 text-[#10B981]'
                          : 'bg-gray-100 text-[#6B7280]'
                      }`}
                    >
                      {contact.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setModalContact(contact)}
                        className="text-xs text-[#6B7280] hover:text-[#1A1A2E] border border-[#E5E7EB] px-2 py-1 rounded hover:bg-[#F8F9FA]"
                      >
                        Edit
                      </button>
                      {contact.is_active ? (
                        <button
                          onClick={() => handleDeactivate(contact)}
                          className="text-xs text-[#EF4444] hover:text-red-700 border border-[#E5E7EB] px-2 py-1 rounded hover:bg-[#F8F9FA]"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(contact)}
                          className="text-xs text-[#10B981] hover:text-green-700 border border-[#E5E7EB] px-2 py-1 rounded hover:bg-[#F8F9FA]"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      {modalContact !== undefined && (
        <Modal
          title={modalContact?.contact_id ? 'Edit Contact' : 'Add Contact'}
          onClose={() => setModalContact(undefined)}
        >
          <ContactForm
            contact={modalContact}
            clientId={clientId}
            onSave={() => {
              setModalContact(undefined)
              fetchContacts()
            }}
            onCancel={() => setModalContact(undefined)}
          />
        </Modal>
      )}
    </div>
  )
}
