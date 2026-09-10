import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import FeeLineItems from './FeeLineItems'
import FeeDiscounts from './FeeDiscounts'
import ExhibitA from './ExhibitA'

const STATUS_STYLES = {
  'Draft':        'bg-gray-100 text-[#6B7280]',
  'Under-Review': 'bg-amber-50 text-[#F59E0B]',
  'Executed':     'bg-green-50 text-[#10B981]',
  'Superseded':   'bg-gray-100 text-[#6B7280]',
}

function formatCurrency(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(val)
}

function formatDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[#6B7280] mb-1">{label}</div>
      <div className="text-sm font-medium text-[#1A1A2E]">{value ?? '—'}</div>
    </div>
  )
}

const DURATION_UNITS = ['Weeks', 'Months']

// Inline duration control shown in the Fee Summary card for Scope-Based fees.
function DurationInline({ label, value, unit, readOnly, onCommit, onUnitChange }) {
  const roCls = readOnly ? 'bg-[#F8F9FA]' : ''
  const ctrl =
    'border border-[#E5E7EB] rounded px-2 py-1 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#6B7280] uppercase tracking-wide">{label}</span>
      <input
        key={`${label}-${value ?? ''}`}
        type="number"
        step="any"
        min="0"
        inputMode="decimal"
        defaultValue={value ?? ''}
        readOnly={readOnly}
        onBlur={(e) => onCommit(e.target.value)}
        placeholder="0"
        className={`w-20 ${ctrl} ${roCls}`}
      />
      <select
        value={unit}
        disabled={readOnly}
        onChange={(e) => onUnitChange(e.target.value)}
        className={`${ctrl} ${roCls}`}
      >
        {DURATION_UNITS.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>
    </div>
  )
}

// Edit modal for fee_name and notes only
function EditFeeForm({ fee, onSave, onCancel }) {
  const [form, setForm] = useState({
    fee_name: fee.fee_name ?? '',
    notes: fee.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    if (!form.fee_name.trim()) {
      setError('Fee name is required.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('fee_records')
      .update({ fee_name: form.fee_name.trim(), notes: form.notes || null, updated_at: new Date().toISOString() })
      .eq('fee_id', fee.fee_id)

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
        <div className="text-sm text-[#EF4444] bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
      )}
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          Fee Name <span className="text-[#EF4444]">*</span>
        </label>
        <input
          value={form.fee_name}
          onChange={(e) => setForm((p) => ({ ...p, fee_name: e.target.value }))}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          rows={3}
          className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="text-sm text-[#6B7280] px-4 py-2 border border-[#E5E7EB] rounded hover:bg-[#F8F9FA]">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving} className="text-sm bg-[#F2903A] text-white px-4 py-2 rounded hover:bg-orange-500 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

export default function FeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { fromProjectId, fromProjectName } = location.state || {}
  const [fee, setFee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState(null)
  const [actionWorking, setActionWorking] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showExhibitA, setShowExhibitA] = useState(false)
  const [exhibitItems, setExhibitItems] = useState([])

  useEffect(() => {
    fetchFee()
  }, [id])

  async function fetchFee() {
    setLoading(true)
    const { data, error } = await supabase
      .from('fee_records')
      .select(
        '*, preconstruction_duration, preconstruction_duration_unit, construction_duration, construction_duration_unit, projects(project_id, project_name, project_number, client_id)',
      )
      .eq('fee_id', id)
      .single()

    if (error) {
      console.error('Error fetching fee:', error)
    } else {
      setFee(data)
    }
    setLoading(false)
  }

  async function handleSubmitForReview() {
    setActionError(null)
    setActionWorking(true)
    const { error } = await supabase
      .from('fee_records')
      .update({ status: 'Under-Review', updated_at: new Date().toISOString() })
      .eq('fee_id', id)
    if (error) setActionError(error.message)
    else await fetchFee()
    setActionWorking(false)
  }

  async function handleReturnToDraft() {
    setActionError(null)
    setActionWorking(true)
    const { error } = await supabase
      .from('fee_records')
      .update({ status: 'Draft', updated_at: new Date().toISOString() })
      .eq('fee_id', id)
    if (error) setActionError(error.message)
    else await fetchFee()
    setActionWorking(false)
  }

  async function handleExecute() {
    setActionError(null)
    setActionWorking(true)

    // Check: only one Executed fee allowed per project
    const { data: existing, error: checkErr } = await supabase
      .from('fee_records')
      .select('fee_id, fee_name')
      .eq('project_id', fee.projects.project_id)
      .eq('status', 'Executed')
      .neq('fee_id', id)

    if (checkErr) {
      setActionError(checkErr.message)
      setActionWorking(false)
      return
    }

    if (existing && existing.length > 0) {
      setActionError(
        `Cannot execute: "${existing[0].fee_name}" is already the executed fee for this project. Supersede it first, then execute this fee.`
      )
      setActionWorking(false)
      return
    }

    const { error } = await supabase
      .from('fee_records')
      .update({
        status: 'Executed',
        executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('fee_id', id)

    if (error) setActionError(error.message)
    else await fetchFee()
    setActionWorking(false)
  }

  async function handleSupersede() {
    setActionError(null)
    setActionWorking(true)
    const { error } = await supabase
      .from('fee_records')
      .update({ status: 'Superseded', updated_at: new Date().toISOString() })
      .eq('fee_id', id)
    if (error) setActionError(error.message)
    else await fetchFee()
    setActionWorking(false)
  }

  const handleExhibitA = async () => {
    const { data } = await supabase
      .from('fee_line_items')
      .select('*, scope_library(*)')
      .eq('fee_id', fee.fee_id)
      .order('sort_order')
    setExhibitItems(data || [])
    setShowExhibitA(true)
  }

  if (loading) {
    return <div className="text-sm text-[#6B7280]">Loading...</div>
  }

  if (!fee) {
    return <div className="text-sm text-[#EF4444]">Fee record not found.</div>
  }

  const isExecuted = fee.status === 'Executed'
  const isTerminal = fee.status === 'Executed' || fee.status === 'Superseded'

  async function saveDurationField(field, value) {
    setFee((prev) => ({ ...prev, [field]: value }))
    const { error } = await supabase
      .from('fee_records')
      .update({ [field]: value })
      .eq('fee_id', id)
    if (error) setActionError(error.message)
  }

  function commitDuration(phase, raw) {
    if (isExecuted) return
    const trimmed = String(raw).trim()
    const parsed = parseFloat(trimmed)
    const value =
      trimmed !== '' && Number.isFinite(parsed) && parsed >= 0 ? parsed : null
    saveDurationField(`${phase}_duration`, value)
  }

  function changeDurationUnit(phase, value) {
    if (isExecuted) return
    saveDurationField(`${phase}_duration_unit`, value)
  }

  return (
    <div className="w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          {fromProjectId ? (
            <button
              onClick={() =>
                navigate(`/projects/${fromProjectId}`, {
                  state: { activeTab: 'fees' },
                })
              }
              className="text-sm text-[#6B7280] hover:text-[#1A1A2E] mb-1 flex items-center gap-1"
            >
              ← Back to {fromProjectName || 'Contract'}
            </button>
          ) : (
            <button
              onClick={() => navigate('/fees')}
              className="text-sm text-[#6B7280] hover:text-[#1A1A2E] mb-1 flex items-center gap-1"
            >
              ← Back to Fee Development
            </button>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-[#1A1A2E]">{fee.fee_name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[fee.status] ?? 'bg-gray-100 text-[#6B7280]'}`}>
              {fee.status}
            </span>
          </div>
          {fee.projects && (
            <div className="flex items-center gap-2 mt-1">
              {fee.projects.project_number && (
                <span className="text-xs font-mono text-[#6B7280]">{fee.projects.project_number}</span>
              )}
              <Link
                to={`/projects/${fee.projects.project_id}`}
                className="text-xs text-[#1E3D2F] hover:text-[#F2903A] font-medium"
              >
                {fee.projects.project_name}
              </Link>
            </div>
          )}
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={handleExhibitA}
            className="border border-[#1E3D2F] text-[#1E3D2F] px-3 py-1.5 rounded text-sm hover:bg-[#1E3D2F] hover:text-white transition-colors"
          >
            Print Exhibit A
          </button>
          {!isExecuted && (
            <button
              onClick={() => setShowEditModal(true)}
              className="text-sm border border-[#E5E7EB] px-4 py-2 rounded text-[#1A1A2E] hover:bg-[#F8F9FA]"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="mb-4 text-sm text-[#EF4444] bg-red-50 border border-red-200 rounded px-4 py-3">
          {actionError}
        </div>
      )}

      {/* Status workflow actions */}
      {!isTerminal && (
        <div className="bg-white rounded border border-[#E5E7EB] p-4 mb-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mr-2">Actions</span>

          {fee.status === 'Draft' && (
            <button
              onClick={handleSubmitForReview}
              disabled={actionWorking}
              className="text-sm bg-[#1E3D2F] text-white px-4 py-2 rounded hover:bg-green-900 disabled:opacity-50"
            >
              Submit for Review
            </button>
          )}

          {fee.status === 'Under-Review' && (
            <>
              <button
                onClick={handleExecute}
                disabled={actionWorking}
                className="text-sm bg-[#1E3D2F] text-white px-4 py-2 rounded hover:bg-green-900 disabled:opacity-50"
              >
                Execute Fee
              </button>
              <button
                onClick={handleReturnToDraft}
                disabled={actionWorking}
                className="text-sm border border-[#E5E7EB] px-4 py-2 rounded text-[#1A1A2E] hover:bg-[#F8F9FA] disabled:opacity-50"
              >
                Return to Draft
              </button>
            </>
          )}

          <button
            onClick={handleSupersede}
            disabled={actionWorking}
            className="text-sm border border-[#E5E7EB] px-4 py-2 rounded text-[#EF4444] hover:bg-red-50 disabled:opacity-50 ml-auto"
          >
            Supersede
          </button>
        </div>
      )}

      {/* Executed notice */}
      {isExecuted && (
        <div className="bg-green-50 border border-green-200 rounded px-4 py-3 mb-4 text-sm text-[#10B981]">
          This fee was executed on {formatDate(fee.executed_at)} and is now immutable. It is the contracted fee for this project.
        </div>
      )}

      {/* Fee Summary */}
      <div className="bg-white rounded border border-[#E5E7EB] p-4 mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Fee Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Method" value={fee.method} />
          <Field label="Total Fee" value={formatCurrency(fee.total_fee)} />
          <Field label="Discounted Fee" value={formatCurrency(fee.discounted_fee)} />
          <Field label="Created" value={formatDate(fee.created_at)} />
          {fee.executed_at && <Field label="Executed" value={formatDate(fee.executed_at)} />}
        </div>

        {fee.notes && (
          <div className="mt-3">
            <div className="text-xs uppercase tracking-wide text-[#6B7280] mb-1">Notes</div>
            <div className="text-sm text-[#1A1A2E]">{fee.notes}</div>
          </div>
        )}

        {fee.method === 'Scope-Based' && (
          <div className="border-t border-[#E5E7EB] mt-3 pt-3 flex flex-col sm:flex-row sm:items-center gap-4">
            <DurationInline
              label="Preconstruction"
              value={fee.preconstruction_duration}
              unit={fee.preconstruction_duration_unit || 'Months'}
              readOnly={isExecuted}
              onCommit={(v) => commitDuration('preconstruction', v)}
              onUnitChange={(v) => changeDurationUnit('preconstruction', v)}
            />
            <DurationInline
              label="Construction"
              value={fee.construction_duration}
              unit={fee.construction_duration_unit || 'Months'}
              readOnly={isExecuted}
              onCommit={(v) => commitDuration('construction', v)}
              onUnitChange={(v) => changeDurationUnit('construction', v)}
            />
          </div>
        )}
      </div>

      {/* Line Items — Session 5b */}
      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Line Items</h2>
        <FeeLineItems
          feeId={fee.fee_id}
          feeMethod={fee.method}
          isExecuted={isExecuted}
          onTotalChange={(newTotal) => setFee(prev => ({ ...prev, total_fee: newTotal }))}
          durations={{
            preDuration: fee.preconstruction_duration,
            preDurationUnit: fee.preconstruction_duration_unit || 'Months',
            conDuration: fee.construction_duration,
            conDurationUnit: fee.construction_duration_unit || 'Months',
          }}
        />
      </div>

      {/* Discounts — Session 5c */}
      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Discounts</h2>
        <FeeDiscounts
          feeId={fee.fee_id}
          totalFee={fee.total_fee || 0}
          isExecuted={isExecuted}
          onDiscountedFeeChange={(newDiscountedFee) =>
            setFee(prev => ({ ...prev, discounted_fee: newDiscountedFee }))
          }
        />
      </div>

      {/* Staffing Projection placeholder — Session 5d */}
      <div className="bg-white rounded border border-[#E5E7EB] p-6 mb-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Staffing Projection</h2>
        <div className="text-sm text-[#6B7280]">Staffing projection will be built in Session 5d.</div>
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <Modal title="Edit Fee" onClose={() => setShowEditModal(false)}>
          <EditFeeForm
            fee={fee}
            onSave={() => {
              setShowEditModal(false)
              fetchFee()
            }}
            onCancel={() => setShowEditModal(false)}
          />
        </Modal>
      )}

      {showExhibitA && (
        <ExhibitA
          fee={fee}
          lineItems={exhibitItems}
          onClose={() => setShowExhibitA(false)}
        />
      )}
    </div>
  )
}
