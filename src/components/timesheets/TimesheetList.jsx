import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { addDays, getSundayOfWeek, toISODate, formatWeekLabel } from '../../utils/weeks'

const STATUS_STYLES = {
  Draft: 'bg-[#6B7280]/10 text-[#6B7280]',
  Submitted: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  Approved: 'bg-[#10B981]/10 text-[#10B981]',
  Returned: 'bg-[#EF4444]/10 text-[#EF4444]',
  Locked: 'bg-[#8B5CF6]/10 text-[#8B5CF6]',
  Missing: 'bg-[#EF4444]/10 text-[#EF4444]',
  'Not Started': 'bg-[#E5E7EB] text-[#6B7280]',
}

const WEEKS_BACK = 8
const WEEKS_FORWARD = 3

export default function TimesheetList({ userId, selectedSunday, onSelectWeek }) {
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)

  const weekSundays = useMemo(() => {
    const currentSunday = getSundayOfWeek(new Date())
    const list = []
    for (let i = WEEKS_BACK; i >= -WEEKS_FORWARD; i -= 1) {
      list.push(addDays(currentSunday, -7 * i))
    }
    return list
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const startISO = toISODate(weekSundays[0])
      const endISO = toISODate(weekSundays[weekSundays.length - 1])
      const { data, error } = await supabase
        .from('timesheets')
        .select('timesheet_id, week_start_date, status')
        .eq('user_id', userId)
        .gte('week_start_date', startISO)
        .lte('week_start_date', endISO)
      if (cancelled) return
      if (error) console.error('Error fetching timesheet list:', error)
      else setTimesheets(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [userId, weekSundays])

  const byWeekStart = useMemo(() => {
    const map = new Map()
    for (const t of timesheets) map.set(t.week_start_date, t)
    return map
  }, [timesheets])

  const today = toISODate(new Date())

  return (
    <div className="border border-[#E5E7EB] rounded bg-white divide-y divide-[#E5E7EB]">
      {loading && <div className="px-4 py-3 text-sm text-[#6B7280]">Loading weeks…</div>}
      {!loading &&
        weekSundays.map((sunday) => {
          const iso = toISODate(sunday)
          const record = byWeekStart.get(iso)
          const isPast = toISODate(addDays(sunday, 6)) < today
          const status = record?.status ?? (isPast ? 'Missing' : 'Not Started')
          const isSelected = iso === toISODate(selectedSunday)
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectWeek(sunday)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-[#F8F9FA] min-h-[44px] ${
                isSelected ? 'bg-[#F2903A]/5' : ''
              }`}
            >
              <span className="text-[#1A1A2E]">{formatWeekLabel(sunday)}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_STYLES[status]}`}>
                {status}
              </span>
            </button>
          )
        })}
    </div>
  )
}
