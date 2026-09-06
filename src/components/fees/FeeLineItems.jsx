import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

const PARTICIPATION = ['High', 'Medium', 'Low']
const UNIT_OPTIONS = [
  { value: 'per-week', label: 'Per Week' },
  { value: 'per-month', label: 'Per Month' },
  { value: 'total', label: 'Total' },
]
const ROLES = ['PM', 'Contracts', 'CM', 'Scheduling', 'Sustainability', 'Custom']

const PHASE_ORDER = ['Preconstruction', 'Construction']
const CATEGORY_ORDER = [
  'A-Predevelopment',
  'B-Design-Consultant-Selection',
  'C-Contractor-Selection',
  'D-Preconstruction-Coordination',
  'E-Other-Vendor-Procurement',
  'F-Cost-Schedule-Quality',
  'G-Construction-Phase',
  'H-Other-Vendors-Construction',
  'I-Other-Scope',
]

const CELL_INPUT =
  'border border-[#E5E7EB] rounded px-2 py-1 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]'

function catLabel(cat) {
  const [letter, ...rest] = String(cat).split('-')
  return rest.length ? `${letter} - ${rest.join(' ')}` : letter
}

function fmtCurrency(v) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v ?? 0))
}

function fmtNum(v) {
  return Number(v ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

// Preconstruction categories are A–E; Construction is F–I.
const PRECON_CATEGORIES = CATEGORY_ORDER.slice(0, 5)

// Map legacy scope_unit_enum values ('ls','ea','wks','mon','hr') onto the
// current per-week / per-month / total set so pre-existing rows render
// correctly without a data migration.
function normalizeUnit(u) {
  if (u === 'per-week' || u === 'wks') return 'per-week'
  if (u === 'per-month' || u === 'mon') return 'per-month'
  return 'total'
}

// Phase a line item belongs to: explicit scope_library.phase, else inferred
// from its category, else Preconstruction (custom items have no scope row).
function itemPhase(item) {
  const ph = item.scope_library?.phase
  if (ph === 'Preconstruction' || ph === 'Construction') return ph
  const cat = item.scope_library?.category
  if (cat) return PRECON_CATEGORIES.includes(cat) ? 'Preconstruction' : 'Construction'
  return 'Preconstruction'
}

// Suggested quantity for per-week / per-month units, derived from the phase
// duration. Informational only — never written to the Qty field.
// Returns null when the unit is 'total' (no hint shown).
function computeAutoQty(unit, phase, durations) {
  if (unit !== 'per-week' && unit !== 'per-month') return null
  const isPre = phase === 'Preconstruction'
  const dur = parseFloat(isPre ? durations.preDuration : durations.conDuration)
  const durUnit = isPre ? durations.preDurationUnit : durations.conDurationUnit
  if (!Number.isFinite(dur) || dur === 0) return 0
  let qty
  if (unit === 'per-week') qty = durUnit === 'Weeks' ? dur : dur * 4.33
  else qty = durUnit === 'Months' ? dur : dur / 4.33
  // 'per-week' quantities are whole weeks — always round up; 'per-month' keeps 1 decimal.
  return unit === 'per-week' ? Math.ceil(qty) : Math.round(qty * 10) / 10
}

// Flatten line items into category-grouped render rows: a header row for each
// non-empty category (CATEGORY_ORDER, then 'Custom' last) followed by its items.
// The # column (rowIndex) runs continuously across every group.
function buildGroupedRows(items) {
  const byCategory = new Map()
  for (const it of items) {
    const cat = it.scope_library?.category ?? 'Custom'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat).push(it)
  }
  const rows = []
  let rowIndex = 0
  for (const cat of [...CATEGORY_ORDER, 'Custom']) {
    const group = byCategory.get(cat)
    if (!group || group.length === 0) continue
    const totalHrs = group.reduce((s, it) => s + Number(it.total_hours ?? 0), 0)
    const totalFee = group.reduce((s, it) => s + Number(it.line_total ?? 0), 0)
    rows.push({ type: 'header', category: cat, totalHrs, totalFee })
    for (const item of group) {
      rows.push({ type: 'item', item, rowIndex })
      rowIndex += 1
    }
  }
  return rows
}

// ---------------------------------------------------------------------------
// Left panel — scope library browser
// ---------------------------------------------------------------------------
function ScopeLibraryBrowser({ library, addedScopeIds, onAdd, search, setSearch, busy }) {
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const out = {}
    for (const it of library) {
      const matches =
        !q ||
        (it.activity_name ?? '').toLowerCase().includes(q) ||
        String(it.item_number ?? '').toLowerCase().includes(q)
      if (!matches) continue
      if (!out[it.phase]) out[it.phase] = {}
      if (!out[it.phase][it.category]) out[it.phase][it.category] = []
      out[it.phase][it.category].push(it)
    }
    return out
  }, [library, search])

  const hasAny = PHASE_ORDER.some((ph) => grouped[ph])

  return (
    <div className="border border-[#E5E7EB] rounded bg-white">
      <div className="p-3 border-b border-[#E5E7EB]">
        <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
          Scope Library
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities…"
          className={`w-full ${CELL_INPUT}`}
        />
      </div>
      <div className="max-h-[360px] lg:max-h-[560px] overflow-y-auto p-2">
        {!hasAny && (
          <div className="text-xs text-[#6B7280] px-2 py-3">
            {library.length === 0
              ? 'Scope library is empty.'
              : 'No activities match your search.'}
          </div>
        )}
        {PHASE_ORDER.filter((ph) => grouped[ph]).map((ph) => (
          <div key={ph} className="mb-2">
            <div className="text-xs font-semibold text-[#1A1A2E] px-1 py-1">{ph}</div>
            {CATEGORY_ORDER.filter((cat) => grouped[ph][cat]).map((cat) => (
              <div key={cat} className="mb-1">
                <div className="text-[11px] font-medium text-[#6B7280] px-1 mt-1">
                  {catLabel(cat)}
                </div>
                {grouped[ph][cat].map((it) => (
                  <button
                    key={it.scope_item_id}
                    type="button"
                    disabled={busy}
                    onClick={() => onAdd(it)}
                    className={`block w-full text-left text-xs px-2 py-1 rounded hover:bg-[#F8F9FA] text-[#1A1A2E] disabled:opacity-40 ${
                      addedScopeIds.has(it.scope_item_id) ? 'opacity-50' : ''
                    }`}
                  >
                    <span className="font-mono text-[#6B7280]">{it.item_number}</span>{' '}
                    {it.activity_name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// One editable line-item row
// ---------------------------------------------------------------------------
function LineRow({ item, index, readOnly, showDelete, durations, onUpdate, onUpdateFields, onDelete }) {
  const activity = item.scope_library?.activity_name ?? item.custom_description ?? '—'
  const normUnit = normalizeUnit(item.unit)
  const autoQty = computeAutoQty(normUnit, itemPhase(item), durations)
  // Auto mode = per-week / per-month unit with a phase duration set (autoQty non-null).
  const isAutoMode = autoQty != null
  const isOverridden = item.qty_override ?? false

  // In auto mode the field shows autoQty until the user overrides it; an override
  // (qty_override = true) pins the saved manual quantity and survives duration changes.
  const displayQty = isAutoMode && !isOverridden ? autoQty : item.quantity ?? 0
  const [localQty, setLocalQty] = useState(displayQty)
  useEffect(() => {
    setLocalQty(displayQty)
  }, [displayQty])

  function commitQty(raw) {
    const parsed = parseFloat(raw)
    const next = Number.isFinite(parsed) ? parsed : 0
    const override = isAutoMode && next !== autoQty
    onUpdateFields(item.line_item_id, { quantity: next, qty_override: override })
  }

  function resetQtyOverride() {
    onUpdateFields(item.line_item_id, { qty_override: false, quantity: autoQty })
  }

  function commitNumber(field, raw) {
    const parsed = parseFloat(raw)
    const next = Number.isFinite(parsed) ? parsed : 0
    if (next === Number(item[field] ?? 0)) return
    onUpdate(item.line_item_id, field, next)
  }

  function commitNotes(raw) {
    const next = raw.trim() || null
    if ((next ?? '') === (item.notes ?? '')) return
    onUpdate(item.line_item_id, 'notes', next)
  }

  const roCls = readOnly ? 'bg-[#F8F9FA]' : ''
  const qtyBg = readOnly
    ? 'bg-[#F8F9FA]'
    : isOverridden
      ? 'bg-amber-50'
      : isAutoMode
        ? 'bg-blue-50'
        : ''
  const numInput = `w-16 text-right ${CELL_INPUT} ${roCls}`
  const qtyInput = `w-16 text-right ${CELL_INPUT} ${qtyBg}`
  const selInput = `${CELL_INPUT} ${roCls}`

  return (
    <tr className="border-t border-[#E5E7EB] align-top">
      <td className="px-2 py-2 text-center text-[#6B7280]">{index + 1}</td>
      <td className="px-2 py-2 text-[#1A1A2E] min-w-[12rem]">{activity}</td>

      <td className="px-2 py-2">
        <select
          value={item.participation_level ?? 'Medium'}
          disabled={readOnly}
          onChange={(e) => onUpdate(item.line_item_id, 'participation_level', e.target.value)}
          className={`w-24 ${selInput}`}
        >
          {PARTICIPATION.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>

      <td className="px-2 py-2">
        <select
          value={normUnit}
          disabled={readOnly}
          onChange={(e) =>
            onUpdateFields(item.line_item_id, { unit: e.target.value, qty_override: false })
          }
          className={`w-28 ${selInput}`}
        >
          {UNIT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </td>

      <td className="px-2 py-2">
        <input
          type="number"
          step="any"
          inputMode="decimal"
          value={localQty}
          onChange={(e) => setLocalQty(e.target.value)}
          readOnly={readOnly}
          onBlur={(e) => commitQty(e.target.value)}
          className={qtyInput}
        />
        {!readOnly && isOverridden && (
          <button
            type="button"
            onClick={resetQtyOverride}
            className="block w-16 text-right text-[11px] text-[#F59E0B] hover:underline mt-0.5"
          >
            override ↺
          </button>
        )}
        {!readOnly && isAutoMode && !isOverridden && (
          <div className="w-16 text-right text-[11px] text-[#6B7280] mt-0.5">auto ↺</div>
        )}
      </td>

      <td className="px-2 py-2">
        <input
          key={`${item.line_item_id}-hpu-${item.hours_per_unit}`}
          type="number"
          step="any"
          inputMode="decimal"
          defaultValue={item.hours_per_unit ?? 0}
          readOnly={readOnly}
          onBlur={(e) => commitNumber('hours_per_unit', e.target.value)}
          className={numInput}
        />
      </td>

      <td className="px-2 py-2 text-right text-[#6B7280] whitespace-nowrap">
        {fmtNum(item.total_hours)}
      </td>

      <td className="px-2 py-2">
        <select
          value={item.role ?? 'PM'}
          disabled={readOnly}
          onChange={(e) => onUpdate(item.line_item_id, 'role', e.target.value)}
          className={`w-28 ${selInput}`}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </td>

      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <span className="text-sm text-[#6B7280]">$</span>
          <input
            key={`${item.line_item_id}-rate-${item.rate}`}
            type="number"
            step="any"
            inputMode="decimal"
            defaultValue={item.rate ?? 0}
            readOnly={readOnly}
            onBlur={(e) => commitNumber('rate', e.target.value)}
            className={numInput}
          />
        </div>
      </td>

      <td className="px-2 py-2 text-right text-[#1A1A2E] whitespace-nowrap">
        {fmtCurrency(item.line_total)}
      </td>

      <td className="px-2 py-2">
        <input
          key={`${item.line_item_id}-notes-${item.notes ?? ''}`}
          type="text"
          defaultValue={item.notes ?? ''}
          readOnly={readOnly}
          onBlur={(e) => commitNotes(e.target.value)}
          className={`w-32 ${CELL_INPUT} ${roCls}`}
        />
      </td>

      {showDelete && (
        <td className="px-2 py-2 text-center">
          <button
            type="button"
            onClick={() => onDelete(item.line_item_id)}
            aria-label="Delete line item"
            className="w-6 h-6 rounded text-lg leading-none text-[#EF4444] hover:bg-red-50"
          >
            ×
          </button>
        </td>
      )}
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Trailing blank row for custom items
// ---------------------------------------------------------------------------
function BlankRow({ totalCols, onAdd, resetKey, busy }) {
  return (
    <tr className="border-t border-[#E5E7EB] bg-[#F8F9FA]">
      <td className="px-2 py-2 text-center text-[#6B7280]">+</td>
      <td className="px-2 py-2">
        <input
          key={resetKey}
          type="text"
          disabled={busy}
          placeholder="Add a custom item…"
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v) onAdd(v)
          }}
          className={`w-full ${CELL_INPUT} disabled:opacity-50`}
        />
      </td>
      <td colSpan={totalCols - 2} className="px-2 py-2 text-xs text-[#6B7280]">
        Type a description and tab out to add a custom line item.
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function FeeLineItems({ feeId, feeMethod, isExecuted, onTotalChange, durations }) {
  const isScopeBased = feeMethod === 'Scope-Based'

  const [items, setItems] = useState([])
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [blankKey, setBlankKey] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isScopeBased) return
    let cancelled = false

    async function init() {
      setLoading(true)
      const [libRes, itemRes] = await Promise.all([
        supabase
          .from('scope_library')
          .select(
            'scope_item_id, phase, category, item_number, activity_name, default_unit, default_role, default_participation_level, sort_order',
          )
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('fee_line_items')
          .select('*, scope_library(activity_name, item_number, phase, category)')
          .eq('fee_id', feeId)
          .order('sort_order', { ascending: true }),
      ])
      if (cancelled) return
      if (libRes.error) console.error('Error fetching scope library:', libRes.error)
      else setLibrary(libRes.data ?? [])
      if (itemRes.error) console.error('Error fetching fee line items:', itemRes.error)
      else setItems(itemRes.data ?? [])
      setLoading(false)
    }

    init()
    return () => {
      cancelled = true
    }
  }, [feeId, isScopeBased])

  // line_total is a generated column — always read back, never computed here
  async function reloadItems({ writeTotal = false } = {}) {
    const { data, error } = await supabase
      .from('fee_line_items')
      .select('*, scope_library(activity_name, item_number, phase, category)')
      .eq('fee_id', feeId)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('Error reloading fee line items:', error)
      return
    }
    const rows = data ?? []
    setItems(rows)
    if (writeTotal) {
      const total = rows.reduce((sum, li) => sum + Number(li.line_total ?? 0), 0)
      const { error: upErr } = await supabase
        .from('fee_records')
        .update({ total_fee: total })
        .eq('fee_id', feeId)
      if (upErr) console.error('Error updating fee total:', upErr)
      onTotalChange?.(total)
    }
  }

  const maxSort = items.reduce((m, li) => Math.max(m, li.sort_order ?? 0), 0)

  async function addFromLibrary(scopeItem) {
    if (isExecuted || busy) return
    setBusy(true)
    const { error } = await supabase.from('fee_line_items').insert([
      {
        fee_id: feeId,
        scope_item_id: scopeItem.scope_item_id,
        custom_description: null,
        participation_level: scopeItem.default_participation_level || 'Medium',
        unit: normalizeUnit(scopeItem.default_unit),
        quantity: 1,
        hours_per_unit: 0,
        role: scopeItem.default_role || 'PM',
        rate: 0,
        sort_order: maxSort + 10,
        notes: null,
      },
    ])
    if (error) console.error('Error adding scope item:', error)
    await reloadItems({ writeTotal: true })
    setBusy(false)
  }

  async function addCustom(text) {
    if (isExecuted || busy) return
    setBusy(true)
    const { error } = await supabase.from('fee_line_items').insert([
      {
        fee_id: feeId,
        scope_item_id: null,
        custom_description: text,
        participation_level: 'Medium',
        unit: 'total',
        quantity: 1,
        hours_per_unit: 0,
        role: 'PM',
        rate: 0,
        sort_order: maxSort + 10,
        notes: null,
      },
    ])
    if (error) console.error('Error adding custom item:', error)
    await reloadItems({ writeTotal: true })
    setBlankKey((k) => k + 1)
    setBusy(false)
  }

  async function updateField(id, field, value) {
    if (isExecuted) return
    // optimistic — keeps controlled dropdowns responsive while the write lands
    setItems((prev) => prev.map((i) => (i.line_item_id === id ? { ...i, [field]: value } : i)))
    const { error } = await supabase
      .from('fee_line_items')
      .update({ [field]: value })
      .eq('line_item_id', id)
    if (error) console.error('Error updating line item:', error)
    await reloadItems({ writeTotal: true })
  }

  // Multi-column update (Qty cell): quantity + qty_override, or unit + qty_override, together.
  async function updateFields(id, patch) {
    if (isExecuted) return
    setItems((prev) => prev.map((i) => (i.line_item_id === id ? { ...i, ...patch } : i)))
    const { error } = await supabase
      .from('fee_line_items')
      .update(patch)
      .eq('line_item_id', id)
    if (error) console.error('Error updating line item:', error)
    await reloadItems({ writeTotal: true })
  }

  async function deleteItem(id) {
    if (isExecuted) return
    const { error } = await supabase.from('fee_line_items').delete().eq('line_item_id', id)
    if (error) console.error('Error deleting line item:', error)
    await reloadItems({ writeTotal: true })
  }

  const addedScopeIds = useMemo(
    () => new Set(items.filter((i) => i.scope_item_id).map((i) => i.scope_item_id)),
    [items],
  )

  const groupedRows = useMemo(() => buildGroupedRows(items), [items])

  if (!isScopeBased) return null

  const cols = isExecuted ? 11 : 12

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      {!isExecuted && (
        <div className="lg:w-[280px] lg:flex-shrink-0">
          <ScopeLibraryBrowser
            library={library}
            addedScopeIds={addedScopeIds}
            onAdd={addFromLibrary}
            search={search}
            setSearch={setSearch}
            busy={busy}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="overflow-x-auto border border-[#E5E7EB] rounded bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F3F4F6] text-[#6B7280] uppercase text-xs">
              <tr>
                <th className="px-2 py-3 text-center font-medium">#</th>
                <th className="px-2 py-3 text-left font-medium">Activity</th>
                <th className="px-2 py-3 text-left font-medium whitespace-nowrap">Participation</th>
                <th className="px-2 py-3 text-left font-medium">Unit</th>
                <th className="px-2 py-3 text-right font-medium">Qty</th>
                <th className="px-2 py-3 text-right font-medium whitespace-nowrap">Hrs/Unit</th>
                <th className="px-2 py-3 text-right font-medium whitespace-nowrap">Total Hrs</th>
                <th className="px-2 py-3 text-left font-medium">Role</th>
                <th className="px-2 py-3 text-right font-medium">Rate</th>
                <th className="px-2 py-3 text-right font-medium">Total</th>
                <th className="px-2 py-3 text-left font-medium">Notes</th>
                {!isExecuted && <th className="px-2 py-3 text-center font-medium">Delete</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={cols} className="px-3 py-4 text-center text-[#6B7280]">
                    Loading line items…
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr className="border-t border-[#E5E7EB]">
                  <td colSpan={cols} className="px-3 py-4 text-center text-[#6B7280]">
                    No line items yet. Select items from the scope library or add a custom item below.
                  </td>
                </tr>
              )}

              {!loading &&
                groupedRows.map((row) => {
                  if (row.type === 'header') {
                    return (
                      <tr key={`header-${row.category}`} className="bg-[#1E3D2F] select-none">
                        <td colSpan={6} className="px-3 py-2 text-white text-xs font-semibold uppercase tracking-wide">
                          {catLabel(row.category)}
                        </td>
                        <td className="px-2 py-2 text-right text-white text-xs font-semibold">
                          {row.totalHrs.toFixed(1)} hrs
                        </td>
                        <td className="px-2 py-2" />
                        <td className="px-2 py-2" />
                        <td className="px-2 py-2 text-right text-white text-xs font-semibold">
                          ${row.totalFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2" />
                        {!isExecuted && <td className="px-2 py-2" />}
                      </tr>
                    )
                  }
                  return (
                    <LineRow
                      key={row.item.line_item_id}
                      item={row.item}
                      index={row.rowIndex}
                      readOnly={isExecuted}
                      showDelete={!isExecuted}
                      durations={durations}
                      onUpdate={updateField}
                      onUpdateFields={updateFields}
                      onDelete={deleteItem}
                    />
                  )
                })}

              {!loading && !isExecuted && (
                <BlankRow totalCols={cols} onAdd={addCustom} resetKey={blankKey} busy={busy} />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
