// Timesheet week helpers. Weeks always run Sunday -> Saturday, matching the
// DB CHECK constraints on timesheets (week_start_date DOW=0, week_end_date DOW=6,
// week_end_date = week_start_date + 6) and CLAUDE.md §6.5.

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + n)
  return d
}

export function getSundayOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - d.getDay())
  return d
}

export function getWeekDays(sunday) {
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i))
}

// Single timesheet record per week (Sunday -> Saturday). billing_month is
// whichever calendar month contains the majority of the 7 days (always
// resolves cleanly since 7 is odd). Days outside billing_month are greyed
// and disabled in the grid rather than split into a second record — the DB's
// UNIQUE(user_id, week_start_date) and week-span/DOW CHECK constraints don't
// allow a true two-record split. Returns an array for forward compatibility
// with a future migration that supports real split-week records.
export function getWeekRecords(sunday) {
  const days = getWeekDays(sunday)
  const counts = new Map()
  for (const d of days) {
    const key = `${d.getFullYear()}-${d.getMonth()}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let majorityKey = null
  let max = 0
  for (const [key, count] of counts) {
    if (count > max) {
      max = count
      majorityKey = key
    }
  }
  const [my, mm] = majorityKey.split('-').map(Number)
  const saturday = days[6]
  return [
    {
      week_start: toISODate(sunday),
      week_end: toISODate(saturday),
      billing_month: toISODate(new Date(my, mm, 1)),
    },
  ]
}

// Count Mon-Fri days between two dates, inclusive — used to estimate expected
// capacity hours for a period (utilization panel), since there is no
// per-employee schedule/calendar module yet.
export function countWeekdays(start, end) {
  let count = 0
  let d = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (d <= last) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count += 1
    d.setDate(d.getDate() + 1)
  }
  return count
}

export function isInBillingMonth(date, billingMonthISO) {
  const bm = fromISODate(billingMonthISO)
  return date.getFullYear() === bm.getFullYear() && date.getMonth() === bm.getMonth()
}

export function formatWeekLabel(sunday) {
  const saturday = addDays(sunday, 6)
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Week of ${fmt(sunday)} – ${fmt(saturday)}`
}

export function formatDayHeader(date) {
  const dow = DAY_LABELS[date.getDay()]
  const md = `${date.getMonth() + 1}/${date.getDate()}`
  return { dow, md }
}
