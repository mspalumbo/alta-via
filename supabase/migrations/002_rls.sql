-- ============================================================
-- Alta•Via — Migration 002: Row Level Security
-- Run AFTER 001_schema.sql
-- ============================================================


-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE firm_settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_codes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_library            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards               ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_overrides           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_records              ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_line_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_discounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_projections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE projection_monthly_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_collection_log   ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- HELPER FUNCTIONS
-- SECURITY DEFINER prevents RLS recursion when querying public.users
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role_enum AS $$
  SELECT role FROM public.users WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_principal()
RETURNS boolean AS $$
  SELECT get_my_role() = 'Principal'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_billing()
RETURNS boolean AS $$
  SELECT get_my_role() = 'Admin'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_pm_or_above()
RETURNS boolean AS $$
  SELECT get_my_role() IN ('Principal', 'Sr-PM', 'PM')
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns true if the current user is an active member of the given project
CREATE OR REPLACE FUNCTION is_assigned_to_project(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_team_assignments
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND is_active = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================
-- firm_settings
-- All authenticated users read. Principal writes.
-- ============================================================

CREATE POLICY "firm_settings_select"
  ON firm_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "firm_settings_modify"
  ON firm_settings FOR ALL TO authenticated
  USING (is_principal())
  WITH CHECK (is_principal());


-- ============================================================
-- public.users
-- Users see their own record. Principal sees all. Principal manages all.
-- ============================================================

CREATE POLICY "users_select"
  ON public.users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_principal());

CREATE POLICY "users_insert"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_principal());

CREATE POLICY "users_update"
  ON public.users FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_principal())
  WITH CHECK (user_id = auth.uid() OR is_principal());


-- ============================================================
-- clients
-- All authenticated read (clients are shared firm data).
-- Principal, Sr-PM, PM, and Admin can write.
-- No DELETE — soft delete only via is_active flag.
-- ============================================================

CREATE POLICY "clients_select"
  ON clients FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "clients_insert"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (is_pm_or_above() OR is_admin_billing());

CREATE POLICY "clients_update"
  ON clients FOR UPDATE TO authenticated
  USING (is_pm_or_above() OR is_admin_billing())
  WITH CHECK (is_pm_or_above() OR is_admin_billing());


-- ============================================================
-- client_contacts — same access pattern as clients
-- ============================================================

CREATE POLICY "client_contacts_select"
  ON client_contacts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "client_contacts_insert"
  ON client_contacts FOR INSERT TO authenticated
  WITH CHECK (is_pm_or_above() OR is_admin_billing());

CREATE POLICY "client_contacts_update"
  ON client_contacts FOR UPDATE TO authenticated
  USING (is_pm_or_above() OR is_admin_billing())
  WITH CHECK (is_pm_or_above() OR is_admin_billing());


-- ============================================================
-- projects
-- Principal and Admin see all.
-- PM/Coordinator sees assigned projects and projects they lead.
-- Principal and assigned PM write.
-- ============================================================

CREATE POLICY "projects_select"
  ON projects FOR SELECT TO authenticated
  USING (
    is_principal()
    OR is_admin_billing()
    OR principal_in_charge = auth.uid()
    OR project_manager = auth.uid()
    OR is_assigned_to_project(project_id)
  );

CREATE POLICY "projects_insert"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (is_pm_or_above());

CREATE POLICY "projects_update"
  ON projects FOR UPDATE TO authenticated
  USING (
    is_principal()
    OR principal_in_charge = auth.uid()
    OR project_manager = auth.uid()
  )
  WITH CHECK (
    is_principal()
    OR principal_in_charge = auth.uid()
    OR project_manager = auth.uid()
  );


-- ============================================================
-- project_team_assignments
-- Team members see assignments for their own projects.
-- Principal manages all assignments.
-- ============================================================

CREATE POLICY "pta_select"
  ON project_team_assignments FOR SELECT TO authenticated
  USING (
    is_principal()
    OR user_id = auth.uid()
    OR is_assigned_to_project(project_id)
  );

CREATE POLICY "pta_insert"
  ON project_team_assignments FOR INSERT TO authenticated
  WITH CHECK (is_principal());

CREATE POLICY "pta_update"
  ON project_team_assignments FOR UPDATE TO authenticated
  USING (is_principal())
  WITH CHECK (is_principal());

CREATE POLICY "pta_delete"
  ON project_team_assignments FOR DELETE TO authenticated
  USING (is_principal());


-- ============================================================
-- billing_codes
-- All authenticated read (needed for timesheet entry).
-- Principal and Admin manage.
-- ============================================================

CREATE POLICY "billing_codes_select"
  ON billing_codes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "billing_codes_insert"
  ON billing_codes FOR INSERT TO authenticated
  WITH CHECK (is_principal() OR is_admin_billing());

CREATE POLICY "billing_codes_update"
  ON billing_codes FOR UPDATE TO authenticated
  USING (is_principal() OR is_admin_billing())
  WITH CHECK (is_principal() OR is_admin_billing());


-- ============================================================
-- scope_library
-- All authenticated read (needed for fee development).
-- Principal manages.
-- ============================================================

CREATE POLICY "scope_library_select"
  ON scope_library FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "scope_library_modify"
  ON scope_library FOR ALL TO authenticated
  USING (is_principal())
  WITH CHECK (is_principal());


-- ============================================================
-- rate_cards
-- Principal sees all columns (including internal_cost_rate).
-- Others may see their own person-specific rate and all role-based rates
-- (internal_cost_rate column must be hidden at the API/app layer for non-Principals).
-- Only Principal manages.
-- ============================================================

CREATE POLICY "rate_cards_select"
  ON rate_cards FOR SELECT TO authenticated
  USING (
    is_principal()
    OR user_id = auth.uid()
    OR rate_type = 'Role-Based'
  );

CREATE POLICY "rate_cards_modify"
  ON rate_cards FOR ALL TO authenticated
  USING (is_principal())
  WITH CHECK (is_principal());


-- ============================================================
-- rate_overrides
-- Project team members see overrides for their projects.
-- Principal manages all.
-- ============================================================

CREATE POLICY "rate_overrides_select"
  ON rate_overrides FOR SELECT TO authenticated
  USING (
    is_principal()
    OR is_assigned_to_project(project_id)
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.project_id = rate_overrides.project_id
        AND (p.principal_in_charge = auth.uid() OR p.project_manager = auth.uid())
    )
  );

CREATE POLICY "rate_overrides_modify"
  ON rate_overrides FOR ALL TO authenticated
  USING (is_principal())
  WITH CHECK (is_principal());


-- ============================================================
-- fee_records
-- Visible to project team (read); Principal + assigned PM write.
-- ============================================================

CREATE POLICY "fee_records_select"
  ON fee_records FOR SELECT TO authenticated
  USING (
    is_principal()
    OR is_assigned_to_project(project_id)
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.project_id = fee_records.project_id
        AND (p.principal_in_charge = auth.uid() OR p.project_manager = auth.uid())
    )
  );

CREATE POLICY "fee_records_insert"
  ON fee_records FOR INSERT TO authenticated
  WITH CHECK (is_pm_or_above());

CREATE POLICY "fee_records_update"
  ON fee_records FOR UPDATE TO authenticated
  USING (
    is_principal()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.project_id = fee_records.project_id
        AND p.project_manager = auth.uid()
    )
  )
  WITH CHECK (
    is_principal()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.project_id = fee_records.project_id
        AND p.project_manager = auth.uid()
    )
  );


-- ============================================================
-- fee_line_items
-- Readable by project team. Writable only on non-executed fees by Principal/PM.
-- ============================================================

CREATE POLICY "fee_line_items_select"
  ON fee_line_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fee_records fr
      JOIN projects p ON p.project_id = fr.project_id
      WHERE fr.fee_id = fee_line_items.fee_id
        AND (
          is_principal()
          OR p.principal_in_charge = auth.uid()
          OR p.project_manager = auth.uid()
          OR is_assigned_to_project(p.project_id)
        )
    )
  );

CREATE POLICY "fee_line_items_insert"
  ON fee_line_items FOR INSERT TO authenticated
  WITH CHECK (
    is_pm_or_above()
    AND EXISTS (
      SELECT 1 FROM fee_records fr
      WHERE fr.fee_id = fee_line_items.fee_id
        AND fr.executed_at IS NULL
    )
  );

CREATE POLICY "fee_line_items_update"
  ON fee_line_items FOR UPDATE TO authenticated
  USING (
    (is_principal() OR is_pm_or_above())
    AND EXISTS (
      SELECT 1 FROM fee_records fr
      WHERE fr.fee_id = fee_line_items.fee_id
        AND fr.executed_at IS NULL
    )
  );

CREATE POLICY "fee_line_items_delete"
  ON fee_line_items FOR DELETE TO authenticated
  USING (
    (is_principal() OR is_pm_or_above())
    AND EXISTS (
      SELECT 1 FROM fee_records fr
      WHERE fr.fee_id = fee_line_items.fee_id
        AND fr.executed_at IS NULL
    )
  );


-- ============================================================
-- fee_discounts
-- Readable by project team. Principal manages (discounts are financially sensitive).
-- ============================================================

CREATE POLICY "fee_discounts_select"
  ON fee_discounts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fee_records fr
      JOIN projects p ON p.project_id = fr.project_id
      WHERE fr.fee_id = fee_discounts.fee_id
        AND (
          is_principal()
          OR p.project_manager = auth.uid()
          OR is_assigned_to_project(p.project_id)
        )
    )
  );

CREATE POLICY "fee_discounts_modify"
  ON fee_discounts FOR ALL TO authenticated
  USING (is_principal())
  WITH CHECK (is_principal());


-- ============================================================
-- staffing_projections
-- Project team reads. Principal + PM write.
-- ============================================================

CREATE POLICY "staffing_projections_select"
  ON staffing_projections FOR SELECT TO authenticated
  USING (
    is_principal()
    OR is_assigned_to_project(project_id)
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.project_id = staffing_projections.project_id
        AND (p.principal_in_charge = auth.uid() OR p.project_manager = auth.uid())
    )
  );

CREATE POLICY "staffing_projections_insert"
  ON staffing_projections FOR INSERT TO authenticated
  WITH CHECK (is_pm_or_above());

CREATE POLICY "staffing_projections_update"
  ON staffing_projections FOR UPDATE TO authenticated
  USING (is_principal() OR is_pm_or_above())
  WITH CHECK (is_principal() OR is_pm_or_above());


-- ============================================================
-- projection_monthly_detail
-- Access mirrors parent staffing_projections.
-- ============================================================

CREATE POLICY "pmd_select"
  ON projection_monthly_detail FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffing_projections sp
      WHERE sp.projection_id = projection_monthly_detail.projection_id
        AND (
          is_principal()
          OR is_assigned_to_project(sp.project_id)
          OR EXISTS (
            SELECT 1 FROM projects p
            WHERE p.project_id = sp.project_id
              AND (p.principal_in_charge = auth.uid() OR p.project_manager = auth.uid())
          )
        )
    )
  );

CREATE POLICY "pmd_insert"
  ON projection_monthly_detail FOR INSERT TO authenticated
  WITH CHECK (is_pm_or_above());

CREATE POLICY "pmd_update"
  ON projection_monthly_detail FOR UPDATE TO authenticated
  USING (is_principal() OR is_pm_or_above())
  WITH CHECK (is_principal() OR is_pm_or_above());


-- ============================================================
-- timesheets
-- Employees see and manage their own Draft/Returned timesheets.
-- Principal and PM+ can see all timesheets (for approval workflow).
-- Principal can update any timesheet (for unlock).
-- ============================================================

CREATE POLICY "timesheets_select"
  ON timesheets FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_principal()
    OR is_pm_or_above()
  );

CREATE POLICY "timesheets_insert"
  ON timesheets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "timesheets_update"
  ON timesheets FOR UPDATE TO authenticated
  USING (
    -- Employee edits own Draft or Returned
    (user_id = auth.uid() AND status IN ('Draft', 'Returned'))
    -- Principal unlocks any timesheet
    OR is_principal()
    -- PM/Sr-PM approves or returns
    OR is_pm_or_above()
  )
  WITH CHECK (
    (user_id = auth.uid() AND status IN ('Draft', 'Returned'))
    OR is_principal()
    OR is_pm_or_above()
  );


-- ============================================================
-- timesheet_entries
-- Employee sees and edits own entries (only when timesheet is Draft/Returned).
-- Principal and PM+ see all entries.
-- ============================================================

CREATE POLICY "timesheet_entries_select"
  ON timesheet_entries FOR SELECT TO authenticated
  USING (
    is_principal()
    OR is_pm_or_above()
    OR EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.timesheet_id = timesheet_entries.timesheet_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "timesheet_entries_insert"
  ON timesheet_entries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.timesheet_id = timesheet_entries.timesheet_id
        AND t.user_id = auth.uid()
        AND t.status IN ('Draft', 'Returned')
    )
  );

CREATE POLICY "timesheet_entries_update"
  ON timesheet_entries FOR UPDATE TO authenticated
  USING (
    is_principal()
    OR EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.timesheet_id = timesheet_entries.timesheet_id
        AND t.user_id = auth.uid()
        AND t.status IN ('Draft', 'Returned')
    )
  )
  WITH CHECK (
    is_principal()
    OR EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.timesheet_id = timesheet_entries.timesheet_id
        AND t.user_id = auth.uid()
        AND t.status IN ('Draft', 'Returned')
    )
  );

CREATE POLICY "timesheet_entries_delete"
  ON timesheet_entries FOR DELETE TO authenticated
  USING (
    is_principal()
    OR EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.timesheet_id = timesheet_entries.timesheet_id
        AND t.user_id = auth.uid()
        AND t.status IN ('Draft', 'Returned')
    )
  );


-- ============================================================
-- invoices
-- Principal and Admin see all. PM sees invoices for their projects.
-- Principal and Admin write.
-- ============================================================

CREATE POLICY "invoices_select"
  ON invoices FOR SELECT TO authenticated
  USING (
    is_principal()
    OR is_admin_billing()
    OR is_assigned_to_project(project_id)
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.project_id = invoices.project_id
        AND p.project_manager = auth.uid()
    )
  );

CREATE POLICY "invoices_insert"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (is_principal() OR is_admin_billing());

CREATE POLICY "invoices_update"
  ON invoices FOR UPDATE TO authenticated
  USING (
    is_principal()
    OR is_admin_billing()
    -- PM can approve/return Stage 1
    OR (
      is_pm_or_above()
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.project_id = invoices.project_id
          AND p.project_manager = auth.uid()
      )
    )
  )
  WITH CHECK (
    is_principal()
    OR is_admin_billing()
    OR (
      is_pm_or_above()
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.project_id = invoices.project_id
          AND p.project_manager = auth.uid()
      )
    )
  );


-- ============================================================
-- invoice_line_items
-- Access mirrors parent invoice.
-- ============================================================

CREATE POLICY "invoice_line_items_select"
  ON invoice_line_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.invoice_id = invoice_line_items.invoice_id
        AND (
          is_principal()
          OR is_admin_billing()
          OR is_assigned_to_project(i.project_id)
          OR EXISTS (
            SELECT 1 FROM projects p
            WHERE p.project_id = i.project_id
              AND p.project_manager = auth.uid()
          )
        )
    )
  );

CREATE POLICY "invoice_line_items_modify"
  ON invoice_line_items FOR ALL TO authenticated
  USING (is_principal() OR is_admin_billing())
  WITH CHECK (is_principal() OR is_admin_billing());


-- ============================================================
-- payments
-- Principal and Admin manage. PM+ and assigned team read.
-- ============================================================

CREATE POLICY "payments_select"
  ON payments FOR SELECT TO authenticated
  USING (
    is_principal()
    OR is_admin_billing()
    OR EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.invoice_id = payments.invoice_id
        AND (
          is_pm_or_above()
          OR is_assigned_to_project(i.project_id)
        )
    )
  );

CREATE POLICY "payments_modify"
  ON payments FOR ALL TO authenticated
  USING (is_principal() OR is_admin_billing())
  WITH CHECK (is_principal() OR is_admin_billing());


-- ============================================================
-- invoice_collection_log
-- Principal and Admin manage. Assigned PM reads.
-- ============================================================

CREATE POLICY "collection_log_select"
  ON invoice_collection_log FOR SELECT TO authenticated
  USING (
    is_principal()
    OR is_admin_billing()
    OR EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.invoice_id = invoice_collection_log.invoice_id
        AND (
          is_assigned_to_project(i.project_id)
          OR EXISTS (
            SELECT 1 FROM projects p
            WHERE p.project_id = i.project_id
              AND p.project_manager = auth.uid()
          )
        )
    )
  );

CREATE POLICY "collection_log_modify"
  ON invoice_collection_log FOR ALL TO authenticated
  USING (is_principal() OR is_admin_billing())
  WITH CHECK (is_principal() OR is_admin_billing());
