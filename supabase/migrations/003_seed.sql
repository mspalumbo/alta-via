-- ============================================================
-- Cortina — Migration 003: Seed Data
-- Run AFTER 002_rls.sql
-- ============================================================


-- ============================================================
-- 1. firm_settings (one record — update fields with actual PMG info)
-- ============================================================

INSERT INTO firm_settings (
  firm_name,
  firm_address, firm_city, firm_state, firm_zip,
  firm_phone, firm_email,
  project_number_prefix, project_number_include_year,
  project_number_format, project_number_reset_annually, project_number_next_seq,
  invoice_number_prefix, invoice_number_next_seq,
  late_payment_text, payment_instructions
) VALUES (
  'Palumbo Management Group',
  '',        -- UPDATE: street address
  '',        -- UPDATE: city
  '',        -- UPDATE: state
  '',        -- UPDATE: zip
  '',        -- UPDATE: phone
  '',        -- UPDATE: billing email
  'PMG',
  true,
  'PREFIX-YYYY-###',
  true,
  1,
  'INV',
  1,
  'Invoices unpaid after the due date are subject to a 1.5% monthly finance charge.',
  ''         -- UPDATE: ACH / wire / check payment instructions
);


-- ============================================================
-- 2. Non-billable billing codes (6 firm-standard codes)
-- ============================================================

INSERT INTO billing_codes
  (code, description, code_type, is_billable, requires_description, non_billable_category)
VALUES
  ('BD',      'Business Development', 'Non-Billable', false, false, 'Business-Development'),
  ('TRAIN',   'Training & Education', 'Non-Billable', false, false, 'Training'),
  ('ADMIN',   'Administration',       'Non-Billable', false, false, 'Administration'),
  ('PTO',     'Paid Time Off',        'Non-Billable', false, false, 'PTO'),
  ('HOLIDAY', 'Holiday',              'Non-Billable', false, false, 'Holiday'),
  ('OOO',     'Out of Office',        'Non-Billable', false, false, 'Other');


-- ============================================================
-- 3. scope_library — 123 placeholder rows
--
-- IMPORTANT: Replace activity_name and standard_description values
-- with the actual content from:
--   PROJECT_NAME_Attachment_A_-_Scope_of_Services_-_Update.xlsx
--
-- Preserve: item_number, phase, category, sort_order exactly as shown.
-- Update: activity_name, standard_description, default_unit, default_role
--         to match the Excel source exactly.
--
-- Default rates (PMG 2026 — apply via rate_cards seed separately):
--   PM: $205.00/hr  |  Contracts: $245.00/hr  |  CM: $205.00/hr
--   Scheduling: $187.50/hr  |  Sustainability: $245.00/hr
-- ============================================================

INSERT INTO scope_library
  (phase, category, item_number, activity_name, default_unit, default_role, default_participation_level, sort_order)
VALUES

-- ── Phase 1 Preconstruction ─────────────────────────────────
-- Category A: Predevelopment (Items 1–32)
('Preconstruction','A-Predevelopment','1',  '[Item 1 — Load from Attachment A]',  'ls','PM','Medium',1),
('Preconstruction','A-Predevelopment','2',  '[Item 2 — Load from Attachment A]',  'ls','PM','Medium',2),
('Preconstruction','A-Predevelopment','3',  '[Item 3 — Load from Attachment A]',  'ls','PM','Medium',3),
('Preconstruction','A-Predevelopment','4',  '[Item 4 — Load from Attachment A]',  'ls','PM','Medium',4),
('Preconstruction','A-Predevelopment','5',  '[Item 5 — Load from Attachment A]',  'ls','PM','Medium',5),
('Preconstruction','A-Predevelopment','6',  '[Item 6 — Load from Attachment A]',  'ls','PM','Medium',6),
('Preconstruction','A-Predevelopment','7',  '[Item 7 — Load from Attachment A]',  'ls','PM','Medium',7),
('Preconstruction','A-Predevelopment','8',  '[Item 8 — Load from Attachment A]',  'ls','PM','Medium',8),
('Preconstruction','A-Predevelopment','9',  '[Item 9 — Load from Attachment A]',  'ls','PM','Medium',9),
('Preconstruction','A-Predevelopment','10', '[Item 10 — Load from Attachment A]', 'ls','PM','Medium',10),
('Preconstruction','A-Predevelopment','11', '[Item 11 — Load from Attachment A]', 'ls','PM','Medium',11),
('Preconstruction','A-Predevelopment','12', '[Item 12 — Load from Attachment A]', 'ls','PM','Medium',12),
('Preconstruction','A-Predevelopment','13', '[Item 13 — Load from Attachment A]', 'ls','PM','Medium',13),
('Preconstruction','A-Predevelopment','14', '[Item 14 — Load from Attachment A]', 'ls','PM','Medium',14),
('Preconstruction','A-Predevelopment','15', '[Item 15 — Load from Attachment A]', 'ls','PM','Medium',15),
('Preconstruction','A-Predevelopment','16', '[Item 16 — Load from Attachment A]', 'ls','PM','Medium',16),
('Preconstruction','A-Predevelopment','17', '[Item 17 — Load from Attachment A]', 'ls','PM','Medium',17),
('Preconstruction','A-Predevelopment','18', '[Item 18 — Load from Attachment A]', 'ls','PM','Medium',18),
('Preconstruction','A-Predevelopment','19', '[Item 19 — Load from Attachment A]', 'ls','PM','Medium',19),
('Preconstruction','A-Predevelopment','20', '[Item 20 — Load from Attachment A]', 'ls','PM','Medium',20),
('Preconstruction','A-Predevelopment','21', '[Item 21 — Load from Attachment A]', 'ls','PM','Medium',21),
('Preconstruction','A-Predevelopment','22', '[Item 22 — Load from Attachment A]', 'ls','PM','Medium',22),
('Preconstruction','A-Predevelopment','23', '[Item 23 — Load from Attachment A]', 'ls','PM','Medium',23),
('Preconstruction','A-Predevelopment','24', '[Item 24 — Load from Attachment A]', 'ls','PM','Medium',24),
('Preconstruction','A-Predevelopment','25', '[Item 25 — Load from Attachment A]', 'ls','PM','Medium',25),
('Preconstruction','A-Predevelopment','26', '[Item 26 — Load from Attachment A]', 'ls','PM','Medium',26),
('Preconstruction','A-Predevelopment','27', '[Item 27 — Load from Attachment A]', 'ls','PM','Medium',27),
('Preconstruction','A-Predevelopment','28', '[Item 28 — Load from Attachment A]', 'ls','PM','Medium',28),
('Preconstruction','A-Predevelopment','29', '[Item 29 — Load from Attachment A]', 'ls','PM','Medium',29),
('Preconstruction','A-Predevelopment','30', '[Item 30 — Load from Attachment A]', 'ls','PM','Medium',30),
('Preconstruction','A-Predevelopment','31', '[Item 31 — Load from Attachment A]', 'ls','PM','Medium',31),
('Preconstruction','A-Predevelopment','32', '[Item 32 — Load from Attachment A]', 'ls','PM','Medium',32),

-- Category B: Design Consultant Selection/Negotiations (Items 33–44)
('Preconstruction','B-Design-Consultant-Selection','33', '[Item 33 — Load from Attachment A]', 'ls','PM','Medium',33),
('Preconstruction','B-Design-Consultant-Selection','34', '[Item 34 — Load from Attachment A]', 'ls','PM','Medium',34),
('Preconstruction','B-Design-Consultant-Selection','35', '[Item 35 — Load from Attachment A]', 'ls','PM','Medium',35),
('Preconstruction','B-Design-Consultant-Selection','36', '[Item 36 — Load from Attachment A]', 'ls','PM','Medium',36),
('Preconstruction','B-Design-Consultant-Selection','37', '[Item 37 — Load from Attachment A]', 'ls','PM','Medium',37),
('Preconstruction','B-Design-Consultant-Selection','38', '[Item 38 — Load from Attachment A]', 'ls','PM','Medium',38),
('Preconstruction','B-Design-Consultant-Selection','39', '[Item 39 — Load from Attachment A]', 'ls','PM','Medium',39),
('Preconstruction','B-Design-Consultant-Selection','40', '[Item 40 — Load from Attachment A]', 'ls','PM','Medium',40),
('Preconstruction','B-Design-Consultant-Selection','41', '[Item 41 — Load from Attachment A]', 'ls','Contracts','Medium',41),
('Preconstruction','B-Design-Consultant-Selection','42', '[Item 42 — Load from Attachment A]', 'ls','Contracts','Medium',42),
('Preconstruction','B-Design-Consultant-Selection','43', '[Item 43 — Load from Attachment A]', 'ls','Contracts','Medium',43),
('Preconstruction','B-Design-Consultant-Selection','44', '[Item 44 — Load from Attachment A]', 'ls','Contracts','Medium',44),

-- Category C: Contractor Selection/Negotiations (Items 45–58)
('Preconstruction','C-Contractor-Selection','45', '[Item 45 — Load from Attachment A]', 'ls','CM','Medium',45),
('Preconstruction','C-Contractor-Selection','46', '[Item 46 — Load from Attachment A]', 'ls','CM','Medium',46),
('Preconstruction','C-Contractor-Selection','47', '[Item 47 — Load from Attachment A]', 'ls','CM','Medium',47),
('Preconstruction','C-Contractor-Selection','48', '[Item 48 — Load from Attachment A]', 'ls','CM','Medium',48),
('Preconstruction','C-Contractor-Selection','49', '[Item 49 — Load from Attachment A]', 'ls','CM','Medium',49),
('Preconstruction','C-Contractor-Selection','50', '[Item 50 — Load from Attachment A]', 'ls','Contracts','Medium',50),
('Preconstruction','C-Contractor-Selection','51', '[Item 51 — Load from Attachment A]', 'ls','Contracts','Medium',51),
('Preconstruction','C-Contractor-Selection','52', '[Item 52 — Load from Attachment A]', 'ls','Contracts','Medium',52),
('Preconstruction','C-Contractor-Selection','53', '[Item 53 — Load from Attachment A]', 'ls','Contracts','Medium',53),
('Preconstruction','C-Contractor-Selection','54', '[Item 54 — Load from Attachment A]', 'ls','Contracts','Medium',54),
('Preconstruction','C-Contractor-Selection','55', '[Item 55 — Load from Attachment A]', 'ls','Contracts','Medium',55),
('Preconstruction','C-Contractor-Selection','56', '[Item 56 — Load from Attachment A]', 'ls','Contracts','Medium',56),
('Preconstruction','C-Contractor-Selection','57', '[Item 57 — Load from Attachment A]', 'ls','Contracts','Medium',57),
('Preconstruction','C-Contractor-Selection','58', '[Item 58 — Load from Attachment A]', 'ls','Contracts','Medium',58),

-- Category D: Preconstruction Meetings & Coordination (Items 59–72)
('Preconstruction','D-Preconstruction-Coordination','59', '[Item 59 — Load from Attachment A]', 'ls','PM','Medium',59),
('Preconstruction','D-Preconstruction-Coordination','60', '[Item 60 — Load from Attachment A]', 'ls','PM','Medium',60),
('Preconstruction','D-Preconstruction-Coordination','61', '[Item 61 — Load from Attachment A]', 'ls','PM','Medium',61),
('Preconstruction','D-Preconstruction-Coordination','62', '[Item 62 — Load from Attachment A]', 'ls','PM','Medium',62),
('Preconstruction','D-Preconstruction-Coordination','63', '[Item 63 — Load from Attachment A]', 'ls','PM','Medium',63),
('Preconstruction','D-Preconstruction-Coordination','64', '[Item 64 — Load from Attachment A]', 'ls','PM','Medium',64),
('Preconstruction','D-Preconstruction-Coordination','65', '[Item 65 — Load from Attachment A]', 'ls','PM','Medium',65),
('Preconstruction','D-Preconstruction-Coordination','66', '[Item 66 — Load from Attachment A]', 'ls','PM','Medium',66),
('Preconstruction','D-Preconstruction-Coordination','67', '[Item 67 — Load from Attachment A]', 'ls','PM','Medium',67),
('Preconstruction','D-Preconstruction-Coordination','68', '[Item 68 — Load from Attachment A]', 'ls','PM','Medium',68),
('Preconstruction','D-Preconstruction-Coordination','69', '[Item 69 — Load from Attachment A]', 'ls','PM','Medium',69),
('Preconstruction','D-Preconstruction-Coordination','70', '[Item 70 — Load from Attachment A]', 'ls','PM','Medium',70),
('Preconstruction','D-Preconstruction-Coordination','71', '[Item 71 — Load from Attachment A]', 'ls','PM','Medium',71),
('Preconstruction','D-Preconstruction-Coordination','72', '[Item 72 — Load from Attachment A]', 'ls','PM','Medium',72),

-- Category E: Other Vendor Procurement (Items 73–87)
('Preconstruction','E-Other-Vendor-Procurement','73', '[Item 73 — Load from Attachment A]', 'ls','Contracts','Medium',73),
('Preconstruction','E-Other-Vendor-Procurement','74', '[Item 74 — Load from Attachment A]', 'ls','Contracts','Medium',74),
('Preconstruction','E-Other-Vendor-Procurement','75', '[Item 75 — Load from Attachment A]', 'ls','Contracts','Medium',75),
('Preconstruction','E-Other-Vendor-Procurement','76', '[Item 76 — Load from Attachment A]', 'ls','Contracts','Medium',76),
('Preconstruction','E-Other-Vendor-Procurement','77', '[Item 77 — Load from Attachment A]', 'ls','Contracts','Medium',77),
('Preconstruction','E-Other-Vendor-Procurement','78', '[Item 78 — Load from Attachment A]', 'ls','Contracts','Medium',78),
('Preconstruction','E-Other-Vendor-Procurement','79', '[Item 79 — Load from Attachment A]', 'ls','Contracts','Medium',79),
('Preconstruction','E-Other-Vendor-Procurement','80', '[Item 80 — Load from Attachment A]', 'ls','Contracts','Medium',80),
('Preconstruction','E-Other-Vendor-Procurement','81', '[Item 81 — Load from Attachment A]', 'ls','Contracts','Medium',81),
('Preconstruction','E-Other-Vendor-Procurement','82', '[Item 82 — Load from Attachment A]', 'ls','Contracts','Medium',82),
('Preconstruction','E-Other-Vendor-Procurement','83', '[Item 83 — Load from Attachment A]', 'ls','Contracts','Medium',83),
('Preconstruction','E-Other-Vendor-Procurement','84', '[Item 84 — Load from Attachment A]', 'ls','Contracts','Medium',84),
('Preconstruction','E-Other-Vendor-Procurement','85', '[Item 85 — Load from Attachment A]', 'ls','Contracts','Medium',85),
('Preconstruction','E-Other-Vendor-Procurement','86', '[Item 86 — Load from Attachment A]', 'ls','Contracts','Medium',86),
('Preconstruction','E-Other-Vendor-Procurement','87', '[Item 87 — Load from Attachment A]', 'ls','Contracts','Medium',87),

-- ── Phase 2 Construction & Closeout ─────────────────────────
-- Category F: Cost/Schedule/Quality Control (Items 88–91)
('Construction','F-Cost-Schedule-Quality','88', '[Item 88 — Load from Attachment A]', 'ls','CM','High',88),
('Construction','F-Cost-Schedule-Quality','89', '[Item 89 — Load from Attachment A]', 'ls','CM','High',89),
('Construction','F-Cost-Schedule-Quality','90', '[Item 90 — Load from Attachment A]', 'ls','CM','High',90),
('Construction','F-Cost-Schedule-Quality','91', '[Item 91 — Load from Attachment A]', 'ls','CM','High',91),

-- Category G: Construction Phase (Items 92–108)
('Construction','G-Construction-Phase','92',  '[Item 92 — Load from Attachment A]',  'ls','CM','High',92),
('Construction','G-Construction-Phase','93',  '[Item 93 — Load from Attachment A]',  'ls','CM','High',93),
('Construction','G-Construction-Phase','94',  '[Item 94 — Load from Attachment A]',  'ls','CM','High',94),
('Construction','G-Construction-Phase','95',  '[Item 95 — Load from Attachment A]',  'ls','CM','High',95),
('Construction','G-Construction-Phase','96',  '[Item 96 — Load from Attachment A]',  'ls','CM','High',96),
('Construction','G-Construction-Phase','97',  '[Item 97 — Load from Attachment A]',  'ls','CM','High',97),
('Construction','G-Construction-Phase','98',  '[Item 98 — Load from Attachment A]',  'ls','CM','High',98),
('Construction','G-Construction-Phase','99',  '[Item 99 — Load from Attachment A]',  'ls','CM','High',99),
('Construction','G-Construction-Phase','100', '[Item 100 — Load from Attachment A]', 'ls','CM','High',100),
('Construction','G-Construction-Phase','101', '[Item 101 — Load from Attachment A]', 'ls','CM','High',101),
('Construction','G-Construction-Phase','102', '[Item 102 — Load from Attachment A]', 'ls','CM','High',102),
('Construction','G-Construction-Phase','103', '[Item 103 — Load from Attachment A]', 'ls','CM','High',103),
('Construction','G-Construction-Phase','104', '[Item 104 — Load from Attachment A]', 'ls','CM','High',104),
('Construction','G-Construction-Phase','105', '[Item 105 — Load from Attachment A]', 'ls','CM','High',105),
('Construction','G-Construction-Phase','106', '[Item 106 — Load from Attachment A]', 'ls','CM','High',106),
('Construction','G-Construction-Phase','107', '[Item 107 — Load from Attachment A]', 'ls','CM','High',107),
('Construction','G-Construction-Phase','108', '[Item 108 — Load from Attachment A]', 'ls','CM','High',108),

-- Category H: Other Vendors Construction (Items 109–123)
('Construction','H-Other-Vendors-Construction','109', '[Item 109 — Load from Attachment A]', 'ls','Contracts','Medium',109),
('Construction','H-Other-Vendors-Construction','110', '[Item 110 — Load from Attachment A]', 'ls','Contracts','Medium',110),
('Construction','H-Other-Vendors-Construction','111', '[Item 111 — Load from Attachment A]', 'ls','Contracts','Medium',111),
('Construction','H-Other-Vendors-Construction','112', '[Item 112 — Load from Attachment A]', 'ls','Contracts','Medium',112),
('Construction','H-Other-Vendors-Construction','113', '[Item 113 — Load from Attachment A]', 'ls','Contracts','Medium',113),
('Construction','H-Other-Vendors-Construction','114', '[Item 114 — Load from Attachment A]', 'ls','Contracts','Medium',114),
('Construction','H-Other-Vendors-Construction','115', '[Item 115 — Load from Attachment A]', 'ls','Contracts','Medium',115),
('Construction','H-Other-Vendors-Construction','116', '[Item 116 — Load from Attachment A]', 'ls','Contracts','Medium',116),
('Construction','H-Other-Vendors-Construction','117', '[Item 117 — Load from Attachment A]', 'ls','Contracts','Medium',117),
('Construction','H-Other-Vendors-Construction','118', '[Item 118 — Load from Attachment A]', 'ls','Contracts','Medium',118),
('Construction','H-Other-Vendors-Construction','119', '[Item 119 — Load from Attachment A]', 'ls','Contracts','Medium',119),
('Construction','H-Other-Vendors-Construction','120', '[Item 120 — Load from Attachment A]', 'ls','Contracts','Medium',120),
('Construction','H-Other-Vendors-Construction','121', '[Item 121 — Load from Attachment A]', 'ls','Contracts','Medium',121),
('Construction','H-Other-Vendors-Construction','122', '[Item 122 — Load from Attachment A]', 'ls','Contracts','Medium',122),
('Construction','H-Other-Vendors-Construction','123', '[Item 123 — Load from Attachment A]', 'ls','Contracts','Medium',123);


-- ============================================================
-- Verification queries — run these after seed to confirm counts
-- ============================================================
-- SELECT COUNT(*) FROM firm_settings;           -- expect: 1
-- SELECT COUNT(*) FROM billing_codes;           -- expect: 6
-- SELECT COUNT(*) FROM scope_library;           -- expect: 123
-- SELECT category, COUNT(*) FROM scope_library GROUP BY category ORDER BY MIN(sort_order);
