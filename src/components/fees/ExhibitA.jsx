import { useEffect, useRef } from 'react'

// Category order — mirrors FeeLineItems.jsx
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

function formatCurrency(n) {
  if (!n) return '$0.00'
  return (
    '$' +
    Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

function formatUnit(u) {
  if (u === 'per-week') return 'Per Week'
  if (u === 'per-month') return 'Per Month'
  return 'Total'
}

function getPhase(item) {
  if (item.scope_library?.phase) return item.scope_library.phase
  const cat = item.scope_library?.category || ''
  const preconCats = [
    'A-Predevelopment',
    'B-Design-Consultant-Selection',
    'C-Contractor-Selection',
    'D-Preconstruction-Coordination',
    'E-Other-Vendor-Procurement',
  ]
  if (preconCats.includes(cat)) return 'Preconstruction'
  if (cat) return 'Construction'
  return 'Preconstruction' // custom items default to Preconstruction
}

// Mirrors catLabel in FeeLineItems.jsx: 'A-Predevelopment' -> 'A - Predevelopment', 'Custom' -> 'Custom'
function catLabel(cat) {
  const [letter, ...rest] = String(cat).split('-')
  return rest.length ? `${letter} - ${rest.join(' ')}` : letter
}

const num = (v) => Number(v ?? 0)
const sum = (arr, key) => arr.reduce((s, i) => s + num(i[key]), 0)

const TABLE_HEAD = `
    <thead>
      <tr>
        <th>Activity</th>
        <th class="text-right">Hrs/Unit</th>
        <th class="text-right">Unit</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Total Hours</th>
      </tr>
    </thead>`

const COLGROUP = `
    <colgroup>
      <col class="activity">
      <col class="hrs">
      <col class="unit">
      <col class="qty">
      <col class="total-hrs">
    </colgroup>`

function itemRow(item) {
  const activity =
    item.scope_library?.activity_name || item.custom_description || '—'
  return `
        <tr>
          <td>${activity}</td>
          <td class="num">${item.hours_per_unit ?? 0}</td>
          <td class="num">${formatUnit(item.unit)}</td>
          <td class="num">${item.quantity ?? 0}</td>
          <td class="num">${item.total_hours ?? 0}</td>
        </tr>`
}

// One <h3> + <table> per non-empty category, following CATEGORY_ORDER.
function categoryTables(items) {
  return CATEGORY_ORDER.map((cat) => {
    const rows = items.filter((i) => i.scope_library?.category === cat)
    if (rows.length === 0) return ''
    return `
    <h3>${catLabel(cat)}</h3>
    <table>${COLGROUP}${TABLE_HEAD}
      <tbody>${rows.map(itemRow).join('')}
      </tbody>
    </table>`
  }).join('')
}

function phaseFee(label, totalHrs, totalFee) {
  return `
    <div class="phase-fee">
      ${label} Total: ${totalHrs.toFixed(1)} hrs &nbsp;|&nbsp; ${formatCurrency(totalFee)}
    </div>`
}

function buildHTML(fee, lineItems) {
  const items = Array.isArray(lineItems) ? lineItems : []

  // Scoped items are bucketed by phase; custom items (no scope_item_id) go
  // only to Additional Services so nothing is counted twice in the grand total.
  const preconItems = items.filter(
    (i) => i.scope_item_id && getPhase(i) === 'Preconstruction',
  )
  const conItems = items.filter(
    (i) => i.scope_item_id && getPhase(i) === 'Construction',
  )
  const customItems = items.filter((i) => !i.scope_item_id)

  const preconTotalHrs = sum(preconItems, 'total_hours')
  const preconTotalFee = sum(preconItems, 'line_total')
  const conTotalHrs = sum(conItems, 'total_hours')
  const conTotalFee = sum(conItems, 'line_total')
  const customTotalHrs = sum(customItems, 'total_hours')
  const customTotalFee = sum(customItems, 'line_total')
  const grandTotal = preconTotalFee + conTotalFee + customTotalFee

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  let preconHtml = ''
  if (preconItems.length > 0) {
    const durationNote = fee.preconstruction_duration
      ? `
    <p class="duration-note">Duration: ${fee.preconstruction_duration} ${fee.preconstruction_duration_unit || 'Months'}</p>`
      : ''
    preconHtml = `
  <h2>Preconstruction Services</h2>${durationNote}
${categoryTables(preconItems)}
${phaseFee('Preconstruction', preconTotalHrs, preconTotalFee)}`
  }

  let conHtml = ''
  if (conItems.length > 0) {
    const durationNote = fee.construction_duration
      ? `
    <p class="duration-note">Duration: ${fee.construction_duration} ${fee.construction_duration_unit || 'Months'}</p>`
      : ''
    conHtml = `
  <h2>Construction Services</h2>${durationNote}
${categoryTables(conItems)}
${phaseFee('Construction', conTotalHrs, conTotalFee)}`
  }

  let customHtml = ''
  if (customItems.length > 0) {
    customHtml = `
  <h2>Additional Services</h2>
    <table>${COLGROUP}${TABLE_HEAD}
      <tbody>${customItems.map(itemRow).join('')}
      </tbody>
    </table>
${phaseFee('Additional Services', customTotalHrs, customTotalFee)}`
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Exhibit A — Scope of Services</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a2e; margin: 0.65in; }
    h1 { font-size: 18pt; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
    h2 { font-size: 13pt; font-weight: bold; margin-top: 16px; margin-bottom: 6px; border-bottom: 2px solid #1E3D2F; padding-bottom: 4px; color: #1a1a2e; }
    h3 { font-size: 10pt; font-weight: bold; margin-top: 8px; margin-bottom: 2px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
    table { table-layout: fixed; width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    col.activity { width: 55%; }
    col.hrs { width: 10%; }
    col.unit { width: 12%; }
    col.qty { width: 10%; }
    col.total-hrs { width: 13%; }
    th { font-size: 9pt; font-weight: bold; text-align: left; padding: 3px 6px; border-bottom: 2px solid #1E3D2F; color: #1a1a2e; }
    th.text-right { text-align: right; }
    td { font-size: 10pt; padding: 3px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    td.text-right { text-align: right; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; margin-bottom: 10px; font-size: 10pt; }
    .meta-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; color: #777; }
    .meta-value { font-weight: 500; }
    .divider { border: none; border-top: 1px solid #ccc; margin: 10px 0; }
    .phase-fee { font-size: 11pt; font-weight: bold; text-align: right; padding: 4px 0; border-top: 2px solid #1E3D2F; margin-top: 2px; }
    .grand-total { font-size: 14pt; font-weight: bold; text-align: right; padding: 8px 0; border-top: 3px solid #1E3D2F; margin-top: 16px; }
    .duration-note { font-size: 9pt; color: #555; margin-bottom: 4px; font-style: italic; }
    .exhibit-label { font-size: 9pt; color: #777; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
    @media screen {
      body { max-width: 8.5in; margin: 0.5in auto; }
    }
    @media print {
      @page { size: portrait; margin: 0.5in; }
      body { margin: 0.5in; }
      h2 { page-break-before: auto; }
    }
  </style>
</head>
<body>
  <p class="exhibit-label">Exhibit A</p>
  <h1>Scope of Services</h1>
  <hr class="divider">

  <div class="meta-grid">
    <div><div class="meta-label">Project</div><div class="meta-value">${fee.projects?.project_name || '—'}</div></div>
    <div><div class="meta-label">Project Number</div><div class="meta-value">${fee.projects?.project_number || '—'}</div></div>
    <div><div class="meta-label">Fee Name</div><div class="meta-value">${fee.fee_name || '—'}</div></div>
    <div><div class="meta-label">Date</div><div class="meta-value">${dateStr}</div></div>
  </div>

  <hr class="divider">
${preconHtml}
${conHtml}
${customHtml}

  <div class="grand-total">
    Total Contracted Fee: ${formatCurrency(grandTotal)}
  </div>
</body>
</html>`
}

export default function ExhibitA({ fee, lineItems, onClose }) {
  const opened = useRef(false)

  useEffect(() => {
    // Guard against StrictMode's double mount in development.
    if (opened.current) return
    opened.current = true

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(buildHTML(fee, lineItems))
      win.document.close()
      win.focus()
    }
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
