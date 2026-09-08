import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const CELL_INPUT =
  'border border-[#E5E7EB] rounded px-2 py-1 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]'

const DISCOUNT_TYPES = ['Nonprofit', 'Lump-Sum-Billing', 'Relationship-Discretionary', 'Rate-Discount']
const APPLIED_AT_OPTIONS = ['Total-Fee', 'Line-Item', 'Hourly-Rate']

const TYPE_BADGE = {
  'Nonprofit': 'bg-green-100 text-green-700',
  'Lump-Sum-Billing': 'bg-blue-100 text-blue-700',
  'Relationship-Discretionary': 'bg-purple-100 text-purple-700',
  'Rate-Discount': 'bg-orange-100 text-orange-700',
}

function formatMoney(val) {
  return `$${Number(val ?? 0).toFixed(2)}`
}

function formatPct(val) {
  return `${Number(val ?? 0)}%`
}

function computeDiscountedFee(discounts, totalFee) {
  let remaining = Number(totalFee) || 0
  for (const d of discounts) {
    if (d.discount_amount != null) {
      remaining -= Number(d.discount_amount)
    } else if (d.discount_pct != null) {
      remaining -= (Number(totalFee) || 0) * (Number(d.discount_pct) / 100)
    }
  }
  return Math.max(0, remaining)
}

export default function FeeDiscounts({ feeId, totalFee, isExecuted, onDiscountedFeeChange }) {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [discountedFee, setDiscountedFee] = useState(totalFee)
  const [error, setError] = useState(null)

  const [discountType, setDiscountType] = useState('')
  const [appliedAt, setAppliedAt] = useState('Total-Fee')
  const [mode, setMode] = useState('amount')
  const [amountValue, setAmountValue] = useState('')
  const [notes, setNotes] = useState('')
  const [taxWriteOff, setTaxWriteOff] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchDiscounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeId])

  async function fetchDiscounts() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('fee_discounts')
      .select('*')
      .eq('fee_id', feeId)
      .order('created_at', { ascending: true })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const list = data || []
    setDiscounts(list)

    const result = computeDiscountedFee(list, totalFee)
    setDiscountedFee(result)

    if (!isExecuted) {
      const { error: updateErr } = await supabase
        .from('fee_records')
        .update({ discounted_fee: result, updated_at: new Date().toISOString() })
        .eq('fee_id', feeId)
      if (updateErr) setError(updateErr.message)
    }

    onDiscountedFeeChange(result)
    setLoading(false)
  }

  function resetForm() {
    setDiscountType('')
    setAppliedAt('Total-Fee')
    setMode('amount')
    setAmountValue('')
    setNotes('')
    setTaxWriteOff(false)
  }

  function handleTypeChange(value) {
    setDiscountType(value)
    setTaxWriteOff(value === 'Nonprofit')
  }

  const amtNum = parseFloat(amountValue)
  const isAmountValid =
    Number.isFinite(amtNum) && amtNum > 0 && (mode !== 'percent' || amtNum <= 100)
  const canSubmit = discountType !== '' && notes.trim() !== '' && isAmountValid

  async function handleAdd() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)

    const { error: err } = await supabase.from('fee_discounts').insert({
      fee_id: feeId,
      discount_type: discountType,
      applied_at: appliedAt,
      discount_amount: mode === 'amount' ? amtNum : null,
      discount_pct: mode === 'percent' ? amtNum : null,
      notes: notes.trim(),
      tax_write_off_eligible: taxWriteOff,
    })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    resetForm()
    setSaving(false)
    await fetchDiscounts()
  }

  async function handleDelete(discountId) {
    setError(null)
    const { error: err } = await supabase.from('fee_discounts').delete().eq('discount_id', discountId)
    if (err) {
      setError(err.message)
      return
    }
    await fetchDiscounts()
  }

  const totalDiscountAmount = (Number(totalFee) || 0) - discountedFee

  return (
    <div>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      {loading ? (
        <div className="text-sm text-[#6B7280]">Loading discounts…</div>
      ) : discounts.length === 0 ? (
        <div className="text-sm text-[#6B7280] mb-3">No discounts applied.</div>
      ) : (
        <div className="space-y-2 mb-3">
          {discounts.map((d) => (
            <div
              key={d.discount_id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 justify-between border border-[#E5E7EB] rounded px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${TYPE_BADGE[d.discount_type] ?? 'bg-gray-100 text-[#6B7280]'}`}>
                  {d.discount_type}
                </span>
                <span className="text-xs text-[#6B7280]">{d.applied_at}</span>
                <span className="text-sm font-medium text-[#1A1A2E]">
                  {d.discount_amount != null ? formatMoney(d.discount_amount) : formatPct(d.discount_pct)}
                </span>
                {d.tax_write_off_eligible && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-50 text-green-600">
                    Tax Write-Off
                  </span>
                )}
                <span className="text-sm text-[#6B7280] italic min-w-0 truncate">{d.notes}</span>
              </div>
              {!isExecuted && (
                <button
                  type="button"
                  onClick={() => handleDelete(d.discount_id)}
                  className="text-[#6B7280] hover:text-red-600 text-lg leading-none shrink-0"
                  aria-label="Delete discount"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-sm font-medium text-[#1A1A2E] mb-4">
        Total Discounts: {formatMoney(totalDiscountAmount)} | Discounted Fee: {formatMoney(discountedFee)}
      </div>

      {!isExecuted && (
        <div className="border-t border-[#E5E7EB] pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-[#6B7280] mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className={`w-full ${CELL_INPUT}`}
              >
                <option value="">Select…</option>
                {DISCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-[#6B7280] mb-1">Applied At</label>
              <select
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                className={`w-full ${CELL_INPUT}`}
              >
                {APPLIED_AT_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-[#6B7280] mb-1">Amount</label>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <label className="flex items-center gap-1.5 text-sm text-[#1A1A2E]">
                <input
                  type="radio"
                  checked={mode === 'amount'}
                  onChange={() => { setMode('amount'); setAmountValue('') }}
                />
                $ Amount
              </label>
              <label className="flex items-center gap-1.5 text-sm text-[#1A1A2E]">
                <input
                  type="radio"
                  checked={mode === 'percent'}
                  onChange={() => { setMode('percent'); setAmountValue('') }}
                />
                % Percent
              </label>
            </div>
            <div className="flex items-center gap-1 w-40">
              {mode === 'amount' && <span className="text-sm text-[#6B7280]">$</span>}
              <input
                type="number"
                step="any"
                min="0"
                max={mode === 'percent' ? 100 : undefined}
                inputMode="decimal"
                value={amountValue}
                onChange={(e) => setAmountValue(e.target.value)}
                className={`w-full ${CELL_INPUT}`}
              />
              {mode === 'percent' && <span className="text-sm text-[#6B7280]">%</span>}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-[#6B7280] mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for discount (required for audit trail)"
              className={`w-full ${CELL_INPUT}`}
            />
          </div>

          <label className="flex items-center gap-1.5 text-sm text-[#1A1A2E]">
            <input
              type="checkbox"
              checked={taxWriteOff}
              onChange={(e) => setTaxWriteOff(e.target.checked)}
            />
            Eligible for tax write-off
          </label>

          <button
            type="button"
            disabled={!canSubmit || saving}
            onClick={handleAdd}
            className="px-4 py-2 text-sm font-medium rounded bg-[#1E3D2F] text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Adding…' : 'Add Discount'}
          </button>
        </div>
      )}
    </div>
  )
}
