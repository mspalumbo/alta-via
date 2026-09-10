// Shared utilization math for Timecards (per CLAUDE.md L3 — extract once
// used in more than one place; TimesheetGrid and UtilizationPanel both need this).

export function sumHours(entries) {
  return entries.reduce((s, e) => s + Number(e.hours || 0), 0)
}

export function sumBillableHours(entries) {
  return entries.filter((e) => e.is_billable).reduce((s, e) => s + Number(e.hours || 0), 0)
}

// Fixed-capacity utilization (TimesheetGrid daily/weekly footer):
// billable hours against a flat 8hr/day (or 40hr/week) capacity.
export function fixedUtilizationPct(billableHours, capacityHours) {
  if (!capacityHours) return 0
  return (billableHours / capacityHours) * 100
}

export function fixedUtilizationColor(pct) {
  if (pct >= 80) return '#10B981'
  if (pct >= 50) return '#F59E0B'
  return '#EF4444'
}

// Target-relative utilization (UtilizationPanel): compares actual % against
// the employee's utilization_target_pct.
export function targetUtilizationColor(pct, targetPct) {
  if (pct >= targetPct) return '#10B981'
  if (pct >= targetPct * 0.6) return '#F59E0B'
  return '#EF4444'
}
