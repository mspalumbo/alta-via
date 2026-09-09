import { useEffect, useRef, useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import { supabase } from '../lib/supabase'

const ANNUAL_HOURS = 2080

const DEFAULT_ASSUMPTIONS = {
  bonus_pct: 5,
  cell_phone_allowance: 1200,
  retirement_match_pct: 3,
  benefits_annual: 30000,
  holiday_days: 12,
  overhead_operating: 8,
  overhead_insurance: 8,
  overhead_profit_pct: 20,
  overhead_taxes_pct: 10,
  overhead_support_pct: 5,
}

const ASSUMPTION_FIELDS = [
  { key: 'bonus_pct', label: 'Bonus %', suffix: '%' },
  { key: 'cell_phone_allowance', label: 'Cell Phone ($/yr)', prefix: '$' },
  { key: 'retirement_match_pct', label: '401k Match %', suffix: '%' },
  { key: 'benefits_annual', label: 'Annual Benefits ($/yr)', prefix: '$' },
  { key: 'holiday_days', label: 'Holiday Days' },
  { key: 'overhead_operating', label: 'Operating ($/hr)', prefix: '$' },
  { key: 'overhead_insurance', label: 'Insurance ($/hr)', prefix: '$' },
  { key: 'overhead_profit_pct', label: 'Profit Target %', suffix: '%' },
  { key: 'overhead_taxes_pct', label: 'Tax Rate %', suffix: '%' },
  { key: 'overhead_support_pct', label: 'Support Staff %', suffix: '%' },
]

// Currency formatter — used for every calculated dollar output.
const fmt = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseNum(raw) {
  const p = parseFloat(raw)
  return raw === '' || !Number.isFinite(p) ? 0 : p
}

// Strips "$" and "," from a typed currency string.
function parseCurrencyInput(raw) {
  if (raw == null) return 0
  const cleaned = String(raw).replace(/[$,]/g, '').trim()
  const p = parseFloat(cleaned)
  return Number.isFinite(p) ? p : 0
}

// Strips "%" from a typed percent string.
function parsePercentInput(raw) {
  if (raw == null) return 0
  const cleaned = String(raw).replace(/%/g, '').trim()
  const p = parseFloat(cleaned)
  return Number.isFinite(p) ? p : 0
}

// Burden calculation for one salary band (low or high). Base formula —
// does not include custom line items (those are layered on separately
// in applyCustomItems so this stays a pure, reusable building block).
function calcStack(salary, firmAssumptions, pto_weeks, utilization_pct) {
  const {
    bonus_pct, cell_phone_allowance, retirement_match_pct, benefits_annual,
    holiday_days, overhead_operating, overhead_insurance,
    overhead_profit_pct, overhead_taxes_pct, overhead_support_pct,
  } = firmAssumptions

  const bonus = salary * bonus_pct / 100
  const retirement = salary * retirement_match_pct / 100
  const holiday_cost = (salary / ANNUAL_HOURS) * holiday_days * 8
  const pto_cost = (salary / ANNUAL_HOURS) * pto_weeks * 40
  const utilization_cost = salary * (1 - utilization_pct / 100)

  const total_annual_cost = salary + bonus + cell_phone_allowance +
    retirement + benefits_annual + holiday_cost + pto_cost + utilization_cost

  // Billable hours is a fixed constant — utilization is already captured as
  // a dollar cost (utilization_cost, above) inside total_annual_cost, so
  // dividing by a utilization-reduced hour count would double-count it.
  const billable_hours = ANNUAL_HOURS
  const cost_per_hour = total_annual_cost / ANNUAL_HOURS

  const overhead_profit = cost_per_hour * overhead_profit_pct / 100
  const overhead_taxes = cost_per_hour * overhead_taxes_pct / 100
  const overhead_support = cost_per_hour * overhead_support_pct / 100
  const total_overhead = overhead_operating + overhead_insurance +
    overhead_profit + overhead_taxes + overhead_support

  const required_rate = cost_per_hour + total_overhead

  return {
    bonus, retirement, holiday_cost, pto_cost, utilization_cost,
    total_annual_cost, billable_hours, cost_per_hour,
    overhead_profit, overhead_taxes, overhead_support, total_overhead,
    required_rate,
  }
}

// Layers custom line items on top of a base band. Compensation items add to
// Total Annual Cost (percent items scale off this band's own salary) before
// cost/hr is re-derived; overhead items add to Total Overhead/Hr (percent
// items scale off this band's own cost/hr). band.total_annual_cost
// (pre-custom) is kept on the returned object for the Compensation subtotal.
function applyCustomItems(band, salary, customItems, firmAssumptions) {
  const compItems = customItems.filter((it) => (it.category || 'compensation') === 'compensation')
  const ohItems = customItems.filter((it) => it.category === 'overhead')

  const compTotal = compItems.reduce((sum, it) => {
    const amt = Number(it.amount) || 0
    return sum + (it.value_type === 'percent' ? salary * amt / 100 : amt)
  }, 0)

  const grand_total_annual_cost = band.total_annual_cost + compTotal
  const cost_per_hour = grand_total_annual_cost / ANNUAL_HOURS

  const overhead_profit = cost_per_hour * firmAssumptions.overhead_profit_pct / 100
  const overhead_taxes = cost_per_hour * firmAssumptions.overhead_taxes_pct / 100
  const overhead_support = cost_per_hour * firmAssumptions.overhead_support_pct / 100

  const custom_overhead_total = ohItems.reduce((sum, it) => {
    const amt = Number(it.amount) || 0
    return sum + (it.value_type === 'percent' ? cost_per_hour * amt / 100 : amt)
  }, 0)

  const total_overhead = firmAssumptions.overhead_operating + firmAssumptions.overhead_insurance +
    overhead_profit + overhead_taxes + overhead_support + custom_overhead_total
  const required_rate = cost_per_hour + total_overhead

  return {
    ...band,
    grand_total_annual_cost,
    cost_per_hour,
    overhead_profit,
    overhead_taxes,
    overhead_support,
    custom_overhead_total,
    total_overhead,
    required_rate,
  }
}

function outputsFor(stack, firmAssumptions) {
  const baseLow = calcStack(stack.salary_low, firmAssumptions, stack.pto_weeks, stack.target_utilization_pct)
  const baseHigh = calcStack(stack.salary_high, firmAssumptions, stack.pto_weeks, stack.target_utilization_pct)
  const items = stack.custom_items || []
  const low = applyCustomItems(baseLow, stack.salary_low, items, firmAssumptions)
  const high = applyCustomItems(baseHigh, stack.salary_high, items, firmAssumptions)
  const required_rate_avg = (low.required_rate + high.required_rate) / 2
  return {
    low,
    high,
    required_rate_avg,
    dbFields: {
      cost_per_hour_low: low.cost_per_hour,
      cost_per_hour_high: high.cost_per_hour,
      required_rate_low: low.required_rate,
      required_rate_high: high.required_rate,
      required_rate_avg,
    },
  }
}

// Combined width of the LOW + HIGH columns (w-28 + gap-2 + w-28), used for
// elements that visually span both columns (shared inputs, avg, published rate).
const COL_W = 'w-28'
const SPAN_W = 'w-[232px]'

function SectionHeader({ label }) {
  return (
    <div className="bg-[#F3F4F6] text-xs font-semibold uppercase tracking-wide px-2 py-1.5 rounded mt-3 mb-1">
      {label}
    </div>
  )
}

function TableHeader() {
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] border-b border-[#E5E7EB] pb-1 mb-1">
      <span className="flex-1">Item</span>
      <span className={`${COL_W} text-right`}>Low</span>
      <span className={`${COL_W} text-right`}>High</span>
    </div>
  )
}

function Row2({ label, low, high }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="flex-1 text-xs text-[#6B7280]">{label}</span>
      <span className={`${COL_W} text-xs text-right font-medium text-[#1A1A2E]`}>{low}</span>
      <span className={`${COL_W} text-xs text-right font-medium text-[#1A1A2E]`}>{high}</span>
    </div>
  )
}

function SubtotalRow2({ label, low, high }) {
  return (
    <div className="flex items-center gap-2 py-2 border-t-2 border-[#1E3D2F] font-semibold mt-1">
      <span className="flex-1 text-xs text-[#1A1A2E]">{label}</span>
      <span className={`${COL_W} text-xs text-right text-[#1A1A2E]`}>{low}</span>
      <span className={`${COL_W} text-xs text-right text-[#1A1A2E]`}>{high}</span>
    </div>
  )
}

function TotalRow2({ label, low, high }) {
  return (
    <div className="flex items-center gap-2 py-2 bg-[#1E3D2F] text-white rounded px-2 mt-2 font-semibold">
      <span className="flex-1 text-xs">{label}</span>
      <span className={`${COL_W} text-xs text-right`}>{low}</span>
      <span className={`${COL_W} text-xs text-right`}>{high}</span>
    </div>
  )
}

function AverageRow({ label, value }) {
  return (
    <div className="flex items-center gap-2 py-2 bg-[#F3F4F6] rounded px-2 mt-1 font-semibold">
      <span className="flex-1 text-xs text-[#1A1A2E]">{label}</span>
      <span className={`${SPAN_W} text-xs text-right text-[#1A1A2E]`}>{value}</span>
    </div>
  )
}

// Salary Low / Salary High input: formatted currency at rest, plain number
// while focused so the user can type normally; saves the raw value on blur.
function SalaryFieldInput({ value, onCommit }) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState(String(value ?? 0))

  return (
    <input
      type={editing ? 'number' : 'text'}
      step="any"
      value={editing ? raw : fmt(value)}
      onFocus={() => {
        setRaw(String(value ?? 0))
        setEditing(true)
      }}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={(e) => {
        setEditing(false)
        onCommit(e.target.value)
      }}
      className="w-full text-xs text-right border border-[#E5E7EB] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
    />
  )
}

// A field shared across both bands (PTO Weeks, Utilization %) — one input,
// visually spanning the LOW+HIGH region, so it can't desync between columns.
function SharedEditRow({ label, value, onCommit, suffix }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="flex-1 text-xs text-[#6B7280]">{label}</span>
      <div className={`${SPAN_W} flex items-center justify-end gap-0.5`}>
        <input
          type="number"
          step="any"
          defaultValue={value}
          onBlur={(e) => onCommit(e.target.value)}
          className="w-16 text-xs text-right border border-[#E5E7EB] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
        />
        {suffix && <span className="text-xs text-[#6B7280]">{suffix}</span>}
      </div>
    </div>
  )
}

const FREQUENCIES = [
  { key: 'month', label: 'Per Month', multiplier: 12 },
  { key: 'week', label: 'Per Week', multiplier: 52 },
  { key: 'biweekly', label: 'Per Pay Period (bi-weekly)', multiplier: 26 },
  { key: 'year', label: 'Per Year', multiplier: 1 },
  { key: 'hour', label: 'Per Hour', multiplier: ANNUAL_HOURS },
]

// Small unit-conversion helper popover for a firm assumption field —
// e.g. "$500/month" → annualizes to the value actually stored. Controlled
// from the parent so amount/frequency only reset when the popover is
// opened for a (possibly new) field — not when Apply is clicked.
function AssumptionPopover({ amount, freq, onAmountChange, onFreqChange, onApply, onClose }) {
  const freqObj = FREQUENCIES.find((f) => f.key === freq) || FREQUENCIES[0]
  const parsedAmount = parseFloat(amount) || 0
  const annualTotal = parsedAmount * freqObj.multiplier

  return (
    <div className="absolute top-full left-0 mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-4 w-64 z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#1A1A2E]">Calculate</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[#6B7280] hover:text-red-600 text-sm leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <label className="block text-xs text-[#6B7280] mb-1">Amount</label>
      <input
        type="number"
        step="any"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        className="w-full text-sm border border-[#E5E7EB] rounded px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
      />
      <label className="block text-xs text-[#6B7280] mb-1">Frequency</label>
      <select
        value={freq}
        onChange={(e) => onFreqChange(e.target.value)}
        className="w-full text-sm border border-[#E5E7EB] rounded px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
      >
        {FREQUENCIES.map((f) => (
          <option key={f.key} value={f.key}>{f.label}</option>
        ))}
      </select>
      <div className="text-xs text-[#1A1A2E] font-medium mb-3">
        Annual Total: {parsedAmount === 0 ? '—' : fmt(annualTotal)}
      </div>
      <button
        type="button"
        onClick={() => onApply(annualTotal)}
        className="w-full bg-[#1E3D2F] text-white text-sm px-3 py-1.5 rounded hover:bg-[#2A5240]"
      >
        Apply
      </button>
    </div>
  )
}

// Firm-assumption dollar fields (Cell Phone, Annual Benefits) — formatted
// at rest, plain number while focused, saved on blur. The remaining
// assumption fields are percentages / small counts and stay plain numbers.
const DOLLAR_ASSUMPTION_FIELDS = ['cell_phone_allowance', 'benefits_annual']

// Maps a firm assumption field to the rate_cards columns that persist its
// popover calculator inputs, so the popover can pre-fill on reopen.
const ASSUMPTION_CALC_FIELDS = {
  cell_phone_allowance: { amountCol: 'cell_phone_calc_amount', freqCol: 'cell_phone_calc_freq', defaultFreq: 'month' },
  benefits_annual: { amountCol: 'benefits_calc_amount', freqCol: 'benefits_calc_freq', defaultFreq: 'month' },
  overhead_operating: { amountCol: 'operating_calc_amount', freqCol: 'operating_calc_freq', defaultFreq: 'hour' },
  overhead_insurance: { amountCol: 'insurance_calc_amount', freqCol: 'insurance_calc_freq', defaultFreq: 'hour' },
}

function DollarAssumptionInput({ value, focused, onFocusField, onOpenPopover, onCommit }) {
  const [raw, setRaw] = useState(String(value ?? 0))

  return (
    <input
      type={focused ? 'number' : 'text'}
      step="any"
      value={focused ? raw : fmt(value)}
      onFocus={() => {
        setRaw(String(value ?? 0))
        onFocusField()
      }}
      onClick={onOpenPopover}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={(e) => onCommit(e.target.value)}
      className="text-sm border border-[#E5E7EB] rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
    />
  )
}

const CUSTOM_ITEM_SELECT = 'text-xs border border-[#E5E7EB] rounded px-1 py-0.5 text-[#1A1A2E]'

function CustomItemRow({ item, onEditLabel, onEditAmount, onChangeType, onChangeCategory, onDelete }) {
  const isPercent = item.value_type === 'percent'

  return (
    <div className="flex items-center gap-2 py-1 w-full">
      <input
        type="text"
        defaultValue={item.label}
        onBlur={(e) => onEditLabel(item.id, e.target.value)}
        placeholder="Item description..."
        className="flex-1 min-w-0 border border-[#E5E7EB] rounded px-2 py-1 text-sm text-[#1A1A2E] placeholder-[#9CA3AF]"
      />
      <input
        key={`${item.id}-${item.amount}-${item.value_type}`}
        type="text"
        defaultValue={isPercent ? `${item.amount}%` : fmt(item.amount)}
        onBlur={(e) => onEditAmount(item.id, e.target.value)}
        className="w-24 text-xs text-right border border-[#E5E7EB] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#F2903A] text-[#1A1A2E]"
      />
      <select value={item.value_type} onChange={(e) => onChangeType(item.id, e.target.value)} className={`w-28 ${CUSTOM_ITEM_SELECT}`}>
        <option value="amount">$ Amount</option>
        <option value="percent">% of Salary</option>
      </select>
      <select value={item.category} onChange={(e) => onChangeCategory(item.id, e.target.value)} className={`w-32 ${CUSTOM_ITEM_SELECT}`}>
        <option value="compensation">Compensation</option>
        <option value="overhead">Overhead</option>
      </select>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="text-[#6B7280] hover:text-red-600 text-sm leading-none shrink-0"
        aria-label="Delete custom item"
      >
        ×
      </button>
    </div>
  )
}

// Always-present blank row for adding a new custom item. Commits only when
// focus leaves the whole row (not when tabbing between its own fields or
// changing its dropdowns), so filling it in doesn't fire twice.
function CustomItemDraftRow({ onCommit }) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [valueType, setValueType] = useState('amount')
  const [category, setCategory] = useState('compensation')
  const isPercent = valueType === 'percent'

  function commit() {
    const trimmedLabel = label.trim()
    const parsedAmount = isPercent ? parsePercentInput(amount) : parseCurrencyInput(amount)
    if (!trimmedLabel && !parsedAmount) return
    onCommit(trimmedLabel || 'Custom Item', parsedAmount, valueType, category)
    setLabel('')
    setAmount('')
    setValueType('amount')
    setCategory('compensation')
  }

  return (
    <div
      className="flex items-center gap-2 py-1 w-full"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) commit()
      }}
    >
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Add custom item..."
        className="flex-1 min-w-0 border border-[#E5E7EB] rounded px-2 py-1 text-sm text-[#1A1A2E] placeholder-[#9CA3AF]"
      />
      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={isPercent ? '% of salary' : '$0.00'}
        className="w-24 text-xs text-right border border-dashed border-[#E5E7EB] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#F2903A] text-[#6B7280]"
      />
      <select value={valueType} onChange={(e) => setValueType(e.target.value)} className={`w-28 ${CUSTOM_ITEM_SELECT}`}>
        <option value="amount">$ Amount</option>
        <option value="percent">% of Salary</option>
      </select>
      <select value={category} onChange={(e) => setCategory(e.target.value)} className={`w-32 ${CUSTOM_ITEM_SELECT}`}>
        <option value="compensation">Compensation</option>
        <option value="overhead">Overhead</option>
      </select>
      <span className="w-[14px] shrink-0" />
    </div>
  )
}

function StackCard({ stack, firmAssumptions, canDelete, onFieldBlur, onDelete, onAddCustomItem, onEditCustomLabel, onEditCustomAmount, onChangeCustomType, onChangeCustomCategory, onDeleteCustomItem }) {
  const { low, high, required_rate_avg } = outputsFor(stack, firmAssumptions)
  const healthy = Number(stack.billable_rate ?? 0) >= required_rate_avg

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-b-lg rounded-tr-lg p-4 max-w-2xl">
      {/* Card header — always mirrors the active tab (stack.notes) */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <input
          type="text"
          defaultValue={stack.notes ?? ''}
          onBlur={(e) => onFieldBlur(stack.rate_id, 'notes', e.target.value, true)}
          className="text-sm font-semibold text-[#1A1A2E] border-b border-transparent hover:border-[#E5E7EB] focus:border-[#F2903A] focus:outline-none flex-1 min-w-0 py-0.5"
        />
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(stack.rate_id)}
            className="text-[#6B7280] hover:text-red-600 text-lg leading-none shrink-0"
            aria-label="Delete title stack"
          >
            ×
          </button>
        )}
      </div>

      <SectionHeader label="Compensation" />
      <TableHeader />

      <div className="flex items-center gap-2 py-1">
        <span className="flex-1 text-xs text-[#6B7280]">Salary Low / Salary High</span>
        <div className={`${COL_W}`}>
          <SalaryFieldInput value={stack.salary_low} onCommit={(v) => onFieldBlur(stack.rate_id, 'salary_low', v)} />
        </div>
        <div className={`${COL_W}`}>
          <SalaryFieldInput value={stack.salary_high} onCommit={(v) => onFieldBlur(stack.rate_id, 'salary_high', v)} />
        </div>
      </div>

      <Row2 label={`Bonus (${firmAssumptions.bonus_pct}%)`} low={fmt(low.bonus)} high={fmt(high.bonus)} />
      <Row2 label="Cell Phone" low={fmt(firmAssumptions.cell_phone_allowance)} high={fmt(firmAssumptions.cell_phone_allowance)} />
      <Row2 label={`401k Match (${firmAssumptions.retirement_match_pct}%)`} low={fmt(low.retirement)} high={fmt(high.retirement)} />
      <Row2 label="Annual Benefits" low={fmt(firmAssumptions.benefits_annual)} high={fmt(firmAssumptions.benefits_annual)} />
      <Row2 label={`Holidays (${firmAssumptions.holiday_days} days)`} low={fmt(low.holiday_cost)} high={fmt(high.holiday_cost)} />
      <SharedEditRow label="PTO Weeks" value={stack.pto_weeks} onCommit={(v) => onFieldBlur(stack.rate_id, 'pto_weeks', v)} />
      <Row2 label="PTO Cost" low={fmt(low.pto_cost)} high={fmt(high.pto_cost)} />
      <SharedEditRow label="Utilization %" value={stack.target_utilization_pct} suffix="%" onCommit={(v) => onFieldBlur(stack.rate_id, 'target_utilization_pct', v)} />
      <Row2 label="Utilization Cost" low={fmt(low.utilization_cost)} high={fmt(high.utilization_cost)} />

      <SubtotalRow2 label="Total Annual Cost" low={fmt(low.total_annual_cost)} high={fmt(high.total_annual_cost)} />

      <SectionHeader label="Overhead" />
      <TableHeader />
      <Row2 label="Operating" low={fmt(firmAssumptions.overhead_operating)} high={fmt(firmAssumptions.overhead_operating)} />
      <Row2 label="Insurance" low={fmt(firmAssumptions.overhead_insurance)} high={fmt(firmAssumptions.overhead_insurance)} />
      <Row2 label={`Profit (${firmAssumptions.overhead_profit_pct}%)`} low={fmt(low.overhead_profit)} high={fmt(high.overhead_profit)} />
      <Row2 label={`Taxes (${firmAssumptions.overhead_taxes_pct}%)`} low={fmt(low.overhead_taxes)} high={fmt(high.overhead_taxes)} />
      <Row2 label={`Support (${firmAssumptions.overhead_support_pct}%)`} low={fmt(low.overhead_support)} high={fmt(high.overhead_support)} />

      <SubtotalRow2 label="Total Overhead/Hr" low={fmt(low.total_overhead)} high={fmt(high.total_overhead)} />

      <SectionHeader label="Rate Calculation" />
      <TableHeader />
      <Row2 label="Total Annual Cost" low={fmt(low.grand_total_annual_cost)} high={fmt(high.grand_total_annual_cost)} />
      <Row2
        label="Billable Hours"
        low={`${Number(low.billable_hours).toLocaleString('en-US')} hrs`}
        high={`${Number(high.billable_hours).toLocaleString('en-US')} hrs`}
      />
      <Row2 label="Cost Per Hour" low={fmt(low.cost_per_hour)} high={fmt(high.cost_per_hour)} />
      <Row2 label="+ Total Overhead/Hr" low={fmt(low.total_overhead)} high={fmt(high.total_overhead)} />

      <TotalRow2 label="Required Rate" low={fmt(low.required_rate)} high={fmt(high.required_rate)} />
      <AverageRow label="Required Rate (Avg)" value={fmt(required_rate_avg)} />

      <div className="mt-3 pt-2 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <span className="flex-1 text-xs text-[#6B7280]">Published Rate</span>
          <div className={`${SPAN_W} flex items-center justify-end gap-0.5`}>
            <span className={`text-xs font-semibold ${healthy ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>$</span>
            <input
              type="number"
              step="any"
              defaultValue={stack.billable_rate}
              onBlur={(e) => onFieldBlur(stack.rate_id, 'billable_rate', e.target.value)}
              className={`w-20 text-xs text-right font-semibold border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#F2903A] ${
                healthy ? 'text-[#10B981] border-green-200' : 'text-[#EF4444] border-red-200'
              }`}
            />
          </div>
        </div>
        <div className={`text-xs mt-1 text-right ${healthy ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
          {healthy ? '✅ Covered' : '⚠️ Below Required'}
        </div>
      </div>

      <SectionHeader label="Custom Items" />
      {(stack.custom_items || []).map((item) => (
        <CustomItemRow
          key={item.id}
          item={item}
          onEditLabel={(id, v) => onEditCustomLabel(stack.rate_id, id, v)}
          onEditAmount={(id, v) => onEditCustomAmount(stack.rate_id, id, v)}
          onChangeType={(id, v) => onChangeCustomType(stack.rate_id, id, v)}
          onChangeCategory={(id, v) => onChangeCustomCategory(stack.rate_id, id, v)}
          onDelete={(id) => onDeleteCustomItem(stack.rate_id, id)}
        />
      ))}
      <CustomItemDraftRow onCommit={(label, amount, valueType, category) => onAddCustomItem(stack.rate_id, label, amount, valueType, category)} />
    </div>
  )
}

export default function RateBuilderPage() {
  const [stacks, setStacks] = useState([])
  const [selectedRateId, setSelectedRateId] = useState(null)
  const [firmAssumptions, setFirmAssumptions] = useState(DEFAULT_ASSUMPTIONS)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [popoverField, setPopoverField] = useState(null)
  const [popoverAmount, setPopoverAmount] = useState('')
  const [popoverFreq, setPopoverFreq] = useState('month')
  const [focusedField, setFocusedField] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    fetchStacks()
  }, [])

  useEffect(() => {
    if (!popoverField) return
    function handleDocClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverField(null)
      }
    }
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [popoverField])

  // Opens the popover for a field and resets its inputs — the only place
  // amount/frequency get cleared. Apply/close never reset them.
  function openPopover(field) {
    setPopoverField(field)
    const calc = ASSUMPTION_CALC_FIELDS[field]
    const source = stacks[0]
    if (calc && source) {
      const storedAmount = source[calc.amountCol]
      const storedFreq = source[calc.freqCol]
      setPopoverAmount(storedAmount != null ? String(storedAmount) : '')
      setPopoverFreq(storedFreq || calc.defaultFreq)
    } else {
      setPopoverAmount('')
      setPopoverFreq('month')
    }
  }

  async function fetchStacks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('rate_cards')
      .select('*')
      .eq('rate_type', 'Role-Based')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching title stacks:', error)
      setLoading(false)
      return []
    }

    const rows = data || []
    const mapped = rows.map((r) => ({
      rate_id: r.rate_id,
      notes: r.notes,
      sort_order: r.sort_order ?? 0,
      salary_low: r.salary_low ?? 0,
      salary_high: r.salary_high ?? 0,
      pto_weeks: r.pto_weeks ?? 0,
      target_utilization_pct: r.target_utilization_pct ?? 0,
      billable_rate: r.billable_rate ?? 0,
      custom_items: r.custom_items ?? [],
      cell_phone_calc_amount: r.cell_phone_calc_amount,
      cell_phone_calc_freq: r.cell_phone_calc_freq,
      benefits_calc_amount: r.benefits_calc_amount,
      benefits_calc_freq: r.benefits_calc_freq,
      operating_calc_amount: r.operating_calc_amount,
      operating_calc_freq: r.operating_calc_freq,
      insurance_calc_amount: r.insurance_calc_amount,
      insurance_calc_freq: r.insurance_calc_freq,
    }))
    setStacks(mapped)

    setSelectedRateId((prev) => {
      if (mapped.length === 0) return null
      if (prev && mapped.some((s) => s.rate_id === prev)) return prev
      return mapped[0].rate_id
    })

    if (rows.length > 0) {
      const first = rows[0]
      setFirmAssumptions({
        bonus_pct: first.bonus_pct ?? DEFAULT_ASSUMPTIONS.bonus_pct,
        cell_phone_allowance: first.cell_phone_allowance ?? DEFAULT_ASSUMPTIONS.cell_phone_allowance,
        retirement_match_pct: first.retirement_match_pct ?? DEFAULT_ASSUMPTIONS.retirement_match_pct,
        benefits_annual: first.benefits_annual ?? DEFAULT_ASSUMPTIONS.benefits_annual,
        holiday_days: first.holiday_days ?? DEFAULT_ASSUMPTIONS.holiday_days,
        overhead_operating: first.overhead_operating ?? DEFAULT_ASSUMPTIONS.overhead_operating,
        overhead_insurance: first.overhead_insurance ?? DEFAULT_ASSUMPTIONS.overhead_insurance,
        overhead_profit_pct: first.overhead_profit_pct ?? DEFAULT_ASSUMPTIONS.overhead_profit_pct,
        overhead_taxes_pct: first.overhead_taxes_pct ?? DEFAULT_ASSUMPTIONS.overhead_taxes_pct,
        overhead_support_pct: first.overhead_support_pct ?? DEFAULT_ASSUMPTIONS.overhead_support_pct,
      })
    }

    setLoading(false)
    return mapped
  }

  // Title-specific field blur (salary_low, salary_high, pto_weeks,
  // target_utilization_pct, billable_rate, notes).
  async function handleStackFieldBlur(rateId, field, raw, isText = false) {
    const value = isText ? raw.trim() : parseNum(raw)

    let updatedStack = null
    setStacks((prev) =>
      prev.map((s) => {
        if (s.rate_id !== rateId) return s
        updatedStack = { ...s, [field]: value }
        return updatedStack
      }),
    )

    if (!updatedStack) return
    const { dbFields } = outputsFor(updatedStack, firmAssumptions)
    const { error } = await supabase
      .from('rate_cards')
      .update({ [field]: value, ...dbFields })
      .eq('rate_id', rateId)
    if (error) console.error('Error saving field:', error)
  }

  // Persists one firm assumption field (plus optional popover calc-input
  // columns) to every Role-Based row, then recalculates and saves every
  // stack's outputs under the new assumptions.
  async function applyAssumptionValue(field, value, extraFields = {}) {
    const updatedAssumptions = { ...firmAssumptions, [field]: value }
    setFirmAssumptions(updatedAssumptions)

    const { error: bulkErr } = await supabase
      .from('rate_cards')
      .update({ [field]: value, ...extraFields })
      .eq('rate_type', 'Role-Based')
    if (bulkErr) console.error('Error saving firm assumption:', bulkErr)

    await Promise.all(
      stacks.map((s) => {
        const { dbFields } = outputsFor(s, updatedAssumptions)
        return supabase.from('rate_cards').update(dbFields).eq('rate_id', s.rate_id)
      }),
    )
  }

  // Firm assumption blur — applies to every Role-Based row.
  function handleAssumptionBlur(field, raw) {
    return applyAssumptionValue(field, parseNum(raw))
  }

  // Shared persist helper for all custom-item mutations.
  async function persistCustomItems(rateId, nextItems) {
    let updatedStack = null
    setStacks((prev) =>
      prev.map((s) => {
        if (s.rate_id !== rateId) return s
        updatedStack = { ...s, custom_items: nextItems }
        return updatedStack
      }),
    )
    if (!updatedStack) return
    const { dbFields } = outputsFor(updatedStack, firmAssumptions)
    const { error } = await supabase
      .from('rate_cards')
      .update({ custom_items: nextItems, ...dbFields })
      .eq('rate_id', rateId)
    if (error) console.error('Error saving custom items:', error)
  }

  function handleAddCustomItem(rateId, label, amount, valueType, category) {
    const stack = stacks.find((s) => s.rate_id === rateId)
    if (!stack) return
    const newItem = { id: crypto.randomUUID(), label, amount, value_type: valueType, category }
    persistCustomItems(rateId, [...(stack.custom_items || []), newItem])
  }

  function handleEditCustomLabel(rateId, itemId, rawLabel) {
    const stack = stacks.find((s) => s.rate_id === rateId)
    if (!stack) return
    const nextItems = (stack.custom_items || []).map((it) =>
      it.id === itemId ? { ...it, label: rawLabel.trim() } : it,
    )
    persistCustomItems(rateId, nextItems)
  }

  function handleEditCustomAmount(rateId, itemId, rawAmount) {
    const stack = stacks.find((s) => s.rate_id === rateId)
    if (!stack) return
    const item = (stack.custom_items || []).find((it) => it.id === itemId)
    const isPercent = item?.value_type === 'percent'
    const parsed = isPercent ? parsePercentInput(rawAmount) : parseCurrencyInput(rawAmount)
    const nextItems = (stack.custom_items || []).map((it) =>
      it.id === itemId ? { ...it, amount: parsed } : it,
    )
    persistCustomItems(rateId, nextItems)
  }

  function handleChangeCustomType(rateId, itemId, newType) {
    const stack = stacks.find((s) => s.rate_id === rateId)
    if (!stack) return
    const nextItems = (stack.custom_items || []).map((it) =>
      it.id === itemId ? { ...it, value_type: newType } : it,
    )
    persistCustomItems(rateId, nextItems)
  }

  function handleChangeCustomCategory(rateId, itemId, newCategory) {
    const stack = stacks.find((s) => s.rate_id === rateId)
    if (!stack) return
    const nextItems = (stack.custom_items || []).map((it) =>
      it.id === itemId ? { ...it, category: newCategory } : it,
    )
    persistCustomItems(rateId, nextItems)
  }

  function handleDeleteCustomItem(rateId, itemId) {
    const stack = stacks.find((s) => s.rate_id === rateId)
    if (!stack) return
    const nextItems = (stack.custom_items || []).filter((it) => it.id !== itemId)
    persistCustomItems(rateId, nextItems)
  }

  async function handleSeed() {
    setBusy(true)
    const defaults = {
      rate_type: 'Role-Based',
      effective_date: new Date().toISOString().split('T')[0],
      is_active: true,
      ...DEFAULT_ASSUMPTIONS,
    }

    const titleStacks = [
      { ...defaults, notes: 'Project Coordinator', role: 'Coordinator', billable_rate: 110, salary_low: 65000, salary_high: 80000, pto_weeks: 3, sort_order: 1 },
      { ...defaults, notes: 'Assistant Project Manager', role: 'PM', billable_rate: 130, salary_low: 80000, salary_high: 100000, pto_weeks: 3, sort_order: 2 },
      { ...defaults, notes: 'Project Manager', role: 'PM', billable_rate: 150, salary_low: 100000, salary_high: 120000, pto_weeks: 4, sort_order: 3 },
      { ...defaults, notes: 'Senior Project Manager', role: 'Sr-PM', billable_rate: 180, salary_low: 120000, salary_high: 144000, pto_weeks: 4, sort_order: 4 },
      { ...defaults, notes: 'Principal', role: 'Principal', billable_rate: 210, salary_low: 160000, salary_high: 200000, pto_weeks: 5, sort_order: 5 },
    ]

    const { error } = await supabase.from('rate_cards').insert(titleStacks)
    if (error) console.error('Error seeding title stacks:', error)
    else await fetchStacks()
    setBusy(false)
  }

  async function handleAdd() {
    setBusy(true)
    const nextSortOrder = stacks.length > 0 ? Math.max(...stacks.map((s) => s.sort_order ?? 0)) + 1 : 1
    const newStack = {
      notes: 'New Title',
      role: 'PM',
      rate_type: 'Role-Based',
      billable_rate: 0,
      effective_date: new Date().toISOString().split('T')[0],
      is_active: true,
      sort_order: nextSortOrder,
      salary_low: 0,
      salary_high: 0,
      pto_weeks: 3,
      target_utilization_pct: 85,
      ...firmAssumptions,
    }

    const { data, error } = await supabase.from('rate_cards').insert(newStack).select().single()
    if (error) {
      console.error('Error adding title stack:', error)
      setBusy(false)
      return
    }

    await fetchStacks()
    setSelectedRateId(data.rate_id)
    setBusy(false)
  }

  async function handleDelete(rateId) {
    if (!window.confirm('Delete this title stack? This cannot be undone.')) return
    const idx = stacks.findIndex((s) => s.rate_id === rateId)
    const { error } = await supabase.from('rate_cards').delete().eq('rate_id', rateId)
    if (error) {
      console.error('Error deleting title stack:', error)
      return
    }
    const mapped = await fetchStacks()
    if (mapped.length === 0) {
      setSelectedRateId(null)
      return
    }
    const targetIdx = Math.min(Math.max(0, idx - 1), mapped.length - 1)
    setSelectedRateId(mapped[targetIdx].rate_id)
  }

  // Drag-to-reorder: moves fromId to just before toId, reassigns sort_order
  // 1..N for the new order, saves all affected rows, then reloads.
  // fetchStacks preserves selectedRateId automatically.
  async function handleReorder(fromId, toId) {
    if (fromId === toId) return
    const fromIdx = stacks.findIndex((s) => s.rate_id === fromId)
    const toIdx = stacks.findIndex((s) => s.rate_id === toId)
    if (fromIdx === -1 || toIdx === -1) return

    const reordered = [...stacks]
    const [moved] = reordered.splice(fromIdx, 1)
    const insertAt = reordered.findIndex((s) => s.rate_id === toId)
    reordered.splice(insertAt, 0, moved)

    const updates = reordered.map((s, i) =>
      supabase.from('rate_cards').update({ sort_order: i + 1 }).eq('rate_id', s.rate_id),
    )
    await Promise.all(updates)

    await fetchStacks()
  }

  const selectedStack = stacks.find((s) => s.rate_id === selectedRateId) || null

  return (
    <PageWrapper breadcrumb="Rate Builder">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1A1A2E]">Rate Builder</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Firm-wide burden assumptions and per-title rate stacks.
        </p>
      </div>

      {/* Section 1 — Firm Assumptions */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-6">
        <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
          Firm Assumptions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {ASSUMPTION_FIELDS.map((f) => {
            const isDollar = DOLLAR_ASSUMPTION_FIELDS.includes(f.key)
            return (
              <div key={f.key} className="relative">
                <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1">{f.label}</label>
                <div className="flex items-center gap-1">
                  {f.prefix && <span className="text-sm text-[#6B7280]">{f.prefix}</span>}
                  {isDollar ? (
                    <DollarAssumptionInput
                      value={firmAssumptions[f.key]}
                      focused={focusedField === f.key}
                      onFocusField={() => setFocusedField(f.key)}
                      onOpenPopover={() => openPopover(f.key)}
                      onCommit={(raw) => {
                        setFocusedField(null)
                        handleAssumptionBlur(f.key, raw)
                      }}
                    />
                  ) : (
                    <input
                      key={`${f.key}-${firmAssumptions[f.key]}`}
                      type="number"
                      step="any"
                      defaultValue={firmAssumptions[f.key]}
                      onClick={() => openPopover(f.key)}
                      onBlur={(e) => handleAssumptionBlur(f.key, e.target.value)}
                      className="text-sm border border-[#E5E7EB] rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
                    />
                  )}
                  {f.suffix && <span className="text-sm text-[#6B7280]">{f.suffix}</span>}
                </div>
                {popoverField === f.key && (
                  <div ref={popoverRef}>
                    <AssumptionPopover
                      amount={popoverAmount}
                      freq={popoverFreq}
                      onAmountChange={setPopoverAmount}
                      onFreqChange={setPopoverFreq}
                      onApply={async (value) => {
                        const calc = ASSUMPTION_CALC_FIELDS[f.key]
                        const extraFields = calc
                          ? { [calc.amountCol]: parseFloat(popoverAmount) || null, [calc.freqCol]: popoverFreq }
                          : {}
                        await applyAssumptionValue(f.key, value, extraFields)
                        await fetchStacks()
                        setPopoverField(null)
                      }}
                      onClose={() => setPopoverField(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 2 — Title Stacks (tabbed) */}
      {loading ? (
        <div className="text-sm text-[#6B7280]">Loading...</div>
      ) : stacks.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 text-center py-12">
          <p className="text-sm text-[#6B7280] mb-4">No title stacks found. Set up your standard rate stacks to get started.</p>
          <button
            onClick={handleSeed}
            disabled={busy}
            className="bg-[#1E3D2F] text-white px-4 py-2 rounded text-sm hover:bg-[#2A5240] transition-colors disabled:opacity-40"
          >
            Set Up Standard Title Stacks
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-end gap-1 overflow-x-auto">
            {stacks.map((s) => {
              const active = s.rate_id === selectedRateId
              const isDragged = s.rate_id === draggedId
              const isDragOver = s.rate_id === dragOverId && s.rate_id !== draggedId
              return (
                <button
                  key={s.rate_id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    setDraggedId(s.rate_id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverId(s.rate_id)
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleReorder(draggedId, s.rate_id)
                    setDraggedId(null)
                    setDragOverId(null)
                  }}
                  onDragEnd={() => {
                    setDraggedId(null)
                    setDragOverId(null)
                  }}
                  onClick={() => setSelectedRateId(s.rate_id)}
                  title={s.notes || 'Untitled'}
                  className={`shrink-0 max-w-[160px] truncate rounded-t px-4 py-2 text-sm ${
                    active
                      ? 'bg-[#1E3D2F] text-white font-medium'
                      : 'bg-[#F3F4F6] text-[#6B7280] cursor-pointer hover:bg-[#E5E7EB]'
                  } ${isDragged ? 'opacity-50' : ''} ${isDragOver ? 'border-l-2 border-[#F2903A]' : ''}`}
                >
                  {s.notes || 'Untitled'}
                </button>
              )
            })}
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy}
              className="shrink-0 bg-[#F3F4F6] text-[#6B7280] rounded-t px-4 py-2 text-sm hover:bg-[#E5E7EB] disabled:opacity-40"
              aria-label="Add title stack"
            >
              +
            </button>
          </div>

          {selectedStack && (
            <StackCard
              key={selectedStack.rate_id}
              stack={selectedStack}
              firmAssumptions={firmAssumptions}
              canDelete={stacks.length > 1}
              onFieldBlur={handleStackFieldBlur}
              onDelete={handleDelete}
              onAddCustomItem={handleAddCustomItem}
              onEditCustomLabel={handleEditCustomLabel}
              onEditCustomAmount={handleEditCustomAmount}
              onChangeCustomType={handleChangeCustomType}
              onChangeCustomCategory={handleChangeCustomCategory}
              onDeleteCustomItem={handleDeleteCustomItem}
            />
          )}
        </div>
      )}
    </PageWrapper>
  )
}
