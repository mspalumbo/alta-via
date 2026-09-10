import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/layout/PageWrapper'
import TimesheetGrid from '../components/timesheets/TimesheetGrid'
import TimesheetList from '../components/timesheets/TimesheetList'
import UtilizationPanel from '../components/timesheets/UtilizationPanel'
import { addDays, getSundayOfWeek, getWeekRecords, formatWeekLabel, toISODate } from '../utils/weeks'

// Hardcoded test user — auth is not built yet. Real row: matt@vettapm.com
// (auth.users + mirrored public.users, Principal, 85% target).
// Replace with auth.uid() once login exists.
const TEST_USER_ID = '1683e702-bbee-426f-92fd-cad64b8cd731'

const STATUS_STYLES = {
  Draft: 'bg-[#6B7280]/10 text-[#6B7280]',
  Submitted: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  Approved: 'bg-[#10B981]/10 text-[#10B981]',
  Returned: 'bg-[#EF4444]/10 text-[#EF4444]',
  Locked: 'bg-[#8B5CF6]/10 text-[#8B5CF6]',
}

const BTN = 'min-h-[44px] px-3 py-2 rounded text-sm font-medium transition-colors'

export default function TimesheetsPage() {
  const [selectedSunday, setSelectedSunday] = useState(() => getSundayOfWeek(new Date()))
  const [timesheet, setTimesheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyDate, setCopyDate] = useState('')
  const [returnFormOpen, setReturnFormOpen] = useState(false)
  const [returnNotes, setReturnNotes] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [savedFlash, setSavedFlash] = useState(false)
  const gridRef = useRef(null)

  const loadWeek = useCallback(async (sunday) => {
    setLoading(true)
    const [record] = getWeekRecords(sunday)

    const { data: existing, error } = await supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .eq('week_start_date', record.week_start)
      .maybeSingle()
    if (error) console.error('Error fetching timesheet:', error)

    let ts = existing
    if (!ts) {
      const { data: created, error: insertError } = await supabase
        .from('timesheets')
        .insert([
          {
            user_id: TEST_USER_ID,
            week_start_date: record.week_start,
            week_end_date: record.week_end,
            billing_month: record.billing_month,
            status: 'Draft',
          },
        ])
        .select()
        .single()
      if (insertError) console.error('Error creating timesheet:', insertError)
      ts = created
    }
    setTimesheet(ts ?? null)
    setReturnFormOpen(false)
    setReturnNotes('')
    setLoading(false)
  }, [])

  useEffect(() => {
    loadWeek(selectedSunday)
  }, [selectedSunday, loadWeek])

  function goPrev() {
    setSelectedSunday((d) => addDays(d, -7))
  }
  function goNext() {
    setSelectedSunday((d) => addDays(d, 7))
  }
  function goThisWeek() {
    setSelectedSunday(getSundayOfWeek(new Date()))
  }
  function selectWeekFromList(sunday) {
    setSelectedSunday(sunday)
    setView('grid')
  }

  function bumpRefresh() {
    setRefreshToken((n) => n + 1)
  }

  function handleSave() {
    // Inline cells save on blur (CLAUDE.md L4) — force-commit whatever field
    // currently has focus, then confirm to the user nothing is pending.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  async function handleSubmit() {
    if (!timesheet) return
    const { count, error: countError } = await supabase
      .from('timesheet_entries')
      .select('entry_id', { count: 'exact', head: true })
      .eq('timesheet_id', timesheet.timesheet_id)
    if (countError) {
      console.error('Error checking entries before submit:', countError)
      return
    }
    if (!count) {
      alert('Add at least one entry with hours before submitting.')
      return
    }
    const { data, error } = await supabase
      .from('timesheets')
      .update({ status: 'Submitted', submitted_at: new Date().toISOString(), submitted_by: TEST_USER_ID })
      .eq('timesheet_id', timesheet.timesheet_id)
      .select()
      .single()
    if (error) console.error('Error submitting timesheet:', error)
    else setTimesheet(data)
  }

  // Simulated manager view — Approve/Return live on this page until the
  // approval queue (M8) exists. Approve here only locks status; it does not
  // populate rate_applied/amount or run the staffing re-forecast (those
  // require the rate-lookup and re-forecast machinery, out of scope for E1).
  async function handleApprove() {
    if (!timesheet) return
    const { data, error } = await supabase
      .from('timesheets')
      .update({ status: 'Approved', approved_at: new Date().toISOString(), approved_by: TEST_USER_ID })
      .eq('timesheet_id', timesheet.timesheet_id)
      .select()
      .single()
    if (error) console.error('Error approving timesheet:', error)
    else setTimesheet(data)
  }

  async function submitReturn() {
    if (!timesheet || !returnNotes.trim()) return
    const { data, error } = await supabase
      .from('timesheets')
      .update({
        status: 'Returned',
        returned_at: new Date().toISOString(),
        returned_by: TEST_USER_ID,
        return_notes: returnNotes.trim(),
      })
      .eq('timesheet_id', timesheet.timesheet_id)
      .select()
      .single()
    if (error) console.error('Error returning timesheet:', error)
    else {
      setTimesheet(data)
      setReturnFormOpen(false)
      setReturnNotes('')
    }
  }

  async function copyFromSunday(sourceSunday) {
    const sourceISO = toISODate(sourceSunday)
    const { data: sourceTs, error: sourceErr } = await supabase
      .from('timesheets')
      .select('timesheet_id')
      .eq('user_id', TEST_USER_ID)
      .eq('week_start_date', sourceISO)
      .maybeSingle()
    if (sourceErr) console.error('Error finding source week:', sourceErr)
    if (!sourceTs) {
      alert('No timesheet found for that week.')
      return
    }
    const { data: sourceEntries, error: entriesErr } = await supabase
      .from('timesheet_entries')
      .select('code_id')
      .eq('timesheet_id', sourceTs.timesheet_id)
    if (entriesErr) console.error('Error reading source entries:', entriesErr)
    const codeIds = [...new Set((sourceEntries ?? []).map((e) => e.code_id))]
    if (codeIds.length === 0) {
      alert('That week has no codes to copy.')
      return
    }
    if (gridRef.current?.hasAnyRows() && !window.confirm('Add these codes to the current timesheet?')) return
    gridRef.current?.addRows(codeIds)
    setCopyOpen(false)
  }

  function handleCopyPrevious() {
    copyFromSunday(addDays(selectedSunday, -7))
  }

  function handleCopySelected() {
    if (!copyDate) return
    copyFromSunday(getSundayOfWeek(new Date(`${copyDate}T00:00:00`)))
  }

  const editable = timesheet && ['Draft', 'Returned'].includes(timesheet.status)
  const canSubmit = editable
  const canApprove = timesheet?.status === 'Submitted'

  return (
    <PageWrapper breadcrumb="Timecards">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl font-bold text-[#1A1A2E]">Timecards</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`${BTN} ${view === 'grid' ? 'bg-[#1E3D2F] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={`${BTN} ${view === 'list' ? 'bg-[#1E3D2F] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
              >
                List
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous week"
                className={`${BTN} text-[#6B7280] hover:bg-[#F3F4F6]`}
              >
                ←
              </button>
              <button type="button" onClick={goThisWeek} className="text-sm font-medium text-[#1A1A2E] px-2">
                {formatWeekLabel(selectedSunday)}
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next week"
                className={`${BTN} text-[#6B7280] hover:bg-[#F3F4F6]`}
              >
                →
              </button>
              {timesheet && (
                <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_STYLES[timesheet.status]}`}>
                  {timesheet.status}
                </span>
              )}
              {savedFlash && <span className="text-xs text-[#10B981] font-medium">Saved</span>}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCopyOpen((v) => !v)}
                  disabled={!editable}
                  className={`${BTN} border border-[#E5E7EB] text-[#1A1A2E] hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Copy ▾
                </button>
                {copyOpen && editable && (
                  <div className="absolute right-0 z-20 mt-1 w-64 bg-white border border-[#E5E7EB] rounded shadow-lg p-2">
                    <button
                      type="button"
                      onClick={handleCopyPrevious}
                      className="block w-full text-left px-2 py-2 text-sm hover:bg-[#F8F9FA] rounded text-[#1A1A2E]"
                    >
                      Copy Previous Week
                    </button>
                    <div className="border-t border-[#E5E7EB] my-2" />
                    <div className="px-2 text-xs text-[#6B7280] mb-1">Select Week</div>
                    <div className="flex items-center gap-2 px-2 pb-1">
                      <input
                        type="date"
                        value={copyDate}
                        onChange={(e) => setCopyDate(e.target.value)}
                        className="flex-1 border border-[#E5E7EB] rounded px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleCopySelected}
                        disabled={!copyDate}
                        className="text-sm font-medium text-[#F2903A] hover:underline disabled:opacity-40"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleSave}
                className={`${BTN} border border-[#E5E7EB] text-[#1A1A2E] hover:bg-[#F3F4F6]`}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`${BTN} bg-[#F2903A] text-white hover:bg-[#d97b28] disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {view === 'list' && (
          <TimesheetList userId={TEST_USER_ID} selectedSunday={selectedSunday} onSelectWeek={selectWeekFromList} />
        )}

        {view === 'grid' && (
          <>
            {timesheet?.status === 'Submitted' && (
              <div className="border border-[#F59E0B]/40 bg-[#F59E0B]/10 rounded p-3 text-sm text-[#1A1A2E] flex items-center justify-between flex-wrap gap-2">
                <span>Submitted — awaiting approval.</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApprove}
                    className={`${BTN} bg-[#10B981] text-white hover:opacity-90`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnFormOpen((v) => !v)}
                    className={`${BTN} bg-[#EF4444] text-white hover:opacity-90`}
                  >
                    Return
                  </button>
                </div>
              </div>
            )}

            {returnFormOpen && canApprove && (
              <div className="border border-[#E5E7EB] rounded p-3 bg-white flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#6B7280] uppercase">Return Notes</label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={2}
                  className="border border-[#E5E7EB] rounded px-2 py-1 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#F2903A]"
                  placeholder="Explain what needs correction…"
                />
                <div>
                  <button
                    type="button"
                    onClick={submitReturn}
                    disabled={!returnNotes.trim()}
                    className={`${BTN} bg-[#EF4444] text-white hover:opacity-90 disabled:opacity-40`}
                  >
                    Confirm Return
                  </button>
                </div>
              </div>
            )}

            {timesheet?.status === 'Returned' && timesheet.return_notes && (
              <div className="border border-[#EF4444]/40 bg-[#EF4444]/10 rounded p-3 text-sm text-[#1A1A2E]">
                <span className="font-semibold">Returned: </span>
                {timesheet.return_notes}
              </div>
            )}

            {loading && <div className="text-sm text-[#6B7280]">Loading timesheet…</div>}

            {!loading && timesheet && (
              <TimesheetGrid ref={gridRef} timesheet={timesheet} onEntriesChange={bumpRefresh} />
            )}

            <UtilizationPanel userId={TEST_USER_ID} refreshToken={refreshToken} />
          </>
        )}
      </div>
    </PageWrapper>
  )
}
