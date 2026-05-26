import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import RateCardForm from './RateCardForm'

function formatCurrency(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val)
}

function formatDate(val) {
  if (!val) return '—'
  return new Date(val + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function StatusBadge({ endDate }) {
  const ended = endDate && endDate <= today()
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
        ended ? 'bg-gray-100 text-[#6B7280]' : 'bg-green-50 text-[#10B981]'
      }`}
    >
      {ended ? 'Ended' : 'Active'}
    </span>
  )
}

function RateSection({ title, rates, loading, onAdd, onEndRate, showInactive, onToggleInactive, isPersonSpecific }) {
  const hasInactive = rates.some((r) => r.end_date && r.end_date <= today())
  const visible = showInactive ? rates : rates.filter((r) => !r.end_date || r.end_date > today())

  return (
    <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-6">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-[#1A1A2E]">{title}</h2>
        <div className="flex items-center gap-3">
          {hasInactive && (
            <button
              onClick={onToggleInactive}
              className="text-xs text-[#6B7280] hover:text-[#1A1A2E]"
            >
              {showInactive ? 'Hide ended rates' : 'Show ended rates'}
            </button>
          )}
          <button
            onClick={onAdd}
            className="text-sm bg-[#F2903A] text-white px-3 py-1.5 rounded hover:bg-orange-500"
          >
            + Add Rate
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-[#6B7280]">Loading...</div>
      ) : visible.length === 0 ? (
        <div className="text-sm text-[#6B7280]">No rates found. Add one above.</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {[
                  ...(isPersonSpecific ? ['Name / User ID'] : []),
                  'Role',
                  'Billable Rate',
                  'Internal Cost',
                  'Effective Date',
                  'End Date',
                  'Notes',
                  'Status',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide py-2 pr-4 bg-[#F3F4F6] first:pl-2 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((rate) => {
                const isEnded = rate.end_date && rate.end_date <= today()
                return (
                  <tr
                    key={rate.rate_id}
                    className={`border-b border-[#E5E7EB] last:border-0 ${isEnded ? 'opacity-50' : ''}`}
                  >
                    {isPersonSpecific && (
                      <td className="py-2 pr-4 pl-2 whitespace-nowrap text-[#6B7280] text-xs font-mono">
                        {rate.users
                          ? `${rate.users.first_name} ${rate.users.last_name}`
                          : rate.user_id
                          ? rate.user_id.slice(0, 8) + '…'
                          : '—'}
                      </td>
                    )}
                    <td className={`py-2 pr-4 ${!isPersonSpecific ? 'pl-2' : ''} whitespace-nowrap font-medium text-[#1A1A2E]`}>
                      {rate.role}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap text-[#1A1A2E]">
                      {formatCurrency(rate.billable_rate)}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap text-[#6B7280]">
                      —
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap text-[#6B7280]">
                      {formatDate(rate.effective_date)}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap text-[#6B7280]">
                      {formatDate(rate.end_date)}
                    </td>
                    <td className="py-2 pr-4 text-[#6B7280] max-w-xs truncate">
                      {rate.notes || '—'}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <StatusBadge endDate={rate.end_date} />
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      {!isEnded && (
                        <button
                          onClick={() => onEndRate(rate)}
                          className="text-xs text-[#6B7280] hover:text-[#EF4444] border border-[#E5E7EB] px-2 py-1 rounded hover:bg-[#F8F9FA]"
                        >
                          End Rate
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function RateCardList() {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInactiveRole, setShowInactiveRole] = useState(false)
  const [showInactivePerson, setShowInactivePerson] = useState(false)
  const [addModal, setAddModal] = useState(null) // null=closed, 'Role-Based', 'Person-Specific'

  useEffect(() => {
    fetchRates()
  }, [])

  async function fetchRates() {
    setLoading(true)
    const { data, error } = await supabase
      .from('rate_cards')
      .select('*, users(user_id, first_name, last_name)')
      .order('role', { ascending: true })
      .order('effective_date', { ascending: false })

    if (error) {
      console.error('Error fetching rate cards:', error)
    } else {
      setRates(data ?? [])
    }
    setLoading(false)
  }

  async function handleEndRate(rate) {
    const { error } = await supabase
      .from('rate_cards')
      .update({ end_date: today(), is_active: false })
      .eq('rate_id', rate.rate_id)

    if (!error) fetchRates()
  }

  const roleBased = rates.filter((r) => r.rate_type === 'Role-Based')
  const personSpecific = rates.filter((r) => r.rate_type === 'Person-Specific')

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1A1A2E]">Rate Cards</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Rates are date-effective records. Add a new rate to supersede an existing one — never edit historical rates.
        </p>
      </div>

      <RateSection
        title="Role-Based Rates"
        rates={roleBased}
        loading={loading}
        onAdd={() => setAddModal('Role-Based')}
        onEndRate={handleEndRate}
        showInactive={showInactiveRole}
        onToggleInactive={() => setShowInactiveRole((v) => !v)}
        isPersonSpecific={false}
      />

      <RateSection
        title="Person-Specific Rates"
        rates={personSpecific}
        loading={loading}
        onAdd={() => setAddModal('Person-Specific')}
        onEndRate={handleEndRate}
        showInactive={showInactivePerson}
        onToggleInactive={() => setShowInactivePerson((v) => !v)}
        isPersonSpecific={true}
      />

      {addModal && (
        <Modal
          title={`Add ${addModal} Rate`}
          onClose={() => setAddModal(null)}
        >
          <RateCardForm
            defaultRateType={addModal}
            onSave={() => {
              setAddModal(null)
              fetchRates()
            }}
            onCancel={() => setAddModal(null)}
          />
        </Modal>
      )}
    </div>
  )
}
