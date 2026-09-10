import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fromISODate, getWeekDays, toISODate, isInBillingMonth, formatDayHeader } from '../../utils/weeks'
import { sumHours, sumBillableHours, fixedUtilizationPct, fixedUtilizationColor } from '../../utils/utilization'

const EDITABLE_STATUSES = ['Draft', 'Returned']

const CELL_INPUT =
  'border border-[#E5E7EB] rounded px-2 py-1 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]'

function fmtHours(v) {
  return Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// ---------------------------------------------------------------------------
// Smart search combobox for the CODE column — matches by code or description.
// ---------------------------------------------------------------------------
function CodeCombobox({ billingCodes, currentCode, disabled, resetKey, onSelect }) {
  const [query, setQuery] = useState(currentCode ? `${currentCode.code} — ${currentCode.description}` : '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setQuery(currentCode ? `${currentCode.code} — ${currentCode.description}` : '')
  }, [currentCode?.code_id, resetKey])

  const matches = useMemo(() => {
    if (!open) return []
    const q = query.trim().toLowerCase()
    return billingCodes
      .filter((c) => !q || c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
      .slice(0, 8)
  }, [billingCodes, query, open])

  function pick(c) {
    setQuery(`${c.code} — ${c.description}`)
    setOpen(false)
    if (c.code_id !== currentCode?.code_id) onSelect(c.code_id)
  }

  return (
    <div className="relative min-w-[9rem]">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Code or description…"
        className={`w-full ${CELL_INPUT} disabled:bg-[#F8F9FA] disabled:text-[#6B7280]`}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-64 max-h-52 overflow-y-auto bg-white border border-[#E5E7EB] rounded shadow-lg">
          {matches.map((c) => (
            <button
              key={c.code_id}
              type="button"
              onMouseDown={() => pick(c)}
              className="block w-full text-left px-2 py-1.5 text-xs hover:bg-[#F8F9FA] text-[#1A1A2E]"
            >
              <span className="font-mono text-[#6B7280]">{c.code}</span> — {c.description}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// One code row: CODE | DESCRIPTION | day cells | TOTAL | DELETE
// ---------------------------------------------------------------------------
function CodeRow({
  codeId,
  billingCode,
  billingCodes,
  entriesByDate,
  weekDays,
  billingMonth,
  readOnly,
  pendingDescription,
  onCommitHours,
  onCommitDescription,
  onChangeCode,
  onDelete,
}) {
  const rowEntries = Object.values(entriesByDate)
  const totalHours = sumHours(rowEntries)
  const description = rowEntries.find((e) => e.description)?.description ?? pendingDescription ?? ''

  return (
    <tr className="border-t border-[#E5E7EB] align-top">
      <td className="px-2 py-2">
        <CodeCombobox
          billingCodes={billingCodes}
          currentCode={billingCode}
          disabled={readOnly}
          onSelect={(newCodeId) => onChangeCode(codeId, newCodeId)}
        />
      </td>
      <td className="px-2 py-2 min-w-[10rem]">
        {billingCode?.requires_description ? (
          <input
            key={`${codeId}-desc-${description}`}
            type="text"
            defaultValue={description}
            readOnly={readOnly}
            placeholder="Description…"
            onBlur={(e) => onCommitDescription(codeId, e.target.value)}
            className={`w-full ${CELL_INPUT} disabled:bg-[#F8F9FA]`}
          />
        ) : (
          <span className="text-xs text-[#6B7280]">—</span>
        )}
      </td>
      {weekDays.map((day, i) => {
        const iso = toISODate(day)
        const entry = entriesByDate[iso]
        const inMonth = isInBillingMonth(day, billingMonth)
        const isWeekend = i === 0 || i === 6
        const disabled = readOnly || !inMonth
        const tdClass = !inMonth ? 'bg-[#E5E7EB]' : isWeekend ? 'bg-[#F8F9FA]' : ''
        const inputBg = !disabled && isWeekend ? 'bg-[#F8F9FA]' : ''
        return (
          <td key={iso} className={`px-1 py-2 text-center ${tdClass}`}>
            <input
              key={`${codeId}-${iso}-${entry?.hours ?? ''}`}
              type="number"
              step="0.5"
              min="0"
              max="24"
              inputMode="decimal"
              defaultValue={entry?.hours ?? ''}
              disabled={disabled}
              onBlur={(e) => onCommitHours(codeId, iso, e.target.value, entry)}
              className={`w-16 min-h-[44px] text-center ${CELL_INPUT} ${inputBg} disabled:bg-[#F8F9FA] disabled:text-[#6B7280]`}
            />
          </td>
        )
      })}
      <td className="px-2 py-2 text-right font-medium text-[#1A1A2E] whitespace-nowrap">
        {fmtHours(totalHours)}
      </td>
      {!readOnly && (
        <td className="px-2 py-2 text-center">
          <button
            type="button"
            onClick={() => onDelete(codeId, totalHours)}
            aria-label="Delete row"
            className="w-8 h-8 rounded text-lg leading-none text-[#EF4444] hover:bg-red-50"
          >
            ×
          </button>
        </td>
      )}
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Trailing blank row — selecting a code here adds a new row.
// ---------------------------------------------------------------------------
function BlankRow({ billingCodes, colSpan, resetKey, onAdd }) {
  return (
    <tr className="border-t border-[#E5E7EB] bg-[#F8F9FA]">
      <td className="px-2 py-2">
        <CodeCombobox
          billingCodes={billingCodes}
          currentCode={null}
          disabled={false}
          resetKey={resetKey}
          onSelect={onAdd}
        />
      </td>
      <td colSpan={colSpan} className="px-2 py-2 text-xs text-[#6B7280]">
        Select a code to add a new row.
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main grid
// ---------------------------------------------------------------------------
const TimesheetGrid = forwardRef(function TimesheetGrid({ timesheet, onEntriesChange }, ref) {
  const [billingCodes, setBillingCodes] = useState([])
  const [entries, setEntries] = useState([])
  const [codeOrder, setCodeOrder] = useState([])
  const [pendingDescriptions, setPendingDescriptions] = useState({})
  const [loading, setLoading] = useState(true)
  const [blankKey, setBlankKey] = useState(0)

  const readOnly = !EDITABLE_STATUSES.includes(timesheet.status)
  const weekDays = useMemo(() => getWeekDays(fromISODate(timesheet.week_start_date)), [timesheet.week_start_date])

  async function reload() {
    const [codesRes, entriesRes] = await Promise.all([
      supabase
        .from('billing_codes')
        .select('code_id, code, description, code_type, is_billable, requires_description')
        .eq('is_active', true)
        .order('code', { ascending: true }),
      supabase
        .from('timesheet_entries')
        .select('*')
        .eq('timesheet_id', timesheet.timesheet_id)
        .order('created_at', { ascending: true }),
    ])
    if (codesRes.error) console.error('Error fetching billing codes:', codesRes.error)
    else setBillingCodes(codesRes.data ?? [])

    if (entriesRes.error) {
      console.error('Error fetching timesheet entries:', entriesRes.error)
    } else {
      const rows = entriesRes.data ?? []
      setEntries(rows)
      setCodeOrder((prev) => {
        const seen = new Set(prev)
        const next = [...prev]
        for (const e of rows) {
          if (!seen.has(e.code_id)) {
            seen.add(e.code_id)
            next.push(e.code_id)
          }
        }
        return next
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    setCodeOrder([])
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timesheet.timesheet_id])

  const codesById = useMemo(() => new Map(billingCodes.map((c) => [c.code_id, c])), [billingCodes])

  const entriesByCode = useMemo(() => {
    const map = new Map()
    for (const e of entries) {
      if (!map.has(e.code_id)) map.set(e.code_id, {})
      map.get(e.code_id)[e.entry_date] = e
    }
    return map
  }, [entries])

  async function commitHours(codeId, entryDateISO, rawValue, existingEntry) {
    const parsed = parseFloat(rawValue)
    const hours = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 24) : 0

    if (hours <= 0) {
      if (existingEntry) {
        const { error } = await supabase.from('timesheet_entries').delete().eq('entry_id', existingEntry.entry_id)
        if (error) console.error('Error deleting entry:', error)
        await reload()
        onEntriesChange?.()
      }
      return
    }

    if (existingEntry) {
      if (Number(existingEntry.hours) === hours) return
      const { error } = await supabase
        .from('timesheet_entries')
        .update({ hours })
        .eq('entry_id', existingEntry.entry_id)
      if (error) console.error('Error updating entry:', error)
    } else {
      const description = pendingDescriptions[codeId] || null
      const { error } = await supabase.from('timesheet_entries').insert([
        {
          timesheet_id: timesheet.timesheet_id,
          code_id: codeId,
          entry_date: entryDateISO,
          hours,
          description,
        },
      ])
      if (error) console.error('Error creating entry:', error)
    }
    await reload()
    onEntriesChange?.()
  }

  async function commitDescription(codeId, text) {
    const value = text.trim() || null
    setPendingDescriptions((prev) => ({ ...prev, [codeId]: value }))
    const hasEntries = entries.some((e) => e.code_id === codeId)
    if (!hasEntries) return
    const { error } = await supabase
      .from('timesheet_entries')
      .update({ description: value })
      .eq('timesheet_id', timesheet.timesheet_id)
      .eq('code_id', codeId)
    if (error) console.error('Error updating description:', error)
    await reload()
  }

  function addRow(codeId) {
    setCodeOrder((prev) => (prev.includes(codeId) ? prev : [...prev, codeId]))
    setBlankKey((k) => k + 1)
  }

  useImperativeHandle(ref, () => ({
    addRows(codeIds) {
      setCodeOrder((prev) => {
        const next = [...prev]
        for (const id of codeIds) {
          if (!next.includes(id)) next.push(id)
        }
        return next
      })
      setBlankKey((k) => k + 1)
    },
    hasAnyRows() {
      return codeOrder.length > 0
    },
  }))

  async function changeCode(oldCodeId, newCodeId) {
    if (codeOrder.includes(newCodeId)) return // avoid duplicate rows for the same code
    const hasEntries = entries.some((e) => e.code_id === oldCodeId)
    if (hasEntries) {
      const { error } = await supabase
        .from('timesheet_entries')
        .update({ code_id: newCodeId })
        .eq('timesheet_id', timesheet.timesheet_id)
        .eq('code_id', oldCodeId)
      if (error) console.error('Error changing row code:', error)
    }
    setCodeOrder((prev) => prev.map((c) => (c === oldCodeId ? newCodeId : c)))
    setPendingDescriptions((prev) => {
      const next = { ...prev }
      if (oldCodeId in next) {
        next[newCodeId] = next[oldCodeId]
        delete next[oldCodeId]
      }
      return next
    })
    await reload()
    onEntriesChange?.()
  }

  async function deleteRow(codeId, totalHours) {
    if (totalHours > 0 && !window.confirm('This row has hours logged. Delete anyway?')) return
    const { error } = await supabase
      .from('timesheet_entries')
      .delete()
      .eq('timesheet_id', timesheet.timesheet_id)
      .eq('code_id', codeId)
    if (error) console.error('Error deleting row:', error)
    setCodeOrder((prev) => prev.filter((c) => c !== codeId))
    await reload()
    onEntriesChange?.()
  }

  const dailyTotals = weekDays.map((day) => {
    const iso = toISODate(day)
    const dayEntries = entries.filter((e) => e.entry_date === iso)
    const total = sumHours(dayEntries)
    const billable = sumBillableHours(dayEntries)
    const pct = fixedUtilizationPct(billable, 8)
    return { total, billable, pct }
  })
  const weekTotal = sumHours(entries)
  const weekBillable = sumBillableHours(entries)
  const weekPct = fixedUtilizationPct(weekBillable, 40)

  const dayColCount = weekDays.length
  const blankColSpan = readOnly ? dayColCount + 2 : dayColCount + 2 // DESCRIPTION + days + TOTAL

  return (
    <div className="overflow-x-auto border border-[#E5E7EB] rounded bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-[#F3F4F6] text-[#6B7280] uppercase text-xs">
          <tr>
            <th className="px-2 py-3 text-left font-medium min-w-[10rem]">Code</th>
            <th className="px-2 py-3 text-left font-medium min-w-[10rem]">Description</th>
            {weekDays.map((day, i) => {
              const { dow, md } = formatDayHeader(day)
              const inMonth = isInBillingMonth(day, timesheet.billing_month)
              const isWeekend = i === 0 || i === 6
              const headerClass = !inMonth
                ? 'bg-[#E5E7EB] text-[#6B7280]/60'
                : isWeekend
                  ? 'bg-[#F8F9FA] text-[#9CA3AF]'
                  : ''
              return (
                <th key={md} className={`px-1 py-2 text-center font-medium whitespace-nowrap ${headerClass}`}>
                  <div>{dow}</div>
                  <div className="normal-case text-[10px]">{md}</div>
                </th>
              )
            })}
            <th className="px-2 py-3 text-right font-medium">Total</th>
            {!readOnly && <th className="px-2 py-3 text-center font-medium">Delete</th>}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={dayColCount + 4} className="px-3 py-4 text-center text-[#6B7280]">
                Loading timesheet…
              </td>
            </tr>
          )}

          {!loading &&
            codeOrder.map((codeId) => (
              <CodeRow
                key={codeId}
                codeId={codeId}
                billingCode={codesById.get(codeId)}
                billingCodes={billingCodes}
                entriesByDate={entriesByCode.get(codeId) ?? {}}
                weekDays={weekDays}
                billingMonth={timesheet.billing_month}
                readOnly={readOnly}
                pendingDescription={pendingDescriptions[codeId]}
                onCommitHours={commitHours}
                onCommitDescription={commitDescription}
                onChangeCode={changeCode}
                onDelete={deleteRow}
              />
            ))}

          {!loading && !readOnly && (
            <BlankRow billingCodes={billingCodes} colSpan={blankColSpan} resetKey={blankKey} onAdd={addRow} />
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[#1E3D2F] bg-[#F8F9FA] text-xs">
            <td className="px-2 py-1.5 text-right pr-2 font-semibold text-[#6B7280]" colSpan={2}>
              Total
            </td>
            {dailyTotals.map((d, i) => (
              <td
                key={i}
                className={`px-1 py-1.5 text-center text-[#1A1A2E] ${i === 0 || i === 6 ? 'bg-[#F8F9FA]' : ''}`}
              >
                {fmtHours(d.total)}
              </td>
            ))}
            <td className="px-2 py-1.5 text-right font-semibold text-[#1A1A2E]">{fmtHours(weekTotal)}</td>
            {!readOnly && <td className="px-2 py-1.5" />}
          </tr>
          <tr className="bg-[#F8F9FA] text-xs">
            <td className="px-2 py-1.5 text-right pr-2 font-semibold text-[#6B7280]" colSpan={2}>
              Billable
            </td>
            {dailyTotals.map((d, i) => (
              <td
                key={i}
                className={`px-1 py-1.5 text-center text-[#6B7280] ${i === 0 || i === 6 ? 'bg-[#F8F9FA]' : ''}`}
              >
                {fmtHours(d.billable)}
              </td>
            ))}
            <td className="px-2 py-1.5 text-right font-semibold text-[#1A1A2E]">{fmtHours(weekBillable)}</td>
            {!readOnly && <td className="px-2 py-1.5" />}
          </tr>
          <tr className="bg-[#F8F9FA] text-xs">
            <td className="px-2 py-2 text-right pr-2 font-semibold text-[#6B7280]" colSpan={2}>
              Util %
            </td>
            {dailyTotals.map((d, i) => (
              <td
                key={i}
                className={`px-1 py-2 text-center font-semibold ${i === 0 || i === 6 ? 'bg-[#F8F9FA]' : ''}`}
                style={{ color: fixedUtilizationColor(d.pct) }}
              >
                {Math.round(d.pct)}%
              </td>
            ))}
            <td className="px-2 py-2 text-right font-semibold" style={{ color: fixedUtilizationColor(weekPct) }}>
              {Math.round(weekPct)}%
            </td>
            {!readOnly && <td className="px-2 py-2" />}
          </tr>
        </tfoot>
      </table>

      <div className="flex flex-wrap items-center justify-end gap-6 px-4 py-3 border-t border-[#E5E7EB] bg-white text-sm">
        <div className="text-[#6B7280]">
          Week Total: <span className="font-semibold text-[#1A1A2E]">{fmtHours(weekTotal)} hrs</span>
        </div>
        <div className="text-[#6B7280]">
          Billable: <span className="font-semibold text-[#1A1A2E]">{fmtHours(weekBillable)} hrs</span>
        </div>
        <div className="text-[#6B7280]">
          Weekly Utilization:{' '}
          <span className="font-semibold" style={{ color: fixedUtilizationColor(weekPct) }}>
            {Math.round(weekPct)}%
          </span>
        </div>
      </div>
    </div>
  )
})

export default TimesheetGrid
