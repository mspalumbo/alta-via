import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { addDays, getSundayOfWeek, toISODate, countWeekdays } from '../../utils/weeks'
import { sumHours, sumBillableHours, targetUtilizationColor } from '../../utils/utilization'

// utilization_target_pct lives on public.users, but that table has no anon
// SELECT policy yet (authenticated-only in 004_grants.sql) — hardcode the
// default per spec until auth ships and the panel can read the real column.
const DEFAULT_TARGET_PCT = 85

function computeMetric(entries, start, end, capacityHours) {
  const startISO = toISODate(start)
  const endISO = toISODate(end)
  const inRange = entries.filter((e) => e.entry_date >= startISO && e.entry_date <= endISO)
  const hours = sumHours(inRange)
  const billable = sumBillableHours(inRange)
  const pct = capacityHours > 0 ? (billable / capacityHours) * 100 : 0
  return { hours, billable, pct }
}

function MetricCard({ label, metric, targetPct }) {
  const color = targetUtilizationColor(metric.pct, targetPct)
  return (
    <div className="border border-[#E5E7EB] rounded bg-white p-3 min-w-[10rem]">
      <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">{label}</div>
      <div className="text-lg font-bold" style={{ color }}>
        {Math.round(metric.pct)}%
      </div>
      <div className="text-xs text-[#6B7280] mt-1">
        {metric.billable.toFixed(1)} billable / {metric.hours.toFixed(1)} total hrs
      </div>
    </div>
  )
}

export default function UtilizationPanel({ userId, refreshToken }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const yearStart = new Date(new Date().getFullYear(), 0, 1)
      const { data, error } = await supabase
        .from('timesheet_entries')
        .select('hours, is_billable, entry_date, timesheets!inner(user_id)')
        .eq('timesheets.user_id', userId)
        .gte('entry_date', toISODate(yearStart))
      if (cancelled) return
      if (error) console.error('Error fetching utilization data:', error)
      else setEntries(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [userId, refreshToken])

  const metrics = useMemo(() => {
    const today = new Date()
    const thisWeekStart = getSundayOfWeek(today)
    const thisWeekEnd = addDays(thisWeekStart, 6)
    const lastWeekStart = addDays(thisWeekStart, -7)
    const lastWeekEnd = addDays(thisWeekStart, -1)
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const ytdStart = new Date(today.getFullYear(), 0, 1)

    return {
      thisWeek: computeMetric(entries, thisWeekStart, thisWeekEnd, 40),
      lastWeek: computeMetric(entries, lastWeekStart, lastWeekEnd, 40),
      thisMonth: computeMetric(entries, thisMonthStart, today, countWeekdays(thisMonthStart, today) * 8),
      ytd: computeMetric(entries, ytdStart, today, countWeekdays(ytdStart, today) * 8),
    }
  }, [entries])

  return (
    <div className="border border-[#E5E7EB] rounded bg-[#F8F9FA] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
          Utilization
        </div>
        <div className="text-xs text-[#6B7280]">
          Target: <span className="font-semibold text-[#1A1A2E]">{DEFAULT_TARGET_PCT}%</span>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-[#6B7280]">Loading utilization…</div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <MetricCard label="This Week" metric={metrics.thisWeek} targetPct={DEFAULT_TARGET_PCT} />
          <MetricCard label="Last Week" metric={metrics.lastWeek} targetPct={DEFAULT_TARGET_PCT} />
          <MetricCard label="This Month" metric={metrics.thisMonth} targetPct={DEFAULT_TARGET_PCT} />
          <MetricCard label="YTD" metric={metrics.ytd} targetPct={DEFAULT_TARGET_PCT} />
        </div>
      )}
      <div className="text-[11px] text-[#6B7280] mt-3">
        Based on actual approved and draft hours logged. Utilization projection (E4) will feed forward-looking pace once built.
      </div>
    </div>
  )
}
