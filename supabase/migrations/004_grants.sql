-- ============================================================
-- Cortina — Migration 004: Explicit Grants
-- Required for Supabase projects created after May 30, 2026
-- Run in Supabase SQL Editor
-- ============================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to all existing tables
GRANT SELECT ON public.firm_settings TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_team_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_codes TO authenticated;
GRANT SELECT ON public.scope_library TO authenticated;
GRANT INSERT, UPDATE ON public.scope_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_line_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_discounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staffing_projections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projection_monthly_detail TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheet_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_line_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_collection_log TO authenticated;

-- Grant access to tables added in Session 2 migration
GRANT SELECT, INSERT, UPDATE, DELETE ON public.add_services TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_principal() TO authenticated;
GRANT EXECUTE ON FUNCTION is_pm_or_above() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_billing() TO authenticated;
GRANT EXECUTE ON FUNCTION is_assigned_to_project(uuid) TO authenticated;
