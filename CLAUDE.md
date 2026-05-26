# CLAUDE.md — Alta•Via Master Spec & Build Context

> This file is the authoritative reference for every Alta•Via build session.
> Read this fully before writing any code. All architectural decisions, module specs,
> data relationships, and build conventions live here.
> Update the BUILD LOG section at the end of every session.

---

## 1. PRODUCT OVERVIEW

**Alta•Via** is a Professional Services Automation (PSA) platform purpose-built for
owner's representative firms in the construction industry. It is the internal operational
backbone of Palumbo Management Group (PMG) — tracking every project from earliest
pursuit through final invoice and collections.

Alta•Via is a companion product to Vetta (external-facing project management) and
will eventually be sold alongside Vetta as part of a suite of tools for owner's rep firms.
It is built internal-first, universal by design.

**The core problem it solves:**
Owner's rep firms manage projects, fees, people, time, and billing across fragmented
tools — spreadsheets, QuickBooks, generic PSA platforms — none of which are built
for this specific business model. Alta•Via replaces all of them with one integrated platform.

**Product family:**
- Collina — household budget app (separate repo)
- Vetta — client-facing project management (separate repo)
- Alta•Via — internal practice management (this repo)
- Archivio — qualifications & BD database (future, concept only)

**The suite sales motion:**
Vetta is sold first (project management). Alta•Via is the natural second conversation
(how are you managing time, billing, and firm performance?). Archivio is the third
(how is your marketing team handling pursuits and SOQs?). Each product stands alone
but they share project and client data as a connected ecosystem.

---

## 2. BRAND & DESIGN SYSTEM

### 2.1 Brand Identity

**Product name:** Alta•Via
- The dot separator is intentional — it makes the two-word name easier to read
  and less likely to be mispronounced
- Drop the dot only in plain text contexts where it may cause issues
- Always render as ALTA•VIA in the wordmark (all caps)

**Mark:** Angular AV mountain mark with orange sun accent
- The A (mountain peak) and V (descending valley) in the mark are geometric mirrors
- The same mirror logic appears in the ALTA•VIA wordmark — A and V are mirrors
- This is an intentional, layered brand decision — preserve it in all UI treatments
- The mark encodes the initials AV for Alta Via while reading as a mountain landscape

**Typography:** Geometric sans serif — Futura or equivalent
- All-caps wordmark
- The V/A geometric mirror is most pronounced in Futura — preserve this
- Identify exact font from generated assets and license appropriately

**Logo files:** To be added to /public/assets/ when finalized by designer
- The AI-generated marks are directionally correct but need vector refinement
- Do not use AI-generated marks in production — placeholder only until designer delivers

### 2.2 Color System

**Primary color:** Forest Green #1E3D2F
**Accent color:** Orange #F2903A

**Sidebar:**
- Background: #1E3D2F (forest green)
- Text active: #FFFFFF
- Text inactive: rgba(255,255,255,0.6)
- Active item highlight: slightly lighter green background + #F2903A icon

**Content area:**
- Page background: #F8F9FA (near white)
- Card/panel background: #FFFFFF
- Primary text: #1A1A2E (near black)
- Secondary text: #6B7280
- Border/divider: #E5E7EB
- Table header background: #F3F4F6

**Accent usage — CRITICAL:**
Orange #F2903A is a signal color, not a base color. It appears in:
- The sun accent in the Alta•Via logo mark
- The active navigation item icon in the sidebar
- Primary CTA buttons
- Key highlight moments (alerts, warnings, critical actions)

Orange must NOT appear in:
- Chart bars or data visualizations
- Body text accents or callouts
- Card icons
- Secondary links or navigation

**Data visualization colors:**
- Primary data bars/lines: #2D5A3D (mid forest green)
- Secondary/actual bars: #D1D5DB (light gray)
- Success/positive: #10B981 (green)
- Warning: #F59E0B (amber)
- Error/alert: #EF4444 (red)
- Neutral: #6B7280 (gray)

**Staffing & Utilization grid colors:**
- Future month, at or above target: #10B981 (green)
- Future month, below target: #EF4444 (red)
- Future month, no projection: #E5E7EB (gray)
- Past month, actual ≥ projected: #3B82F6 (blue)
- Past month, actual < projected: #F59E0B (amber)
- Past month pending close: muted blue/amber with indicator dot
- Current month: progress indicator

**Status colors:**
- Active / Approved / Paid: #10B981 (green)
- Pending / In Review: #F59E0B (amber)
- Overdue / Missing / Error: #EF4444 (red)
- Draft / Inactive: #6B7280 (gray)
- On Hold: #8B5CF6 (purple)

### 2.3 UI Design Principles

**Professional tool — not consumer app:**
- Users are experienced construction professionals
- Data density is appropriate and expected — these are not simplified dashboards
- No rounded pill buttons, pastel colors, or playful micro-animations
- Tables, grids, and structured data are primary UI patterns — embrace them
- Think: Bloomberg Terminal meets modern SaaS — not Mint or Robinhood

**Relationship to Vetta:**
- Same sidebar navigation structure and general layout skeleton
- Same color palette applied with the same logic
- Different enough to be distinct — primarily through content density
  and module-specific UI patterns (timesheets, fee builder, AR aging grid)
- A user of both products should immediately recognize the family relationship

**Navigation structure:**
- Fixed left sidebar, #142538 background
- Alta•Via logo mark + wordmark at top of sidebar
- Module navigation items below
- Main content area to the right — white/near-white background
- Top bar: breadcrumb + user menu + notifications

**Sidebar navigation items (Phase 1):**
- Dashboard (home)
- Clients
- Projects
- Fee Development
- Rate Cards
- Timesheets
- Invoicing & AR

**Touch-first for timesheet module:**
- Timesheet entry is the primary iPad use case
- Tap targets minimum 44×44px
- No hover-dependent interactions in timesheet UI
- Readable at arm's length
- Cell selection via tap, not click-and-drag

### 2.4 Responsive Design — MANDATORY

**This is a responsive-first build. No exceptions.**

Alta•Via will be used on:
- Desktop (primary for fee development, invoicing, reporting)
- iPad (primary for timesheet entry — treat as equal priority to desktop)
- Mobile (secondary — at minimum timesheets must work on mobile)

**Responsive requirements:**
- Every component must be built with mobile/tablet breakpoints from day one
- Do not build desktop-only components and retrofit responsiveness later
- Tailwind breakpoint usage: sm (640px), md (768px), lg (1024px), xl (1280px)
- Sidebar collapses to bottom nav or hamburger on mobile
- Tables must be scrollable horizontally on small screens
- Timesheet grid specifically must be touch-optimized

**iPad app path:**
The React + Vite + Tailwind web app can be wrapped with Capacitor to produce
a native iPad app with minimal additional work. Build responsively now so that
path stays open. Do not make architectural decisions that would prevent this.

**Lesson from Vetta:**
Vetta accumulated responsive debt by not building mobile-first from day one.
Alta•Via must not repeat this. If a component is not responsive when it is
first built, it is not complete.

---

## 3. TECH STACK

**Frontend:** React 18 + Vite
**Styling:** Tailwind CSS — responsive-first, every component
**Database:** Supabase (PostgreSQL)
**Auth:** Supabase Auth
**Hosting:** Vercel
**Version Control:** GitHub
**Package Manager:** npm
**State Management:** React Context — from day one, no prop drilling ever
**PDF Generation:** To be selected at build time (react-pdf or @react-pdf/renderer)
**Email:** To be selected at build time (Resend recommended)
**Future native app:** Capacitor (for iPad App Store packaging)

**Supabase Project ID:** [UPDATE AFTER SETUP]
**Supabase Project URL:** [UPDATE AFTER SETUP]
**GitHub Repo:** [UPDATE AFTER SETUP]

### Development Conventions

- One file at a time — complete and confirm before moving to next
- Screenshot confirmation before proceeding to next component
- Git commits after each working feature — never commit broken code
- .env file must never be committed — add to .gitignore on day one
- Run git commands in a separate terminal from the dev server
- Every component built responsive from first commit — not as a retrofit
- No inline styles — Tailwind classes only
- React Context for all shared state — no prop drilling
- Supabase RLS enforced at database level for all sensitive tables

### File Structure Convention
```
/src
  /components
    /layout        — Sidebar, TopBar, PageWrapper
    /ui            — Button, Input, Table, Modal, Badge (reusable primitives)
    /clients       — Client-specific components
    /projects      — Project-specific components
    /fees          — Fee development components
    /rates         — Rate card components
    /timesheets    — Timesheet components
    /invoicing     — Invoice and AR components
  /context         — React Context providers
  /hooks           — Custom hooks
  /lib             — supabase.js client, utilities
  /pages           — Top-level page components
/public
  /assets          — Logo files, icons
```

---

## 4. USER ROLES & PERMISSIONS

Four role levels. Phase 4 builds full UI enforcement.
**Database schema must support all four roles from day one.**
Supabase RLS policies required on all sensitive tables from Session 1.

**Principal / Owner**
- Full access to everything
- Only role that can see internal_cost_rate and margin data
- Final invoice approval (Stage 2)
- Rate card creation and management
- User management
- Unlock approved timesheets
- Access to all employees' utilization data

**Senior PM / Project Manager**
- Access to assigned projects only
- Timesheet entry and submission
- Stage 1 invoice review for assigned projects
- View own utilization dashboard only
- Cannot see other employees' rates or compensation data
- Cannot see internal cost rates

**Coordinator / Staff**
- Timesheet entry and submission
- View own utilization dashboard only
- View assigned project data (read only)
- No financial management access

**Admin / Billing**
- Invoice generation and management
- AR tracking and payment recording
- No project management access
- No rate or compensation data access
- No internal cost rate access

---

## 5. BUILD PHASES

### Phase 1 — Core (Current Focus)
Build in this exact sequence — each module depends on the previous:
1. Client Records
2. Projects
3. Fee Development
4. Rate Cards
5. Timesheets
6. Invoicing & AR

### Phase 2 — Intelligence Layer (Future)
Financial Projections, Staffing & Utilization, Expense Reports

### Phase 3 — Front End (Future)
Full CRM & Pipeline, Rate Development Tool

### Phase 4 — Infrastructure (Future)
User Roles & Permissions full UI, Reporting & Dashboard

---

## 6. MODULE SPECS — PHASE 1

---

### 6.1 CLIENT RECORDS (Simplified CRM)

**Purpose:** Single source of truth for all client information.
Referenced by Projects, Contracts, and Invoicing. Data entered once, flows everywhere.
Never re-enter client data anywhere else in Alta•Via.

**clients table:**
```sql
client_id         uuid PK default gen_random_uuid()
company_name      text NOT NULL
client_type       enum('Owner','Developer','Nonprofit','Government','Other')
billing_address   text
billing_city      text
billing_state     text
billing_zip       text
payment_terms     enum('Net 30','Net 45','Net 60','Due on Receipt') default 'Net 30'
is_nonprofit      boolean default false  -- triggers nonprofit discount eligibility
notes             text
created_at        timestamptz default now()
updated_at        timestamptz default now()
created_by        uuid FK → auth.users
```

**client_contacts table:**
```sql
contact_id           uuid PK default gen_random_uuid()
client_id            uuid FK → clients NOT NULL
first_name           text NOT NULL
last_name            text NOT NULL
title                text
email                text
phone                text
is_primary_billing   boolean default false
is_invoice_recipient boolean default false  -- appears in invoice To: field
is_cc_recipient      boolean default false  -- appears in invoice CC: field
notes                text
is_active            boolean default true
created_at           timestamptz default now()
```

**UI:**
- Client list: searchable by name/type, sortable, paginated
- Client detail: all fields + linked projects list + contacts list
- Inline add/edit for contacts within client detail view
- Soft delete only — never hard delete client records

---

### 6.2 PROJECTS

**Purpose:** The master record. Every other module references a project.
Nothing in Alta•Via exists without a project anchor.

**projects table:**
```sql
project_id                 uuid PK default gen_random_uuid()
project_number             text UNIQUE NOT NULL  -- auto-generated per firm rules
project_name               text NOT NULL
client_id                  uuid FK → clients NOT NULL
project_type               enum('Healthcare','Performing Arts','Education',
                           'Commercial','Residential','Government','Mixed Use','Other')
status                     enum('Pursuit','Active','On Hold','Complete','Lost','Cancelled')
                           default 'Pursuit'
principal_in_charge        uuid FK → auth.users
project_manager            uuid FK → auth.users
description                text
-- Timeline
projected_start_date       date
projected_end_date         date
actual_start_date          date
actual_end_date            date
current_phase              enum('Predevelopment','Design','Procurement',
                           'Construction','Closeout','Complete')
-- Financial (populated from Fee Development on contract execution — then locked)
contracted_fee             decimal(12,2)
fee_method                 enum('Scope-Based','Hours-Based','Target-Fee')
billing_method             enum('Time-and-Materials','Monthly-Fixed',
                           'Milestone','Percent-Complete')
invoice_detail_level       enum('Summary','By-Employee','By-Employee-with-Descriptions')
                           default 'By-Employee'
payment_terms              enum('Net 30','Net 45','Net 60','Due on Receipt')
add_services_threshold_pct decimal(5,2) default 80.00  -- warn at 80% fee burn
po_number                  text
-- Contract
contract_type              enum('AIA','Custom-PSA','Other')
contract_executed_date     date
contract_document_url      text
-- Metadata
created_at                 timestamptz default now()
updated_at                 timestamptz default now()
created_by                 uuid FK → auth.users
```

**project_team_assignments table:**
```sql
assignment_id    uuid PK default gen_random_uuid()
project_id       uuid FK → projects NOT NULL
user_id          uuid FK → auth.users NOT NULL
role_on_project  text
start_date       date
end_date         date
is_active        boolean default true
created_at       timestamptz default now()
```

**Project Numbering Rules (stored in firm_settings):**
- Firm configures prefix, year inclusion, and sequential format
- Example: PMG-2026-001 or HC-2026-001 (type-coded prefix)
- Auto-generates on project creation — never manual, never reused
- Sequential number resets per year or runs continuously — firm choice

**Project Status Flow:**
```
Pursuit → Active → On Hold / Complete / Cancelled / Lost
```

**HARD GATE — project cannot move to Active without:**
1. fee_records record with status = 'Executed'
2. staffing_projections record with status = 'Baseline' and locked_at NOT NULL
3. System enforces this as a database-level check — not just UI validation

---

### 6.3 FEE DEVELOPMENT

**Purpose:** Build, compare, and execute project fees using three methods.
The executed fee version becomes the immutable financial baseline for all downstream
modules — projections, invoicing, add services warnings, financial reporting.

**fee_records table:**
```sql
fee_id          uuid PK default gen_random_uuid()
project_id      uuid FK → projects NOT NULL
fee_name        text NOT NULL  -- user label: "Scope-Based v1", "Target Fee Option"
method          enum('Scope-Based','Hours-Based-Simple',
                'Hours-Based-Detailed','Target-Fee')
status          enum('Draft','Under-Review','Executed','Superseded') default 'Draft'
total_fee       decimal(12,2)  -- calculated
discounted_fee  decimal(12,2)  -- calculated after discounts applied
notes           text
created_by      uuid FK → auth.users
created_at      timestamptz default now()
updated_at      timestamptz default now()
executed_at     timestamptz  -- set when status → Executed
executed_by     uuid FK → auth.users
```

**Rules:**
- Multiple fee_records allowed per project
- Only ONE fee_record per project may have status = 'Executed' at any time
- On execution: project.contracted_fee = fee.discounted_fee (locked)
- Executed records are IMMUTABLE — no field updates permitted after executed_at is set
- Enforce immutability via RLS policy and application logic

---

#### METHOD 1 — SCOPE-BASED (Bottom Up)

**scope_library table (firm-level master list):**
```sql
scope_item_id              uuid PK default gen_random_uuid()
phase                      enum('Preconstruction','Construction')
category                   enum('A-Predevelopment',
                           'B-Design-Consultant-Selection',
                           'C-Contractor-Selection',
                           'D-Preconstruction-Coordination',
                           'E-Other-Vendor-Procurement',
                           'F-Cost-Schedule-Quality',
                           'G-Construction-Phase',
                           'H-Other-Vendors-Construction',
                           'I-Other-Scope')
item_number                text  -- "1", "24", "92" etc.
activity_name              text NOT NULL
standard_description       text
default_unit               enum('ls','ea','wks','mon','hr') default 'ls'
default_role               enum('PM','Contracts','CM','Scheduling',
                           'Sustainability','Custom')
default_participation_level enum('High','Medium','Low') default 'Medium'
is_active                  boolean default true
is_custom                  boolean default false  -- false = PMG default, true = firm-added
sort_order                 integer
created_at                 timestamptz default now()
```

**Pre-load:** 123 line items from PMG Attachment A Scope of Services.
Source file: `PROJECT_NAME_Attachment_A_-_Scope_of_Services_-_Update.xlsx`
Load via seed script. Preserve phase, category, item number, name, description,
unit, and role from source document exactly.

**Participation Level meaning:**
- High: PMG leads — suggest more hours in tooltip
- Medium: PMG supports — suggest moderate hours in tooltip
- Low: PMG monitors — suggest minimal hours in tooltip
Over time, actual hours from timesheets will calibrate these suggestions per item.

**fee_line_items table (Method 1):**
```sql
line_item_id         uuid PK default gen_random_uuid()
fee_id               uuid FK → fee_records NOT NULL
scope_item_id        uuid FK → scope_library  -- null for custom items
custom_description   text  -- used when scope_item_id is null
participation_level  enum('High','Medium','Low')  -- overrides library default
unit                 enum('ls','ea','wks','mon','hr')
quantity             decimal(10,2)
hours_per_unit       decimal(10,2)
total_hours          decimal(10,2)  -- calculated: quantity × hours_per_unit
role                 enum('PM','Contracts','CM','Scheduling','Sustainability','Custom')
rate                 decimal(10,2)  -- pulled from rate card at line item creation
line_total           decimal(12,2)  -- calculated: total_hours × rate
sort_order           integer
notes                text
```

**Method 1 UI:**
- Split panel: left = scope library browser (phase → category → items with checkboxes)
- Right = active fee builder showing selected line items
- Grid columns: # | Activity | Participation | Unit | Qty | Hrs/Unit | Total Hrs |
  Role | Rate | Total | Notes | Delete
- Subtotals by phase at bottom, grand total fee
- Custom item: blank row always at bottom of fee builder (same UX as timesheets)
- Participation tooltip: shows suggested hours range for H/M/L for that item

---

#### METHOD 2 — HOURS-BASED

**Simple mode fields (on fee_records):**
```sql
hb_simple_hours_per_month  decimal(10,2)
hb_simple_duration_months  integer
hb_simple_role             enum  -- FK to rate card role
hb_simple_rate             decimal(10,2)
-- total_fee = hours_per_month × duration_months × rate
```

**Detailed mode — Staffing Curve:**
Uses staffing_projections and projection_monthly_detail tables (see Section 6.3 below).
Method 2 Detailed automatically creates and populates the staffing projection.
This is the only method that does so automatically — all others require
manual projection completion before execution is permitted.

---

#### METHOD 3 — TARGET FEE (Reverse Engineer)

**Target fee fields (on fee_records):**
```sql
tf_target_fee           decimal(12,2)  -- the starting constraint
tf_feasibility          enum('Viable','Tight','Below-Cost')  -- system calculated
tf_available_hours      decimal(10,2)  -- system calculated given team + rates
tf_margin_at_target     decimal(5,2)   -- system calculated %
```

UI shows: given this fee, this team, this duration — here is what PMG can deliver,
what the margin is, and whether it is viable.

---

#### DISCOUNTS

**fee_discounts table:**
```sql
discount_id          uuid PK default gen_random_uuid()
fee_id               uuid FK → fee_records NOT NULL
discount_type        enum('Nonprofit','Lump-Sum-Billing',
                    'Relationship-Discretionary','Rate-Discount')
applied_at           enum('Line-Item','Total-Fee','Hourly-Rate')
discount_amount      decimal(12,2)  -- dollar amount (use one OR the other)
discount_pct         decimal(5,2)   -- percentage (use one OR the other)
notes                text NOT NULL  -- required for all discounts — audit trail
tax_write_off_eligible boolean default false  -- true for Nonprofit type
created_by           uuid FK → auth.users
created_at           timestamptz default now()
```

Discounts display as line items on the fee summary.
Nonprofit discounts generate a separate report for tax/accounting purposes.
discounted_fee on fee_records = total_fee minus all applicable discounts.

---

#### STAFFING PROJECTION (Required Gate — Must Complete Before Execution)

**Three input modes:**

**Straight-Line (Automatic) — always available, one click:**
Enter start_date and end_date. System divides total_fee evenly across all months.
Least accurate but always compliant with the gate requirement.
Can be refined into a more detailed projection later — that becomes a re-forecast,
not a new baseline. Original baseline is immutable.

**Curve-Weighted (Guided):**
User selects distribution shape from: Front-Loaded, Back-Loaded, Bell-Curve,
Custom-Percentage. System applies shape to total fee across months.
User can adjust individual months after shape is applied.

**Manual (Detailed):**
Full month-by-month entry per team member.
Pre-populated automatically if Method 2 Detailed was used for fee.
Otherwise blank: rows = team members, columns = months.

**staffing_projections table:**
```sql
projection_id    uuid PK default gen_random_uuid()
project_id       uuid FK → projects NOT NULL
fee_id           uuid FK → fee_records NOT NULL
input_mode       enum('Straight-Line','Curve-Weighted','Manual')
status           enum('Draft','Baseline','Current','Superseded') default 'Draft'
created_at       timestamptz default now()
updated_at       timestamptz default now()
locked_at        timestamptz  -- set when status → Baseline
locked_by        uuid FK → auth.users
```

**projection_monthly_detail table:**
```sql
detail_id            uuid PK default gen_random_uuid()
projection_id        uuid FK → staffing_projections NOT NULL
user_id              uuid FK → auth.users  -- nullable for role-based
role                 enum  -- role being projected
month                date NOT NULL  -- always first day of month
projected_hours      decimal(10,2)
projected_amount     decimal(12,2)  -- projected_hours × rate
actual_hours         decimal(10,2)  -- populated from approved timesheets
actual_amount        decimal(12,2)
reforecast_hours     decimal(10,2)  -- system calculated
reforecast_amount    decimal(12,2)  -- system calculated
```

**Re-forecast Logic — CRITICAL, automatic, runs on every timesheet approval:**

When a timesheet is approved, for each project in that timesheet:
1. Sum actual_hours and actual_amount for all completed months
2. Calculate total variance: baseline_total - actual_total_to_date
3. Remaining fee = contracted_fee - actual_amount_to_date
4. Distribute remaining fee across future months proportionally,
   weighted by the original baseline curve shape for those months
5. If under baseline: remaining months increase proportionally
6. If over baseline: remaining months compress proportionally
7. Update reforecast_hours and reforecast_amount for all future months
8. If any future month's reforecast_amount drops below
   (project.add_services_threshold_pct / 100) × that month's baseline_amount,
   trigger add services warning flag on project record

**Immutability:** Baseline projection (status = 'Baseline') rows are never updated.
Re-forecast updates only reforecast_hours and reforecast_amount columns.
projected_hours and projected_amount in Baseline records are permanent.

---

### 6.4 RATE CARDS

**Purpose:** Every billing rate in Alta•Via flows from here.
Historical accuracy is non-negotiable — timesheet entries always calculate
at the rate in effect on the date the work was performed.

**rate_cards table:**
```sql
rate_id             uuid PK default gen_random_uuid()
user_id             uuid FK → auth.users  -- null for role-based rates
role                enum('Principal','Sr-PM','PM','Coordinator','Contracts',
                   'CM','Scheduling','Sustainability','BD','Admin','Custom')
rate_type           enum('Person-Specific','Role-Based')
billable_rate       decimal(10,2) NOT NULL  -- charged to clients
internal_cost_rate  decimal(10,2)  -- fully loaded PMG cost — Principal visibility only
effective_date      date NOT NULL
end_date            date  -- null = currently active
is_active           boolean default true
notes               text
created_by          uuid FK → auth.users
created_at          timestamptz default now()
```

**Rate lookup — always date-sensitive:**
```sql
WHERE (user_id = $user_id OR (role = $role AND rate_type = 'Role-Based'))
AND effective_date <= $work_date
AND (end_date IS NULL OR end_date >= $work_date)
ORDER BY rate_type = 'Person-Specific' DESC  -- person-specific takes priority
LIMIT 1
```

**rate_overrides table (project-specific):**
```sql
override_id       uuid PK default gen_random_uuid()
project_id        uuid FK → projects NOT NULL
user_id           uuid FK → auth.users  -- null for role-based override
role              enum  -- null for person-specific override
override_rate     decimal(10,2) NOT NULL
effective_date    date NOT NULL
notes             text NOT NULL
created_by        uuid FK → auth.users
created_at        timestamptz default now()
```

Override takes precedence over standard rate card for that project.
Rate lookup checks overrides first, falls back to rate_cards.

**Rate card UI:**
- Active rates table: employee/role, current rate, effective date
- Rate history per employee: all historical records with dates
- Add rate form: always creates new record with effective_date — never edits existing
- Role-based rates section separate from person-specific
- internal_cost_rate column visible to Principal role only (RLS enforced)
- Annual review workflow: duplicate previous year's rates, update amounts, set new effective_date

**users table extension (extends Supabase auth.users):**
```sql
-- public.users (mirrors/extends auth.users)
user_id                uuid PK references auth.users
first_name             text
last_name              text
role                   enum('Principal','Sr-PM','PM','Coordinator',
                      'Contracts','BD','Admin','Custom')
utilization_target_pct decimal(5,2)  -- individual target, e.g. 85.00
is_active              boolean default true
hire_date              date
department             text
created_at             timestamptz default now()
updated_at             timestamptz default now()
```

---

### 6.5 TIMESHEETS

**Purpose:** Weekly time entry for all employees. Billable/non-billable is
structurally determined by the code type — never by employee input.
Feeds utilization calculations, invoice generation, and staffing re-forecast.

**billing_codes table:**
```sql
code_id                  uuid PK default gen_random_uuid()
code                     text UNIQUE NOT NULL  -- "PMG-2026-001", "BD", "TRAIN"
description              text NOT NULL
code_type                enum('Project','Non-Billable')
is_billable              boolean NOT NULL  -- inherited from code_type, not user-set
requires_description     boolean default false  -- triggers popup on cell entry
non_billable_category    enum('Business-Development','Training','Administration',
                        'Education','PTO','Holiday','Other')  -- null for Project codes
project_id               uuid FK → projects  -- null for Non-Billable codes
is_active                boolean default true
created_at               timestamptz default now()
```

**Pre-loaded non-billable codes (from seed script):**
```
BD      | Business Development  | Non-Billable | requires_description: false
TRAIN   | Training & Education  | Non-Billable | requires_description: false
ADMIN   | Administration        | Non-Billable | requires_description: false
PTO     | Paid Time Off         | Non-Billable | requires_description: false
HOLIDAY | Holiday               | Non-Billable | requires_description: false
OOO     | Out of Office         | Non-Billable | requires_description: false
```

Project codes created automatically when project status → Active.
Code value = project.project_number.

**timesheets table:**
```sql
timesheet_id     uuid PK default gen_random_uuid()
user_id          uuid FK → auth.users NOT NULL
week_start_date  date NOT NULL  -- always Sunday
week_end_date    date NOT NULL  -- always Saturday
billing_month    date NOT NULL  -- first day of billing month this week belongs to
status           enum('Draft','Submitted','Approved','Returned','Locked') default 'Draft'
submitted_at     timestamptz
submitted_by     uuid FK → auth.users
approved_at      timestamptz
approved_by      uuid FK → auth.users
returned_at      timestamptz
returned_by      uuid FK → auth.users
return_notes     text
created_at       timestamptz default now()
updated_at       timestamptz default now()
UNIQUE(user_id, week_start_date)
```

**timesheet_entries table:**
```sql
entry_id          uuid PK default gen_random_uuid()
timesheet_id      uuid FK → timesheets NOT NULL
code_id           uuid FK → billing_codes NOT NULL
entry_date        date NOT NULL
hours             decimal(5,2) NOT NULL
description       text  -- required when billing_code.requires_description = true
service_category  enum('A','B','C','D','E','F','G','H','I')  -- optional, for benchmarking
is_billable       boolean NOT NULL  -- copied from billing_code.is_billable at entry time
rate_applied      decimal(10,2)  -- rate card rate on entry_date — set on approval
amount            decimal(12,2)  -- hours × rate_applied — set on approval
created_at        timestamptz default now()
updated_at        timestamptz default now()
```

**Timesheet UI — Full Specification:**

**Page opening:**
- Opens to current week automatically
- Week selector dropdown at top of page
- Each week in dropdown shows status badge:
  Approved (green) / Submitted-Pending (amber) / Draft (gray) / Missing (red)
- Missing = prior week with no timesheet record exists
- Future weeks accessible but blank

**New week state:**
Completely blank — no codes, no hours, no pre-population. Clean slate.

**Action buttons (top of page, left of utilization dashboard):**

COPY (dropdown):
- "Copy Previous" — imports code list from immediately preceding submitted week
- "Select Week" — opens date picker / week list; user selects any prior week
- Copy behavior: code list only — no hours, no descriptions transferred
- Code list is fully editable immediately after copy — not locked
- If any codes already exist: confirm before overwriting

SAVE:
- Saves current state as Draft
- No notification sent, no workflow triggered
- Auto-save also runs every 60 seconds in background

SUBMIT:
- Validates: at least one entry with hours > 0
- Sets status = 'Submitted', submitted_at = now()
- Locks timesheet — employee cannot edit
- Sends notification to assigned approver
- Cannot be undone by employee — only Principal can unlock

**Grid layout:**

Header row: Code | Description | [Sun date] | [Mon date] | [Tue date] |
            [Wed date] | [Thu date] | [Fri date] | [Sat date] | Week Total | [Delete]

Data rows:
- Code cell: smart search input — type code number OR description text
  — auto-completes both directions, shows matching options in dropdown
  — on selection: populates code and description, determines is_billable from code
- Description cell: read-only, auto-populated from code
- Day cells (Sun-Sat): numeric input for hours (decimal, e.g. 2.5)
  — greyed out and disabled for dates outside current billing_month
  — on click: if code.requires_description = true AND hours entered,
    opens description popup (text area, save button)
  — on click: if code is Project type, shows optional service_category dropdown
    (A through I, optional, one click, saves to entry)
- Week Total cell: auto-calculated sum, read-only
- Delete button: icon button far right, always visible on rows with codes
  — if row has hours: "This row has hours logged. Delete anyway?" confirmation
  — blank rows: no delete button shown

**Blank bottom row:**
- Always one blank row at bottom of the grid
- Activates when user starts typing in Code cell
- When a code is entered in current blank row, new blank row appears below
- No "Add Row" button — the blank row IS the add mechanism

**Footer row (below all code rows, per day column):**
- Total hours for the day (all codes)
- Billable hours for the day (is_billable = true codes only)
- Daily utilization % = billable_hours ÷ (utilization_target_pct/100 × 8)
  — color coded: ≥target green, 60-99% amber, <60% red

**Footer summary (bottom right):**
- Total hours for week
- Total billable hours for week
- Weekly utilization % = total_billable ÷ (utilization_target_pct/100 × 40)
- Color coded same as daily

**Description popup (modal):**
- Triggered: cell click when code.requires_description = true and hours > 0
- Simple modal: project name + date as header, textarea for description, Save button
- Saved to entry.description
- Flows to invoice if project.invoice_detail_level = 'By-Employee-with-Descriptions'

**Service category dropdown:**
- Appears inline below hours cell on click for Project codes only
- Nine options labeled: A - Predevelopment, B - Design Consultant Selection, etc.
- Optional — never required, never blocks submit
- Closes automatically on selection
- Stored in entry.service_category

**Utilization dashboard panel (persistent, right side or top of page):**
Shows employee's own data only. Real-time — updates as hours are entered.

Metrics displayed:
- This week: X hrs billable / Y hrs target / Z% utilization / on-track indicator
- Last week: X% actual
- Last month: X% actual
- Last quarter: X% actual
- YTD: X% actual vs [target]% target
- Projected year-end: at current pace, will hit X% — [on track / X hrs/week needed]

Color coding: ≥target green, 60-99% amber, <60% red

**Month boundary enforcement:**
- billing_month on timesheet record = month that contains the majority of the week
  OR the month the work falls in for split weeks
- Day cells outside billing_month: background #E5E7EB, disabled, cannot receive input
- Week selector correctly shows partial weeks at month boundaries
- A week spanning Jan 31 - Feb 6 creates entries in two billing months if needed
  (one timesheet per billing_month per week_start_date per user)

**Notifications:**
- Friday 4pm: reminder if current week timesheet not Submitted (configurable)
- Monday 9am: alert if prior week still not Submitted (configurable)
- Day 5+ overdue: escalation notification to assigned manager / Principal
- All notifications: in-app notification + email

**Approval workflow:**
1. Employee submits → status = 'Submitted'
2. Approver notified (assigned manager or Principal)
3. Approver reviews in leadership dashboard
4. Approve → status = 'Approved', rate_applied and amount populated on all entries,
   triggers re-forecast update on all referenced projects
5. Return → status = 'Returned', return_notes required,
   employee notified, timesheet unlocks for editing
6. After correction: employee resubmits → back to step 2

**Unlock (Principal only):**
Approved timesheets can be unlocked by Principal for correction.
Unlock requires notes explaining reason. Audit log entry created.
After correction and resubmission, re-approval required.

**Leadership timesheet status dashboard (separate view):**
- All active employees listed
- Current week status per employee with days-since indicator
- Prior weeks: any missing or pending flagged
- Bulk actions: send reminder, escalate
- Real-time, no manual refresh

---

### 6.6 INVOICING & AR

**Purpose:** Generate, review, approve, deliver, and track invoices.
Close the loop between time worked and money collected.

**invoices table:**
```sql
invoice_id             uuid PK default gen_random_uuid()
invoice_number         text UNIQUE NOT NULL  -- auto-generated sequential
project_id             uuid FK → projects NOT NULL
client_id              uuid FK → clients NOT NULL
billing_period_start   date NOT NULL
billing_period_end     date NOT NULL
invoice_date           date NOT NULL default CURRENT_DATE
due_date               date NOT NULL  -- invoice_date + payment_terms days
status                 enum('Draft','Stage1-Review','Stage2-Review','Approved-Hold',
                      'Sent','Partially-Paid','Paid','Overdue','Disputed','Written-Off')
                      default 'Draft'
subtotal               decimal(12,2)
discount_amount        decimal(12,2) default 0
total_due              decimal(12,2)
amount_paid            decimal(12,2) default 0
balance_due            decimal(12,2)
pdf_url                text  -- Supabase Storage URL
sent_at                timestamptz
sent_by                uuid FK → auth.users
stage1_approved_at     timestamptz
stage1_approved_by     uuid FK → auth.users
stage2_approved_at     timestamptz
stage2_approved_by     uuid FK → auth.users
notes                  text
created_at             timestamptz default now()
updated_at             timestamptz default now()
created_by             uuid FK → auth.users
```

**invoice_line_items table:**
```sql
invoice_line_id    uuid PK default gen_random_uuid()
invoice_id         uuid FK → invoices NOT NULL
user_id            uuid FK → auth.users  -- null for summary lines
user_name          text  -- denormalized — preserves name at invoice generation time
role               text  -- denormalized
hours              decimal(10,2)
rate               decimal(10,2)
amount             decimal(12,2)
descriptions       text[]  -- array of timesheet entry descriptions
sort_order         integer
```

**payments table:**
```sql
payment_id      uuid PK default gen_random_uuid()
invoice_id      uuid FK → invoices NOT NULL
amount          decimal(12,2) NOT NULL
payment_date    date NOT NULL
payment_method  enum('Check','ACH','Wire','Credit-Card','Other')
reference       text  -- check number, wire ref, etc.
notes           text
recorded_by     uuid FK → auth.users
created_at      timestamptz default now()
```

**invoice_collection_log table:**
```sql
log_id           uuid PK default gen_random_uuid()
invoice_id       uuid FK → invoices NOT NULL
contact_date     date NOT NULL
contact_method   enum('Phone','Email','In-Person','Letter')
contacted_by     uuid FK → auth.users
spoke_with       text  -- name of client contact
notes            text NOT NULL
promised_date    date  -- client committed to pay by this date
is_disputed      boolean default false
created_at       timestamptz default now()
```

**Invoice Generation Process:**
1. Principal or Admin triggers generation at month end
2. System checks for each active project:
   - Are all timesheet_entries for this project × billing_month Approved?
   - If no: list missing/pending timesheets, require Principal decision:
     a) Wait for outstanding timesheets, or
     b) Proceed with approved hours only (note on invoice)
3. Aggregate approved entries per project.invoice_detail_level:
   - Summary: one line, total hours, total amount
   - By-Employee: one line per user_id, hours and amount
   - By-Employee-with-Descriptions: same + array of entry.description values
4. Apply any fee_discounts with discount_type applicable to billing
5. Calculate subtotal, discount_amount, total_due
6. Create invoice record, status = 'Draft'
7. Generate PDF (store in Supabase Storage, save URL to pdf_url)
8. Update status = 'Stage1-Review', notify Stage 1 reviewer

**PDF Structure:**

HEADER:
- PMG logo (from /public/assets/pmg-logo.png)
- PMG name, address, phone, email
- "INVOICE" title
- Invoice #, Invoice Date, Billing Period
- Bill To: client company name + billing address
- Project: project_name (project_number)
- Contract Reference: contract_type + executed_date
- PO Number (if applicable)

BODY:
Line items per invoice_detail_level setting
Subtotal line
Discount lines (one per discount, labeled by type)
TOTAL DUE line (bold)

FEE TRACKING SUMMARY BOX:
| Original Contracted Fee | $XXX,XXX |
| Previously Billed       | $XXX,XXX |
| This Invoice            | $XXX,XXX |
| Total Billed to Date    | $XXX,XXX |
| Remaining Fee Balance   | $XXX,XXX |
| % of Fee Consumed       | XX%      |

OUTSTANDING BALANCE TABLE (default: show all open invoices for this project):
| Invoice # | Date | Amount | Days Outstanding |
(configurable per project: Show All / Overdue Only / Hide)
Total Outstanding: $XXX,XXX

FOOTER:
Payment Terms: Net XX
Payment Instructions: [ACH info / Check payable to / Wire instructions]
[Late payment language from firm_settings]
Thank you for your business.

**Two-Stage Approval Workflow:**

Stage 1 — Project Team Review (target: 48 hours):
- Reviewer: project_manager on the project
- Notification: email + in-app on invoice creation
- Actions:
  - Approve → status = 'Stage2-Review', notify Principal
  - Return → status = 'Draft', return_notes required, notify creator
  - Flag → Approve but add note for Principal attention
- Reviewer sees outstanding balance summary during review
- Escalation notification if not actioned within 48 hours

Stage 2 — Principal Final Approval (target: 24 hours):
- Reviewer: Principal / designated billing approver
- Actions:
  - Approve & Send → generates/confirms PDF, sends email, status = 'Sent'
  - Approve & Hold → status = 'Approved-Hold' (awaiting timing/call)
  - Return to Stage 1 → status = 'Stage1-Review', notes required
  - Edit then Approve → minor edits permitted before approval, then send
- Escalation notification if not actioned within 24 hours

**Automated Email Delivery (triggered by Approve & Send):**
- To: client contacts where is_invoice_recipient = true
- CC: PMG team members configured at project level
- Subject: "Invoice #[number] — [Project Name] — [Billing Period]"
- Body: firm-level template with merge fields (project, amount, due date, payment instructions)
- Attachment: invoice PDF
- Sent from PMG email address via configured SMTP (Resend or equivalent)
- Delivery logged: sent_at, recipients, delivery status

**Payment Recording:**
- Select open invoice
- Enter: amount, payment_date, payment_method, reference, notes
- System calculates: amount_paid + new payment amount
- If amount_paid + payment = total_due: status = 'Paid', balance_due = 0
- If amount_paid + payment < total_due: status = 'Partially-Paid', balance_due updates
- Payment record created in payments table
- Paid invoices: immutable (no further edits to invoice record)

**AR Dashboard:**
Real-time table of all open invoices across all projects.

Columns: Invoice # | Project | Client | Invoice Date | Due Date |
         Amount | Paid | Balance | Days Outstanding | Status

Aging summary at top: Current | 1-30 | 31-60 | 61-90 | 90+ (dollar totals per bucket)
Sortable by any column. Filterable by project, client, status, aging bucket.
Export to CSV button.

**Late Payment Automation:**
- X days before due (configurable, default 5): reminder notification to AR manager
- On due date if unpaid: flag invoice, notification to Principal
- 30 days overdue: escalation notification
- 60 days overdue: escalation notification
- 90 days overdue: escalation notification + recommend collection log entry

**Cash Position View (on AR dashboard):**
- Month-to-date: payments received
- Open invoices: sum by expected payment date
- 90-day forward: projected invoice generation from staffing re-forecasts
- Simple cash flow chart: expected in by month for next 3 months

**Standalone — no accounting integration in v1:**
CSV export covers accountant handoff.
QuickBooks / accounting software integration is a planned v2 feature.
Design data model to support future integration (clean invoice/payment records,
clear status tracking, no workarounds that would complicate export later).

---

## 7. PHASE 2 — INTELLIGENCE LAYER (Future Spec)

To be fully specced in Alta•Via Workshop before build begins.

**Financial Projections**
Firm-level revenue view combining all active project re-forecasts.
Actual vs projected at firm level. Cash flow forward view.
Add services warning dashboard across all projects simultaneously.

**Staffing & Utilization**
Firm-wide capacity view: stack all project staffing curves.
Every employee, every project, every month — demand vs capacity.
Light/heavy staffing signal. Feeds hiring and BD decisions.
Individual utilization metrics feed into Rate Development Tool (Phase 3).

**Expense Reports**
Employee expense submission, approval workflow, billable vs overhead coding.
Billable expenses flow to project invoicing alongside timesheet-based line items.
Overhead expenses tracked as firm operating costs.

---

## 8. PHASE 3 — FRONT END (Future Spec)

**Full CRM & Pipeline**
Pursuit tracking: leads, proposals, probability, projected fee, expected start.
Win rate, conversion rate, pipeline dashboard.
Connects to Client Records from Phase 1 — no new client data entry.

**Rate Development Tool**
Dynamic rate modeling: fully_loaded_cost ÷ target_billable_hours × (1 + margin).
Inputs: salary, benefits, taxes, overhead allocation, utilization target, margin target.
Scenario modeling. Annual rate setting with prior year actuals pre-populated.
Real-time alert when actual margin diverges from target margin.
Utilization assumption connects to actual utilization from Phase 2.

---

## 9. PHASE 4 — INFRASTRUCTURE (Future Spec)

**User Roles & Permissions — Full UI Implementation**
Role-based access fully surfaced in UI (database already enforces it from Phase 1).
User management interface for Principals.
Invite flow, role assignment, deactivation.

**Reporting & Dashboard**
Firm-level executive dashboard.
Project health across all active projects.
Financial performance: revenue, margin, utilization by person and project.
AR aging summary. Pipeline to revenue conversion. Exportable reports.

---

## 10. FUTURE PRODUCT — ARCHIVIO (Concept Only)

Third product in the Vetta suite. Not in scope for this build.

**Concept:** Qualifications and experience database.
Search employees by project type, client, scope, keywords.
Generate pursuit-specific and project-specific resumes per employee.
Pull project data from Vetta and Alta•Via automatically — no re-entry.
Serves BD and marketing functions.

Name "Archivio" is a placeholder — naming not yet finalized.
Lowest priority build in the entire portfolio.

---

## 11. KEY DATA RELATIONSHIPS

```
firm_settings (1 record)

clients
  └── client_contacts (many)
  └── projects (many)
      └── project_team_assignments (many → users)
      └── billing_codes (1 project code, auto-created on activation)
      └── fee_records (many)
          └── fee_line_items (many → scope_library)
          └── fee_discounts (many)
      └── staffing_projections (many)
          └── projection_monthly_detail (many → users)
      └── timesheets (many → users)
          └── timesheet_entries (many → billing_codes)
      └── invoices (many)
          └── invoice_line_items (many)
          └── payments (many)
          └── invoice_collection_log (many)

users (extends auth.users)
  └── rate_cards (many — full history preserved)
  └── rate_overrides (many — project specific)

scope_library (firm-level, ~123 items pre-loaded)
  └── fee_line_items (many — referenced by fees)

billing_codes
  └── timesheet_entries (many)
```

---

## 12. CRITICAL ARCHITECTURAL DECISIONS

**Schema supports all phases from day one.**
Do not design Phase 1 tables in isolation. Every table must be compatible with
Phase 2-4 additions. Foreign keys, enums, and field structures must anticipate
future modules even if the UI does not surface them yet.

**Responsive-first — no exceptions.**
Every component built with mobile/tablet breakpoints from first commit.
iPad is a primary device for timesheet entry — treat as equal to desktop.
Do not build desktop components and retrofit responsiveness later.
This is the lesson from Vetta's responsive debt. Do not repeat it.

**Immutability rules — enforce at database level:**
- Executed fee records: RLS policy prevents updates after executed_at is set
- Baseline projections: projected_hours and projected_amount columns never updated
- Approved timesheet entries: RLS prevents updates, Principal unlock required
- Paid invoices: no edits to invoice record after status = 'Paid'
- Rate history: never delete rate_cards records, only add new with effective_date

**Re-forecast is automatic and background.**
Runs on every timesheet approval. Users do not trigger it.
Must be efficient — avoid N+1 queries, use single SQL update per project per approval.

**Billable determination is structural — not user input.**
is_billable on timesheet_entries is ALWAYS copied from billing_code.is_billable.
Employee has no ability to override. Enforce in database trigger, not just UI.

**Rate lookup is always date-sensitive.**
Never apply a current rate to a historical entry.
Always use the rate in effect on the entry_date.
Rate lookup function must be used consistently — no shortcuts.

**One source of truth — no duplication.**
Client data: clients table only.
Project data: projects table only.
User data: users table only.
Denormalize ONLY for PDF stability (user_name and role on invoice_line_items).
All other references are foreign keys.

**React Context from day one.**
No prop drilling anywhere in the codebase.
Create contexts for: AuthContext, ProjectContext, TimesheetContext, NotificationContext.
Add contexts as needed — never pass data more than one level as props.

**Supabase RLS on every sensitive table.**
Principal-only: internal_cost_rate, margin calculations, all users' financial data.
Employee-scoped: timesheets (own only), utilization data (own only).
Project-scoped: project financial data visible to assigned team + Principal.
Test RLS policies before moving to next module.

---

## 13. SCOPE LIBRARY — PRE-LOAD REFERENCE

Source file: `PROJECT_NAME_Attachment_A_-_Scope_of_Services_-_Update.xlsx`

123 line items across 2 phases and 9 categories:

Phase 1 Preconstruction (Items 1-87):
- A: Predevelopment (1-32) — 32 items
- B: Design Consultant Selection/Negotiations (33-44) — 12 items
- C: Contractor Selection/Negotiations (45-58) — 14 items
- D: Preconstruction Meetings & Coordination (59-72) — 14 items
- E: Other Vendor Procurement (73-87) — 15 items

Phase 2 Construction & Closeout (Items 88-123):
- F: Cost/Schedule/Quality Control (88-91) — 4 items
- G: Construction Phase (92-108) — 17 items
- H: Other Vendors Construction (109-123) — 15 items
- I: Other Scope — open/custom

Default roles and rates (PMG 2026 — update via rate card annually):
- PM: $205.00/hr
- Contracts: $245.00/hr
- CM: $205.00/hr
- Scheduling: $187.50/hr
- Sustainability: $245.00/hr

Write seed script to load all 123 items from source Excel file.
Preserve: item_number, phase, category, activity_name, standard_description,
default_unit, default_role. Set default_participation_level = 'Medium' for all items.
is_custom = false for all seeded items.

---

## 14. SESSION 1 — STARTING INSTRUCTIONS

**Objective:** Complete Supabase schema setup and project scaffold.
No UI components in Session 1. Schema correctness is the only deliverable.

**Step 1 — Project Setup:**
```
1. Create GitHub repository: alta-via
2. Initialize: git init, add CLAUDE.md to root
3. Create Vite + React app: npm create vite@latest . -- --template react
4. Install dependencies:
   npm install @supabase/supabase-js react-router-dom
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
5. Configure Tailwind (tailwind.config.js content paths)
6. Create .env file:
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
7. Add to .gitignore: .env, node_modules, dist
8. Create src/lib/supabase.js with client initialization
9. Confirm: npm run dev — dev server runs on localhost:5173
10. First git commit: "Initial project scaffold"
```

**Step 2 — Supabase Project:**
```
1. Create new Supabase project: alta-via (or alta-via-pmg)
2. Copy Project URL and anon key to .env
3. Update this CLAUDE.md with:
   - Supabase Project ID
   - Supabase Project URL
   - GitHub repo URL
```

**Step 3 — Database Schema (SQL Migrations):**
Write and execute migrations for all tables in this exact order
(respects foreign key dependencies):

```sql
-- 1. firm_settings
-- 2. public.users (extends auth.users)
-- 3. clients
-- 4. client_contacts
-- 5. projects
-- 6. project_team_assignments
-- 7. billing_codes
-- 8. scope_library
-- 9. rate_cards
-- 10. rate_overrides
-- 11. fee_records
-- 12. fee_line_items
-- 13. fee_discounts
-- 14. staffing_projections
-- 15. projection_monthly_detail
-- 16. timesheets
-- 17. timesheet_entries
-- 18. invoices
-- 19. invoice_line_items
-- 20. payments
-- 21. invoice_collection_log
```

Use exact field names, types, and constraints from Section 6 of this document.
Create all enums before tables that reference them.
Add updated_at trigger function to all tables with updated_at column.

**Step 4 — RLS Policies:**
Enable RLS on all tables.
Write policies for Principal, Sr-PM/PM, Coordinator, Admin roles.
Test: create test users for each role, verify access boundaries.

**Step 5 — Seed Data:**
Write and run seed script for:
- 1 firm_settings record (PMG defaults)
- 6 non-billable billing codes (BD, TRAIN, ADMIN, PTO, HOLIDAY, OOO)
- 123 scope_library items from Attachment A Excel file

**Step 6 — Verification:**
- Open Supabase table editor
- Confirm all 21 tables exist with correct columns
- Confirm all foreign key relationships
- Confirm enum types
- Confirm RLS is enabled on all tables
- Confirm seed data is present
- Take screenshot of table list for build log

**Do NOT build any UI components in Session 1.**
**Confirm schema in Supabase before ending session.**
**Update BUILD LOG below before closing.**

---

## 15. WORKSHOP → BUILD HANDOFF PROTOCOL

This chat (Alta•Via Workshop) handles all strategy and spec decisions.
Claude Code (Alta•Via Build) handles all implementation.

**When to come back to Workshop:**
- Something isn't working as specced — discuss before hacking a workaround
- A new requirement emerges — spec it here first
- An architectural decision needs to be made — always decide here
- A module needs fuller spec before build begins

**Workshop outputs Build Directives:**
Each Claude Code session receives a scoped Build Directive:
- What to build (specific, one module or component at a time)
- Which files to touch
- Relevant spec section from CLAUDE.md
- Constraints and conventions
- How to verify it worked

**Paste this at the start of every Claude Code session:**
"Read CLAUDE.md fully before writing any code.
We are on Session [N]. Today's objective is [specific task].
Follow all conventions in CLAUDE.md. Confirm your understanding
of the task before beginning."

---

## 16. BUILD LOG

### Session 1 — 2026-05-20
**Objective:** Supabase schema + project scaffold
**What was built:**
- Complete database schema: 25 enum types, 21 tables in FK-dependency order, 10 triggers/functions, and performance indexes (`001_schema.sql`)
- Full RLS policies: all 21 tables enabled, 5 SECURITY DEFINER helper functions (`is_principal`, `is_pm_or_above`, `is_admin_billing`, `is_assigned_to_project`, `get_my_role`), all role-scoped policies (`002_rls.sql`)
- Seed data: 1 firm_settings record (PMG defaults), 6 non-billable billing codes, 123 scope_library placeholder rows keyed by correct phase/category/item_number/sort_order (`003_seed.sql`)
- Supabase client: `src/lib/supabase.js`
- Full `src/` directory structure: `/components/layout`, `/components/ui`, `/components/clients`, `/components/projects`, `/components/fees`, `/components/rates`, `/components/timesheets`, `/components/invoicing`, `/context`, `/hooks`, `/pages`

**Key decisions made:**
- Executed fee immutability: DB trigger allows ONLY the `Executed → Superseded` status transition after execution — all other field changes blocked. Application must supersede the old fee before executing the new one.
- Single executed fee enforced by trigger (not just application logic): raises exception if a second `Executed` fee would exist on the same project simultaneously.
- `is_billable` on `timesheet_entries` is overwritten by a BEFORE INSERT/UPDATE trigger from the billing code — employee input is structurally impossible to override.
- Baseline projection `projected_hours`/`projected_amount` locked by trigger; only `reforecast_hours`/`reforecast_amount` columns update post-baseline.
- `scope_role_enum` (PM/Contracts/CM/Scheduling/Sustainability/Custom) used for scope library and fee line items; `rate_role_enum` (broader set including Principal/Admin etc.) used for rate cards and projections.
- `internal_cost_rate` column visibility enforced at RLS level: non-Principals can only select their own person-specific rate or role-based rates; application layer must additionally exclude the column from API responses for non-Principals.
- `fee_line_items.total_hours` and `line_total` are GENERATED ALWAYS AS STORED computed columns — no application logic required to maintain them.
- Project billing code auto-created by trigger when project status transitions to `Active`.

**Files created/modified:**
- `supabase/migrations/001_schema.sql` — enums, tables, triggers, indexes (718 lines)
- `supabase/migrations/002_rls.sql` — RLS enable + helper functions + all policies (595 lines)
- `supabase/migrations/003_seed.sql` — firm_settings, billing codes, scope_library stubs (203 lines)
- `src/lib/supabase.js` — Supabase client initialization
- `src/` directory tree — all 11 subdirectories per spec

**Supabase Project ID:** ozkrhngpccwlzjsxezyu
**Supabase Project URL:** https://ozkrhngpccwlzjsxezyu.supabase.co
**GitHub Repo URL:** [Update when repo is pushed to GitHub]

**Verification confirmed:**
- All 21 tables present in Supabase
- firm_settings: 1 row ✓
- billing_codes: 6 rows ✓
- scope_library: 123 rows ✓

**Outstanding before Session 2:**
- Populate scope_library with actual Attachment A data (replace placeholder `activity_name` and `standard_description` values)
- Update `firm_settings` record with actual PMG address, phone, email, and payment instructions
- Push repo to GitHub and update GitHub Repo URL above

**Where we left off:** All 21 tables live in Supabase with RLS enabled. Schema is the authoritative data layer for all Phase 1 modules. No UI has been built.
**Next session:** Session 2 — Client Records UI (client list, client detail, contacts inline)

---

### Session 2 — 2026-05-21
**Objective:** Phase 1 schema additions migration + Client Records UI

**What was built:**
- Ran Section 15 migration: lump sum columns on `projection_monthly_detail`, `projection_type`/add_service fields on `staffing_projections`, `manager_id` on `users`, `add_services` table, `line_type` on `invoice_line_items`
- Updated `firm_settings`: removed PMG-specific data, now uses generic placeholder values
- Fixed Tailwind v4 PostCSS config (`@tailwindcss/postcss` package)
- `FirmContext` and `AuthContext` — loads `firm_settings` from Supabase on mount
- Layout shell: `Sidebar`, `TopBar`, `PageWrapper` — responsive, navy sidebar, orange active indicator, firm name from `FirmContext`
- `App.jsx` — react-router-dom routing, all placeholder pages
- Client Records module: `ClientsPage`, `ClientList`, `ClientDetail`, `ClientForm`, `ContactList`, `ContactForm`
- `Modal` UI primitive

**Key decisions made:**
- Anon RLS policies added temporarily for `clients` and `client_contacts` tables for testing — must be replaced with authenticated policies when auth is implemented
- `firm_settings` requires a public read RLS policy — added
- Tailwind v4 requires `@tailwindcss/postcss` instead of `tailwindcss` directly in `postcss.config.js`
- `index.css` uses `@import "tailwindcss"` instead of `@tailwind` directives

**Files created/modified:**
- `postcss.config.js` — updated for Tailwind v4
- `src/index.css` — updated for Tailwind v4
- `src/main.jsx` — updated
- `src/App.jsx` — react-router-dom routing, all placeholder pages
- `src/context/FirmContext.jsx`
- `src/context/AuthContext.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/components/layout/TopBar.jsx`
- `src/components/layout/PageWrapper.jsx`
- `src/components/ui/Modal.jsx`
- `src/pages/ClientsPage.jsx`
- `src/pages/ClientDetailPage.jsx`
- `src/components/clients/ClientList.jsx`
- `src/components/clients/ClientDetail.jsx`
- `src/components/clients/ClientForm.jsx`
- `src/components/clients/ContactList.jsx`
- `src/components/clients/ContactForm.jsx`

**Verification confirmed:**
- Client list loads from Supabase
- Add client saves and appears in list
- Client detail loads correct client
- Edit client updates correctly
- Add contact saves and appears in contact list
- Soft delete (deactivate) works correctly
- Firm name loads from `firm_settings` — not hardcoded

**Where we left off:** Client Records module fully complete and committed.
**Next session:** Session 3 — Projects module

---

### Session 3 — 2026-05-26
**Objective:** Projects module — list, form, detail with team assignments

**What was built:**
- `ProjectsPage.jsx` — page wrapper
- `ProjectList.jsx` — searchable (name + number) and filterable (status, type) table with color-coded status badges; Add Project button opens modal
- `ProjectForm.jsx` — add/edit mode; add mode reads fresh `firm_settings` at save time to generate project number (PREFIX-YYYY-### or PREFIX-### based on `project_number_include_year`) then increments `project_number_next_seq`; all form fields from spec
- `ProjectDetailPage.jsx` — page wrapper
- `ProjectDetail.jsx` — four info sections (Overview, Timeline, Financial, Contract); clickable client name links to `/clients/:id`; Team Assignments section with add (modal) and remove (soft-delete `is_active = false`); placeholder sections for Fee Development and Invoices
- `AddMemberForm` (inline in ProjectDetail) — user dropdown from `public.users`, role on project text, start/end dates
- `App.jsx` — added `/projects` and `/projects/:id` routes; removed stale Projects placeholder function

**Key decisions made:**
- Project number generated at insert time from a fresh `firm_settings` fetch (not from FirmContext cache) — avoids stale sequence if multiple projects are added in the same session
- `AddMemberForm` lives inside `ProjectDetail.jsx` (not a separate file) — it's project-scoped and has no reuse case
- Team assignment remove is soft-delete (`is_active = false`) per spec's "soft delete only" rule
- `public.users` fetch for team assignment dropdown will return empty until Supabase Auth users + `public.users` rows are populated — handled gracefully with a helper message

**Files created/modified:**
- `src/pages/ProjectsPage.jsx` — new
- `src/pages/ProjectDetailPage.jsx` — new
- `src/components/projects/ProjectList.jsx` — new
- `src/components/projects/ProjectForm.jsx` — new
- `src/components/projects/ProjectDetail.jsx` — new (includes AddMemberForm)
- `src/App.jsx` — updated routes

**Verification confirmed:**
- `npm run build` — 0 errors, 84 modules, clean production build
- Committed and pushed: `cd8b2c7` — "Session 3: Projects module"

**Where we left off:** Projects module fully complete and committed. All six files build clean.
**Next session:** Session 4 — Rate Cards module (built this session)

---

### Session 4 — 2026-05-26
**Objective:** Rate Cards module — two-section list, insert-only form, End Rate soft-deactivation

**What was built:**
- `RateCardsPage.jsx` — page wrapper
- `RateCardList.jsx` — single fetch splits into Role-Based and Person-Specific sections client-side; reusable `RateSection` sub-component (not exported); per-section inactive toggle shows/hides ended rates; "End Rate" sets `end_date = today` and `is_active = false` (no confirm — consistent with deactivate pattern from ContactList); `internal_cost_rate` column always shows "—" (role-gated in Phase 4); Person-Specific section shows user name from `users` join or truncated UUID if no user row
- `RateCardForm.jsx` — insert-only (no update path); rate_type radio (Role-Based / Person-Specific); Person-Specific shows user UUID text input with Phase 4 note; amber info banner reinforces immutability; `effective_date` defaults to today; `internal_cost_rate` field present but optional
- `App.jsx` — replaced `Rates` placeholder with `RateCardsPage`

**Key decisions made:**
- One fetch for all rates, split client-side by `rate_type` — simpler than two separate fetches, avoids duplicate loading states
- `RateSection` lives inside `RateCardList.jsx` — it's not reused anywhere else and keeping it co-located avoids file proliferation
- "End Rate" does NOT show a confirmation dialog — consistent with `handleDeactivate` pattern established in ContactList; the button label is explicit enough
- Person-Specific `user_id` field is a raw UUID text input for now with a clear note; user picker deferred to Phase 4

**Files created/modified:**
- `src/pages/RateCardsPage.jsx` — new
- `src/components/rates/RateCardList.jsx` — new
- `src/components/rates/RateCardForm.jsx` — new
- `src/App.jsx` — updated routes

**Verification confirmed:**
- `npm run build` — 0 errors, 87 modules, clean production build
- Committed and pushed: `4bc6b30` — "Session 4: Rate Cards module"

**Where we left off:** Rate Cards module fully complete and committed.
**Next session:** Session 5 — Fee Development module

---

*Last updated: 2026-05-26*
*Updated by: Claude Code — Session 4*
*Status: Session 4 complete — ready for Session 5*
