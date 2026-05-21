-- ============================================================
-- Alta•Via — Migration 001: Schema
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================


-- ============================================================
-- SECTION 1: ENUM TYPES
-- ============================================================

CREATE TYPE client_type_enum AS ENUM (
  'Owner', 'Developer', 'Nonprofit', 'Government', 'Other'
);

CREATE TYPE payment_terms_enum AS ENUM (
  'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'
);

CREATE TYPE project_type_enum AS ENUM (
  'Healthcare', 'Performing Arts', 'Education', 'Commercial',
  'Residential', 'Government', 'Mixed Use', 'Other'
);

CREATE TYPE project_status_enum AS ENUM (
  'Pursuit', 'Active', 'On Hold', 'Complete', 'Lost', 'Cancelled'
);

CREATE TYPE project_phase_enum AS ENUM (
  'Predevelopment', 'Design', 'Procurement', 'Construction', 'Closeout', 'Complete'
);

CREATE TYPE fee_method_enum AS ENUM (
  'Scope-Based', 'Hours-Based-Simple', 'Hours-Based-Detailed', 'Target-Fee'
);

CREATE TYPE billing_method_enum AS ENUM (
  'Time-and-Materials', 'Monthly-Fixed', 'Milestone', 'Percent-Complete'
);

CREATE TYPE invoice_detail_level_enum AS ENUM (
  'Summary', 'By-Employee', 'By-Employee-with-Descriptions'
);

CREATE TYPE contract_type_enum AS ENUM (
  'AIA', 'Custom-PSA', 'Other'
);

CREATE TYPE scope_phase_enum AS ENUM (
  'Preconstruction', 'Construction'
);

CREATE TYPE scope_category_enum AS ENUM (
  'A-Predevelopment',
  'B-Design-Consultant-Selection',
  'C-Contractor-Selection',
  'D-Preconstruction-Coordination',
  'E-Other-Vendor-Procurement',
  'F-Cost-Schedule-Quality',
  'G-Construction-Phase',
  'H-Other-Vendors-Construction',
  'I-Other-Scope'
);

CREATE TYPE scope_unit_enum AS ENUM (
  'ls', 'ea', 'wks', 'mon', 'hr'
);

-- Roles used in scope library and fee line items (billable staff roles only)
CREATE TYPE scope_role_enum AS ENUM (
  'PM', 'Contracts', 'CM', 'Scheduling', 'Sustainability', 'Custom'
);

CREATE TYPE participation_level_enum AS ENUM (
  'High', 'Medium', 'Low'
);

CREATE TYPE rate_type_enum AS ENUM (
  'Person-Specific', 'Role-Based'
);

-- Full role set used in rate cards, projections, and user profiles
CREATE TYPE rate_role_enum AS ENUM (
  'Principal', 'Sr-PM', 'PM', 'Coordinator', 'Contracts',
  'CM', 'Scheduling', 'Sustainability', 'BD', 'Admin', 'Custom'
);

CREATE TYPE user_role_enum AS ENUM (
  'Principal', 'Sr-PM', 'PM', 'Coordinator', 'Contracts', 'BD', 'Admin', 'Custom'
);

CREATE TYPE fee_status_enum AS ENUM (
  'Draft', 'Under-Review', 'Executed', 'Superseded'
);

CREATE TYPE discount_type_enum AS ENUM (
  'Nonprofit', 'Lump-Sum-Billing', 'Relationship-Discretionary', 'Rate-Discount'
);

CREATE TYPE discount_applied_at_enum AS ENUM (
  'Line-Item', 'Total-Fee', 'Hourly-Rate'
);

CREATE TYPE projection_input_mode_enum AS ENUM (
  'Straight-Line', 'Curve-Weighted', 'Manual'
);

CREATE TYPE projection_status_enum AS ENUM (
  'Draft', 'Baseline', 'Current', 'Superseded'
);

CREATE TYPE curve_type_enum AS ENUM (
  'Front-Loaded', 'Back-Loaded', 'Bell-Curve', 'Custom-Percentage'
);

CREATE TYPE code_type_enum AS ENUM (
  'Project', 'Non-Billable'
);

CREATE TYPE non_billable_category_enum AS ENUM (
  'Business-Development', 'Training', 'Administration',
  'Education', 'PTO', 'Holiday', 'Other'
);

CREATE TYPE timesheet_status_enum AS ENUM (
  'Draft', 'Submitted', 'Approved', 'Returned', 'Locked'
);

CREATE TYPE invoice_status_enum AS ENUM (
  'Draft', 'Stage1-Review', 'Stage2-Review', 'Approved-Hold',
  'Sent', 'Partially-Paid', 'Paid', 'Overdue', 'Disputed', 'Written-Off'
);

CREATE TYPE payment_method_enum AS ENUM (
  'Check', 'ACH', 'Wire', 'Credit-Card', 'Other'
);

CREATE TYPE contact_method_enum AS ENUM (
  'Phone', 'Email', 'In-Person', 'Letter'
);

CREATE TYPE service_category_enum AS ENUM (
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'
);

CREATE TYPE tf_feasibility_enum AS ENUM (
  'Viable', 'Tight', 'Below-Cost'
);


-- ============================================================
-- SECTION 2: TABLES (dependency order)
-- ============================================================

-- 1. firm_settings — single record for PMG configuration
CREATE TABLE firm_settings (
  id                               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name                        text NOT NULL DEFAULT 'Palumbo Management Group',
  firm_address                     text,
  firm_city                        text,
  firm_state                       text,
  firm_zip                         text,
  firm_phone                       text,
  firm_email                       text,
  firm_website                     text,
  logo_url                         text,
  -- Project numbering
  project_number_prefix            text NOT NULL DEFAULT 'PMG',
  project_number_include_year      boolean NOT NULL DEFAULT true,
  project_number_format            text NOT NULL DEFAULT 'PREFIX-YYYY-###',
  project_number_reset_annually    boolean NOT NULL DEFAULT true,
  project_number_next_seq          integer NOT NULL DEFAULT 1,
  -- Invoice numbering
  invoice_number_prefix            text NOT NULL DEFAULT 'INV',
  invoice_number_next_seq          integer NOT NULL DEFAULT 1,
  -- Legal / payment text
  late_payment_text                text DEFAULT 'Invoices unpaid after the due date are subject to a 1.5% monthly finance charge.',
  payment_instructions             text,
  -- Timesheet notification schedule (DOW: 0=Sun … 6=Sat; hour: 0-23)
  ts_reminder_dow                  integer NOT NULL DEFAULT 5,
  ts_reminder_hour                 integer NOT NULL DEFAULT 16,
  ts_overdue_dow                   integer NOT NULL DEFAULT 1,
  ts_overdue_hour                  integer NOT NULL DEFAULT 9,
  -- Invoice workflow escalation windows (hours)
  invoice_stage1_escalation_hours  integer NOT NULL DEFAULT 48,
  invoice_stage2_escalation_hours  integer NOT NULL DEFAULT 24,
  -- AR late-payment notification thresholds
  ar_reminder_days_before_due      integer NOT NULL DEFAULT 5,
  ar_overdue_30_notify             boolean NOT NULL DEFAULT true,
  ar_overdue_60_notify             boolean NOT NULL DEFAULT true,
  ar_overdue_90_notify             boolean NOT NULL DEFAULT true,
  created_at                       timestamptz NOT NULL DEFAULT now(),
  updated_at                       timestamptz NOT NULL DEFAULT now()
);

-- 2. public.users — extends auth.users with profile and role
CREATE TABLE public.users (
  user_id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name             text,
  last_name              text,
  role                   user_role_enum,
  utilization_target_pct decimal(5,2) NOT NULL DEFAULT 85.00,
  is_active              boolean NOT NULL DEFAULT true,
  hire_date              date,
  department             text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- 3. clients
CREATE TABLE clients (
  client_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    text NOT NULL,
  client_type     client_type_enum,
  billing_address text,
  billing_city    text,
  billing_state   text,
  billing_zip     text,
  payment_terms   payment_terms_enum NOT NULL DEFAULT 'Net 30',
  is_nonprofit    boolean NOT NULL DEFAULT false,
  notes           text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id)
);

-- 4. client_contacts
CREATE TABLE client_contacts (
  contact_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid NOT NULL REFERENCES clients(client_id) ON DELETE RESTRICT,
  first_name           text NOT NULL,
  last_name            text NOT NULL,
  title                text,
  email                text,
  phone                text,
  is_primary_billing   boolean NOT NULL DEFAULT false,
  is_invoice_recipient boolean NOT NULL DEFAULT false,
  is_cc_recipient      boolean NOT NULL DEFAULT false,
  notes                text,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- 5. projects
CREATE TABLE projects (
  project_id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number             text UNIQUE NOT NULL,
  project_name               text NOT NULL,
  client_id                  uuid NOT NULL REFERENCES clients(client_id) ON DELETE RESTRICT,
  project_type               project_type_enum,
  status                     project_status_enum NOT NULL DEFAULT 'Pursuit',
  principal_in_charge        uuid REFERENCES auth.users(id),
  project_manager            uuid REFERENCES auth.users(id),
  description                text,
  -- Timeline
  projected_start_date       date,
  projected_end_date         date,
  actual_start_date          date,
  actual_end_date            date,
  current_phase              project_phase_enum,
  -- Financial (populated from executed fee, then locked)
  contracted_fee             decimal(12,2),
  fee_method                 fee_method_enum,
  billing_method             billing_method_enum,
  invoice_detail_level       invoice_detail_level_enum NOT NULL DEFAULT 'By-Employee',
  payment_terms              payment_terms_enum,
  add_services_threshold_pct decimal(5,2) NOT NULL DEFAULT 80.00,
  po_number                  text,
  -- Contract
  contract_type              contract_type_enum,
  contract_executed_date     date,
  contract_document_url      text,
  -- Metadata
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  created_by                 uuid REFERENCES auth.users(id)
);

-- 6. project_team_assignments
CREATE TABLE project_team_assignments (
  assignment_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_on_project  text,
  start_date       date,
  end_date         date,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- 7. billing_codes
CREATE TABLE billing_codes (
  code_id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                     text UNIQUE NOT NULL,
  description              text NOT NULL,
  code_type                code_type_enum NOT NULL,
  is_billable              boolean NOT NULL,
  requires_description     boolean NOT NULL DEFAULT false,
  non_billable_category    non_billable_category_enum,
  project_id               uuid REFERENCES projects(project_id) ON DELETE RESTRICT,
  is_active                boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_codes_project_type_has_project
    CHECK (code_type != 'Project' OR project_id IS NOT NULL),
  CONSTRAINT billing_codes_non_billable_has_category
    CHECK (is_billable = true OR non_billable_category IS NOT NULL OR code_type = 'Project')
);

-- 8. scope_library
CREATE TABLE scope_library (
  scope_item_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase                       scope_phase_enum NOT NULL,
  category                    scope_category_enum NOT NULL,
  item_number                 text NOT NULL,
  activity_name               text NOT NULL,
  standard_description        text,
  default_unit                scope_unit_enum NOT NULL DEFAULT 'ls',
  default_role                scope_role_enum,
  default_participation_level participation_level_enum NOT NULL DEFAULT 'Medium',
  is_active                   boolean NOT NULL DEFAULT true,
  is_custom                   boolean NOT NULL DEFAULT false,
  sort_order                  integer,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_number)
);

-- 9. rate_cards
CREATE TABLE rate_cards (
  rate_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id),
  role                rate_role_enum,
  rate_type           rate_type_enum NOT NULL,
  billable_rate       decimal(10,2) NOT NULL,
  internal_cost_rate  decimal(10,2),
  effective_date      date NOT NULL,
  end_date            date,
  is_active           boolean NOT NULL DEFAULT true,
  notes               text,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_cards_person_specific_has_user
    CHECK (rate_type != 'Person-Specific' OR user_id IS NOT NULL),
  CONSTRAINT rate_cards_role_based_has_role
    CHECK (rate_type != 'Role-Based' OR role IS NOT NULL)
);

-- 10. rate_overrides (project-specific rate exceptions)
CREATE TABLE rate_overrides (
  override_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id),
  role            rate_role_enum,
  override_rate   decimal(10,2) NOT NULL,
  effective_date  date NOT NULL,
  notes           text NOT NULL,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 11. fee_records
CREATE TABLE fee_records (
  fee_id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                uuid NOT NULL REFERENCES projects(project_id) ON DELETE RESTRICT,
  fee_name                  text NOT NULL,
  method                    fee_method_enum NOT NULL,
  status                    fee_status_enum NOT NULL DEFAULT 'Draft',
  total_fee                 decimal(12,2),
  discounted_fee            decimal(12,2),
  notes                     text,
  -- Method 2 Simple fields
  hb_simple_hours_per_month decimal(10,2),
  hb_simple_duration_months integer,
  hb_simple_role            rate_role_enum,
  hb_simple_rate            decimal(10,2),
  -- Method 3 Target Fee fields
  tf_target_fee             decimal(12,2),
  tf_feasibility            tf_feasibility_enum,
  tf_available_hours        decimal(10,2),
  tf_margin_at_target       decimal(5,2),
  -- Execution metadata
  created_by                uuid REFERENCES auth.users(id),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  executed_at               timestamptz,
  executed_by               uuid REFERENCES auth.users(id)
);

-- 12. fee_line_items (Method 1 — Scope-Based)
CREATE TABLE fee_line_items (
  line_item_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id              uuid NOT NULL REFERENCES fee_records(fee_id) ON DELETE CASCADE,
  scope_item_id       uuid REFERENCES scope_library(scope_item_id),
  custom_description  text,
  participation_level participation_level_enum,
  unit                scope_unit_enum,
  quantity            decimal(10,2),
  hours_per_unit      decimal(10,2),
  total_hours         decimal(10,2) GENERATED ALWAYS AS (quantity * hours_per_unit) STORED,
  role                scope_role_enum,
  rate                decimal(10,2),
  line_total          decimal(12,2) GENERATED ALWAYS AS (quantity * hours_per_unit * rate) STORED,
  sort_order          integer,
  notes               text,
  CONSTRAINT fee_line_items_scope_or_custom
    CHECK (scope_item_id IS NOT NULL OR custom_description IS NOT NULL)
);

-- 13. fee_discounts
CREATE TABLE fee_discounts (
  discount_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id                 uuid NOT NULL REFERENCES fee_records(fee_id) ON DELETE CASCADE,
  discount_type          discount_type_enum NOT NULL,
  applied_at             discount_applied_at_enum NOT NULL,
  discount_amount        decimal(12,2),
  discount_pct           decimal(5,2),
  notes                  text NOT NULL,
  tax_write_off_eligible boolean NOT NULL DEFAULT false,
  created_by             uuid REFERENCES auth.users(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fee_discounts_amount_xor_pct
    CHECK (
      (discount_amount IS NOT NULL AND discount_pct IS NULL) OR
      (discount_amount IS NULL AND discount_pct IS NOT NULL)
    )
);

-- 14. staffing_projections
CREATE TABLE staffing_projections (
  projection_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES projects(project_id) ON DELETE RESTRICT,
  fee_id         uuid NOT NULL REFERENCES fee_records(fee_id) ON DELETE RESTRICT,
  input_mode     projection_input_mode_enum NOT NULL,
  status         projection_status_enum NOT NULL DEFAULT 'Draft',
  curve_type     curve_type_enum,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  locked_at      timestamptz,
  locked_by      uuid REFERENCES auth.users(id)
);

-- 15. projection_monthly_detail
CREATE TABLE projection_monthly_detail (
  detail_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_id     uuid NOT NULL REFERENCES staffing_projections(projection_id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id),
  role              rate_role_enum,
  month             date NOT NULL,
  projected_hours   decimal(10,2),
  projected_amount  decimal(12,2),
  actual_hours      decimal(10,2),
  actual_amount     decimal(12,2),
  reforecast_hours  decimal(10,2),
  reforecast_amount decimal(12,2),
  CONSTRAINT projection_monthly_detail_first_of_month
    CHECK (EXTRACT(DAY FROM month) = 1)
);

-- 16. timesheets
CREATE TABLE timesheets (
  timesheet_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  week_start_date  date NOT NULL,
  week_end_date    date NOT NULL,
  billing_month    date NOT NULL,
  status           timesheet_status_enum NOT NULL DEFAULT 'Draft',
  submitted_at     timestamptz,
  submitted_by     uuid REFERENCES auth.users(id),
  approved_at      timestamptz,
  approved_by      uuid REFERENCES auth.users(id),
  returned_at      timestamptz,
  returned_by      uuid REFERENCES auth.users(id),
  return_notes     text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date),
  CONSTRAINT timesheets_billing_month_first_of_month
    CHECK (EXTRACT(DAY FROM billing_month) = 1),
  CONSTRAINT timesheets_week_start_is_sunday
    CHECK (EXTRACT(DOW FROM week_start_date) = 0),
  CONSTRAINT timesheets_week_end_is_saturday
    CHECK (EXTRACT(DOW FROM week_end_date) = 6),
  CONSTRAINT timesheets_week_span
    CHECK (week_end_date = week_start_date + 6)
);

-- 17. timesheet_entries
CREATE TABLE timesheet_entries (
  entry_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id     uuid NOT NULL REFERENCES timesheets(timesheet_id) ON DELETE CASCADE,
  code_id          uuid NOT NULL REFERENCES billing_codes(code_id) ON DELETE RESTRICT,
  entry_date       date NOT NULL,
  hours            decimal(5,2) NOT NULL,
  description      text,
  service_category service_category_enum,
  is_billable      boolean NOT NULL,
  rate_applied     decimal(10,2),
  amount           decimal(12,2),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timesheet_entries_hours_positive CHECK (hours > 0),
  CONSTRAINT timesheet_entries_hours_max CHECK (hours <= 24)
);

-- 18. invoices
CREATE TABLE invoices (
  invoice_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number       text UNIQUE NOT NULL,
  project_id           uuid NOT NULL REFERENCES projects(project_id) ON DELETE RESTRICT,
  client_id            uuid NOT NULL REFERENCES clients(client_id) ON DELETE RESTRICT,
  billing_period_start date NOT NULL,
  billing_period_end   date NOT NULL,
  invoice_date         date NOT NULL DEFAULT CURRENT_DATE,
  due_date             date NOT NULL,
  status               invoice_status_enum NOT NULL DEFAULT 'Draft',
  subtotal             decimal(12,2),
  discount_amount      decimal(12,2) NOT NULL DEFAULT 0,
  total_due            decimal(12,2),
  amount_paid          decimal(12,2) NOT NULL DEFAULT 0,
  balance_due          decimal(12,2),
  pdf_url              text,
  sent_at              timestamptz,
  sent_by              uuid REFERENCES auth.users(id),
  stage1_approved_at   timestamptz,
  stage1_approved_by   uuid REFERENCES auth.users(id),
  stage2_approved_at   timestamptz,
  stage2_approved_by   uuid REFERENCES auth.users(id),
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid REFERENCES auth.users(id)
);

-- 19. invoice_line_items
CREATE TABLE invoice_line_items (
  invoice_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id),
  user_name       text,
  role            text,
  hours           decimal(10,2),
  rate            decimal(10,2),
  amount          decimal(12,2),
  descriptions    text[],
  sort_order      integer
);

-- 20. payments
CREATE TABLE payments (
  payment_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid NOT NULL REFERENCES invoices(invoice_id) ON DELETE RESTRICT,
  amount         decimal(12,2) NOT NULL,
  payment_date   date NOT NULL,
  payment_method payment_method_enum NOT NULL,
  reference      text,
  notes          text,
  recorded_by    uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_positive CHECK (amount > 0)
);

-- 21. invoice_collection_log
CREATE TABLE invoice_collection_log (
  log_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  contact_date   date NOT NULL,
  contact_method contact_method_enum NOT NULL,
  contacted_by   uuid REFERENCES auth.users(id),
  spoke_with     text,
  notes          text NOT NULL,
  promised_date  date,
  is_disputed    boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- SECTION 3: FUNCTIONS AND TRIGGERS
-- ============================================================

-- updated_at auto-maintenance
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON firm_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON fee_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON staffing_projections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-populate public.users when a new auth user is created
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, created_at, updated_at)
  VALUES (NEW.id, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- Enforce is_billable is always inherited from billing_code, not user-set
CREATE OR REPLACE FUNCTION enforce_is_billable_from_code()
RETURNS TRIGGER AS $$
BEGIN
  SELECT is_billable INTO NEW.is_billable
  FROM billing_codes
  WHERE code_id = NEW.code_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_is_billable
  BEFORE INSERT OR UPDATE ON timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION enforce_is_billable_from_code();

-- Enforce fee_records immutability after execution
-- Allows only: status Executed → Superseded (no other field changes)
CREATE OR REPLACE FUNCTION prevent_executed_fee_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.executed_at IS NOT NULL THEN
    -- Permit only the Executed → Superseded status transition
    IF NEW.status = 'Superseded' AND OLD.status = 'Executed'
      AND OLD.fee_id = NEW.fee_id
      AND OLD.project_id = NEW.project_id
      AND OLD.total_fee IS NOT DISTINCT FROM NEW.total_fee
      AND OLD.discounted_fee IS NOT DISTINCT FROM NEW.discounted_fee
      AND OLD.executed_at IS NOT DISTINCT FROM NEW.executed_at
      AND OLD.executed_by IS NOT DISTINCT FROM NEW.executed_by
    THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Executed fee records are immutable. Only status → Superseded is permitted after execution.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER immutable_executed_fee
  BEFORE UPDATE ON fee_records
  FOR EACH ROW EXECUTE FUNCTION prevent_executed_fee_update();

-- Enforce only one Executed fee per project at a time
CREATE OR REPLACE FUNCTION enforce_single_executed_fee()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Executed' THEN
    IF EXISTS (
      SELECT 1 FROM fee_records
      WHERE project_id = NEW.project_id
        AND status = 'Executed'
        AND fee_id != NEW.fee_id
    ) THEN
      RAISE EXCEPTION 'Only one fee record per project may have status = Executed. Supersede the current executed fee first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_executed_fee
  BEFORE INSERT OR UPDATE ON fee_records
  FOR EACH ROW EXECUTE FUNCTION enforce_single_executed_fee();

-- Auto-create billing code when project status becomes Active
CREATE OR REPLACE FUNCTION auto_create_project_billing_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Active' AND (OLD IS NULL OR OLD.status != 'Active') THEN
    INSERT INTO billing_codes (code, description, code_type, is_billable, project_id)
    VALUES (
      NEW.project_number,
      NEW.project_name,
      'Project',
      true,
      NEW.project_id
    )
    ON CONFLICT (code) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_project_billing_code
  AFTER INSERT OR UPDATE OF status ON projects
  FOR EACH ROW EXECUTE FUNCTION auto_create_project_billing_code();

-- Enforce paid invoices are immutable (financial fields only)
CREATE OR REPLACE FUNCTION prevent_paid_invoice_financial_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'Paid' THEN
    IF OLD.subtotal IS DISTINCT FROM NEW.subtotal
       OR OLD.total_due IS DISTINCT FROM NEW.total_due
       OR OLD.discount_amount IS DISTINCT FROM NEW.discount_amount
       OR OLD.amount_paid IS DISTINCT FROM NEW.amount_paid
       OR OLD.balance_due IS DISTINCT FROM NEW.balance_due
    THEN
      RAISE EXCEPTION 'Financial fields on paid invoices are immutable.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER immutable_paid_invoice
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION prevent_paid_invoice_financial_update();

-- Enforce Baseline projection rows: projected_hours and projected_amount are immutable
CREATE OR REPLACE FUNCTION prevent_baseline_projection_overwrite()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM staffing_projections sp
    WHERE sp.projection_id = OLD.projection_id
      AND sp.status = 'Baseline'
  ) THEN
    IF OLD.projected_hours IS DISTINCT FROM NEW.projected_hours
       OR OLD.projected_amount IS DISTINCT FROM NEW.projected_amount
    THEN
      RAISE EXCEPTION 'projected_hours and projected_amount are immutable on Baseline projections.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER immutable_baseline_projection
  BEFORE UPDATE ON projection_monthly_detail
  FOR EACH ROW EXECUTE FUNCTION prevent_baseline_projection_overwrite();


-- ============================================================
-- SECTION 4: INDEXES
-- ============================================================

-- Projects
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_principal ON projects(principal_in_charge);
CREATE INDEX idx_projects_pm ON projects(project_manager);

-- Team assignments
CREATE INDEX idx_pta_project_id ON project_team_assignments(project_id);
CREATE INDEX idx_pta_user_id ON project_team_assignments(user_id);

-- Billing codes
CREATE INDEX idx_billing_codes_project_id ON billing_codes(project_id);
CREATE INDEX idx_billing_codes_code ON billing_codes(code);

-- Rate cards
CREATE INDEX idx_rate_cards_user_id ON rate_cards(user_id);
CREATE INDEX idx_rate_cards_effective_date ON rate_cards(effective_date);

-- Fee records
CREATE INDEX idx_fee_records_project_id ON fee_records(project_id);
CREATE INDEX idx_fee_records_status ON fee_records(status);

-- Timesheets
CREATE INDEX idx_timesheets_user_id ON timesheets(user_id);
CREATE INDEX idx_timesheets_week_start ON timesheets(week_start_date);
CREATE INDEX idx_timesheets_status ON timesheets(status);
CREATE INDEX idx_timesheets_billing_month ON timesheets(billing_month);

-- Timesheet entries
CREATE INDEX idx_entries_timesheet_id ON timesheet_entries(timesheet_id);
CREATE INDEX idx_entries_code_id ON timesheet_entries(code_id);
CREATE INDEX idx_entries_entry_date ON timesheet_entries(entry_date);

-- Invoices
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Projection monthly detail
CREATE INDEX idx_pmd_projection_id ON projection_monthly_detail(projection_id);
CREATE INDEX idx_pmd_month ON projection_monthly_detail(month);
CREATE INDEX idx_pmd_user_id ON projection_monthly_detail(user_id);
