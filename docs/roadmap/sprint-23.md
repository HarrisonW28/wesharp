# WeSharp Sprint 23 — Seeded Costs, Spreadsheet Import and Finance Cost Engine

## Context

WeSharp already has operational modules for customers, bookings, orders, routes, invoices, subscriptions, POS, drivers and reporting.

The uploaded `WeSharp_Costs_v4.xlsx` workbook currently acts as the business cost source of truth. Sprint 23 brings that information into the Laravel/Next.js platform in a structured way.

This sprint should create the first proper cost engine for WeSharp: seeded startup costs, importable cost spreadsheets, recurring commitments, consumables, cost allocation and finance CRM visibility.

## Existing spreadsheet structure to support

The current workbook contains:

### Cost Plan

Columns:
- Tier
- Item
- Cost (£)
- Frequency
- Status
- Notes

Known examples:
- Tormek T-2 — £585.97 — One-time — Purchased
- Blade guards — £9.99 — One-time — To Order
- Business cards — Purchased
- Mobile SIM — £10 — Monthly — Active
- Accounting estimate — £40 — Monthly — To Arrange
- Petrol — £60 — Weekly — Active
- Diamond wheel replenishment reserve — £100 — Monthly — Reserve

Statuses include:
- Purchased
- To Order
- Pending Quote
- Deferred
- Active
- To Arrange
- Reserve
- To Research

Frequencies include:
- One-time
- Weekly
- Monthly

### Cash Position

Tracks:
- Starting capital
- Purchased spend
- Cash buffer
- Upcoming spend
- Pending quote spend
- Deferred spend
- Monthly burn
- Weekly burn
- Runway
- Pricing assumptions
- Break-even per week and route day
- Decision triggers

### Consumables Tracker

Columns:
- #
- Item
- Cost (£)
- Stock
- Last reorder
- Reorder at
- Notes

Examples:
- Diamond Wheel — Coarse
- Diamond Wheel — Fine
- Diamond Wheel — Extra Fine
- Conical Composite Honing Wheel
- Exchange Clamps
- Knife Protection Pads
- Honing Compound
- 100k Grit Polish
- Strop Leather
- Cleaning supplies

### Serrated Research

Research notes for a future serrated knife sharpening service.

### How to Use

Workbook usage notes, colour coding and outstanding items.

## Sprint 23 principles

- Do not rebuild existing finance/invoice/subscription modules from scratch.
- Do not duplicate pricing logic if it already exists.
- Import and seed costs into structured database tables.
- Keep cost data auditable.
- Preserve spreadsheet import capability so the workbook can be used as a data source.
- Use seeded defaults so a fresh environment has useful baseline cost data.
- Keep controllers thin.
- Use Actions/Services/Requests/Resources where appropriate.
- Use GBP formatting throughout.
- Laravel remains the source of truth after import.
- Admin/developer/finance permissions must protect cost management.
- Customer users must not access internal cost data.

---

## Sprint 23.1 — Cost Data Model and Seeded Cost Catalogue

### Goal

Create the structured database foundation for WeSharp costs and seed it with data matching the uploaded workbook.

### Build

Create/extend models and migrations for a cost catalogue.

Suggested entities:

### CostCategory

Fields:
- id
- name
- slug
- description
- display_order
- is_active

Suggested categories:
- Equipment
- Startup essentials
- Safety and uniform
- Admin and legal
- Software and subscriptions
- Insurance
- Marketing and sales
- Route and vehicle
- Consumables and spares
- Research and future services
- Staff and contractors
- Other

### CostItem

Fields:
- id
- category_id
- tier_label
- name
- description
- amount
- currency default GBP
- frequency
- status
- supplier_name nullable
- supplier_url nullable
- priority
- notes
- is_recurring
- is_consumable
- is_seeded
- source
- source_sheet
- source_row
- starts_on nullable
- ends_on nullable
- next_due_on nullable
- created_by_user_id nullable
- updated_by_user_id nullable
- timestamps

### CostFrequency enum/config

Support:
- one_time
- weekly
- monthly
- quarterly
- annual
- per_route
- per_order
- per_knife
- usage_based

Map spreadsheet values:
- One-time → one_time
- Weekly → weekly
- Monthly → monthly

### CostStatus enum/config

Support:
- purchased
- to_order
- pending_quote
- deferred
- active
- to_arrange
- reserve
- to_research
- cancelled
- archived

Map spreadsheet values exactly and safely.

### Seed data

Add a seeder using the workbook values as baseline seed data.

Seed examples include:
- Tormek T-2, £585.97, One-time, Purchased
- Blade guards, £9.99, One-time, To Order
- Lockable crate, £50, One-time, To Order
- Knife rolls, £34, One-time, To Order
- Cleaning supplies, £10, One-time, To Order
- Insurance setup/deposit, £50, One-time, Pending Quote
- Safety boots, £43.20, One-time, To Order
- Polo shirts, £60, One-time, To Order
- Business cards 100, £40.90, One-time, Purchased
- Business cards 1,000, £153, One-time, Purchased
- Loaner knives, £52.80, One-time, Deferred
- Domain, £5.17, One-time, Purchased
- Logo, £6.81, One-time, Purchased
- Incorporation, £24.99, One-time, Purchased
- Mobile SIM, £10, Monthly, Active
- Accounting estimate, £40, Monthly, To Arrange
- Insurance monthly premium, £40, Monthly, Pending Quote
- Petrol, £60, Weekly, Active
- Diamond wheel replenishment reserve, £100, Monthly, Reserve
- Serrated knife sharpening solution, £0, One-time, To Research

### Admin UI

Add a cost catalogue page under Finance or Developer/Finance depending current nav.

Features:
- list cost items
- filter by category/status/frequency
- show amount in GBP
- show recurring vs one-time
- show seeded/source badge
- edit item
- archive item
- create manual item

### Acceptance criteria

- Cost categories exist.
- Cost items exist.
- Seed data matches the workbook baseline.
- Cost amounts display in GBP with decimals.
- Status/frequency mappings are consistent.
- Finance/admin/developer can view cost catalogue.
- Customer users cannot view cost catalogue.
- Seeded items can be updated without duplicate reseeding.
- No duplicate cost items are created on repeated seeding.

### QA

- Run migrations.
- Run seeders twice and confirm no duplicates.
- Open cost catalogue.
- Filter by Purchased, To Order, Monthly and Weekly.
- Confirm Tormek T-2 appears as purchased £585.97.
- Confirm petrol appears weekly £60.
- Confirm Mobile SIM appears monthly £10.
- Confirm customer cannot access cost catalogue.

---

## Sprint 23.2 — Spreadsheet Import Pipeline for Costs Workbook

### Goal

Allow admins/finance users to import the WeSharp costs spreadsheet and update the cost catalogue from spreadsheet data.

### Build

Create a spreadsheet import flow for `WeSharp_Costs_v4.xlsx` style workbooks.

Import sheets:
- Cost Plan
- Cash Position
- Consumables Tracker
- Serrated Research
- How to Use notes if useful

### Import process

1. Upload workbook.
2. Validate workbook structure.
3. Preview detected rows.
4. Show row mapping.
5. Show warnings/errors.
6. Confirm import.
7. Create/update cost records.
8. Store import batch summary.

### ImportBatch model

Fields:
- id
- type
- filename
- uploaded_by_user_id
- status
- rows_detected
- rows_created
- rows_updated
- rows_skipped
- warnings_json
- errors_json
- started_at
- completed_at
- timestamps

### CostImportRow model or JSON details

Track row-level import details:
- sheet_name
- row_number
- raw_data
- mapped_data
- action created/updated/skipped/error
- error_message

### Matching/deduplication

Match cost items by:
- source_sheet + source_row if already imported
- otherwise normalised item name + tier_label + frequency

Never blindly duplicate imported rows.

### Validation

Validate:
- required headers exist in Cost Plan
- amount is numeric or zero
- frequency maps to known enum
- status maps to known enum
- subtotal rows are detected and skipped
- grand total rows are detected and skipped
- blank rows are skipped

### Subtotal handling

Skip rows like:
- subtotal rows
- GRAND TOTALS
- Total one-time spend
- Total weekly running
- Total monthly running
- Total monthly burn

These should be calculated in app, not imported as cost items.

### Consumables import

Import consumables from Consumables Tracker into cost items and/or consumable inventory.

Fields:
- item
- cost
- stock
- last reorder
- reorder at
- notes

### Cash position import

Do not import Cash Position as cost items.

Instead store key assumptions/settings where appropriate:
- starting capital
- regular route price
- first-visit trial price
- route days per week
- decision triggers as notes/settings if useful

### Admin UI

Add import page:
- upload workbook
- preview mapping
- import summary
- import history
- download/import errors if needed

### Acceptance criteria

- Admin can upload the workbook.
- Cost Plan rows are imported or updated.
- Subtotal/grand total rows are skipped.
- Consumables are imported.
- Cash assumptions are captured separately where implemented.
- Import preview shows what will change.
- Import batch history exists.
- Re-import does not duplicate costs.
- Invalid workbook shows useful errors.

### QA

- Import the uploaded workbook.
- Confirm rows created/updated/skipped counts.
- Confirm subtotal rows are skipped.
- Re-import same workbook and confirm no duplicates.
- Change one cost in workbook and re-import; confirm update.
- Test invalid file.
- Test missing headers.
- Confirm permissions.

---

## Sprint 23.3 — Recurring Costs and Commitments

### Goal

Turn recurring spreadsheet costs into a real recurring commitments module.

### Build

Add recurring cost handling for:
- weekly
- monthly
- quarterly
- annual
- usage-based

Fields/logic:
- recurring frequency
- recurring amount
- next due date
- renewal date
- cancellable flag
- supplier
- payment method note
- commitment status
- monthly equivalent
- annual equivalent

### Examples from workbook

- Mobile SIM — £10 monthly active
- Accounting estimate — £40 monthly to arrange
- Insurance monthly premium — £40 monthly pending quote
- Petrol — £60 weekly active
- Diamond wheel replenishment reserve — £100 monthly reserve

### Calculations

Monthly equivalent:
- weekly × 4.33
- monthly × 1
- quarterly / 3
- annual / 12

Annual equivalent:
- weekly × 52
- monthly × 12
- quarterly × 4
- annual × 1

### Dashboard widgets

Show:
- monthly committed cost
- annual committed cost
- upcoming recurring spend
- active recurring costs
- pending recurring costs
- next renewal/due items

### Acceptance criteria

- Recurring costs have monthly/annual equivalent values.
- Weekly costs convert correctly using 4.33 monthly factor.
- Active vs pending commitments are separated.
- Finance dashboard shows recurring cost base.
- Status changes affect committed cost totals.
- Customer users cannot access internal costs.

### QA

- Confirm petrol £60 weekly appears as £259.80 monthly equivalent.
- Confirm mobile SIM £10 monthly appears as £10 monthly.
- Confirm monthly recurring total matches expected active/pending rules.
- Change accounting status to active and confirm committed costs update.
- Test annual/quarterly examples.

---

## Sprint 23.4 — Consumables Inventory and Usage-Based Costing

### Goal

Turn consumables and spares from the spreadsheet into operational inventory and cost-per-use intelligence.

### Build

Create/extend consumables inventory.

Fields:
- item name
- category
- unit cost
- stock quantity
- stock unit
- reorder threshold
- reorder note
- last reorder date
- supplier
- estimated uses per unit
- cost per use
- cost per knife estimate
- status
- notes

### Spreadsheet items to support

- Diamond Wheel — Coarse
- Diamond Wheel — Fine
- Diamond Wheel — Extra Fine
- Conical Composite Honing Wheel
- Exchange Clamps
- Knife Protection Pads
- Honing Compound
- 100k Grit Polish
- Strop Leather
- Cleaning supplies

### Usage logging

Add simple consumable usage tracking:
- date
- consumable_id
- quantity_used
- linked_order_id nullable
- linked_route_id nullable
- linked_knife_id nullable
- notes

### Costing

Calculate:
- consumable cost per knife
- consumable cost per order
- consumable cost per route
- projected reorder cost
- low stock alerts

### Acceptance criteria

- Consumables from spreadsheet exist in system.
- Reorder thresholds can be configured.
- Usage can be logged.
- Low-stock items are visible.
- Consumable costs can feed order/route margin estimates.
- Restock total can be calculated.

### QA

- Import/seed consumables.
- Set stock and reorder thresholds.
- Log usage against an order.
- Confirm cost per order updates.
- Trigger low-stock alert.
- Confirm restock total roughly matches spreadsheet restock list where appropriate.

---

## Sprint 23.5 — Cost Allocation to Orders, Routes, Subscriptions and CRM

### Goal

Connect costs into operations so WeSharp can understand profitability by order, route, customer and subscription.

### Build

Add cost allocation layer.

Allocation targets:
- order
- booking
- route
- route stop
- customer/company
- subscription
- invoice

Allocation methods:
- direct manual allocation
- percentage allocation
- per-knife allocation
- per-order allocation
- per-route allocation
- monthly overhead allocation

### Examples

- Petrol allocated to routes.
- Consumables allocated to orders/knives.
- Stripe fees allocated to invoices/payments.
- Subscription plan cost allocated to subscription usage.
- Equipment payback tracked against profit.

### CostAllocation model

Fields:
- id
- cost_item_id nullable
- consumable_usage_id nullable
- target_type
- target_id
- amount
- currency
- allocation_method
- notes
- created_by_user_id
- timestamps

### CRM integration

On customer/company pages show:
- total revenue
- total paid
- outstanding balance
- estimated cost to serve
- gross margin estimate
- subscription status
- usage vs allowance
- profitability label

Labels:
- High value
- Low margin
- Subscription customer
- High usage
- Overdue
- At risk

### Acceptance criteria

- Costs can be allocated to orders/routes/customers/subscriptions.
- Allocations affect margin estimates.
- CRM pages show finance intelligence.
- Costs are not visible to customer users.
- Manual allocations are audited.
- Existing invoices/payments still work.

### QA

- Allocate petrol cost to a route.
- Allocate consumable cost to an order.
- Confirm route margin changes.
- Confirm customer/company margin changes.
- Confirm customer portal does not show internal costs.
- Test subscription-covered customer margin.

---

## Sprint 23.6 — Profit, ROI and Cost Intelligence Dashboard

### Goal

Create a finance dashboard that shows profit, margin, ROI, runway, burn, break-even and cost risk.

### Dashboard KPIs

Show:
- revenue
- gross profit
- net profit estimate
- gross margin %
- net margin %
- average order value
- average knives per order
- revenue per knife
- cost per knife
- profit per knife
- revenue per route
- profit per route
- revenue per customer
- profit per customer
- subscription MRR
- subscription margin
- recurring cost base
- cash buffer
- runway
- break-even point
- ROI on equipment
- payback period

### Specific spreadsheet-inspired calculations

Cash buffer:
- starting capital minus purchased spend

Upcoming spend:
- To Order + Pending Quote + Deferred where relevant

Monthly burn:
- weekly costs × 4.33 + monthly costs

Break-even:
- weekly cost to cover / average price per knife
- knives per route day based on route days per week

Equipment payback:
- equipment cost / profit per knife
- equipment cost / monthly gross profit

### Alert cards

Show:
- cash buffer below threshold
- upcoming spend exceeds cash buffer
- recurring costs rising
- low-margin customers
- route not profitable
- consumables reorder needed
- equipment not paid back
- subscription overage risk

### Acceptance criteria

- Dashboard calculates core profit and cost KPIs.
- Cash buffer/runway reflects imported/seeded costs.
- Monthly burn uses recurring costs.
- Break-even uses pricing assumptions.
- Alerts are useful and role-aware.
- No customer users can access internal dashboard.

### QA

- Confirm cash buffer matches starting capital minus purchased spend.
- Confirm monthly burn matches weekly × 4.33 + monthly.
- Confirm break-even knives/week calculation.
- Confirm Tormek payback card appears if profit data exists.
- Confirm low cash alert if buffer under threshold.
- Test finance/admin/developer access.

---

## Sprint 23.7 — Sprint 23 Regression QA

### Goal

Regression test cost seeding, spreadsheet import, recurring costs, consumables, allocations, CRM finance integration and dashboards.

### QA areas

Check:
- migrations
- seeded costs
- repeated seeding dedupe
- spreadsheet import
- import preview
- import history
- subtotal row skipping
- consumables import
- recurring cost calculations
- cost allocations
- CRM finance visibility
- finance dashboard
- permissions
- GBP formatting

### Required output

At the end, provide:
- QA checks completed
- bugs found
- bugs fixed
- files changed
- deferred issues
- Sprint 23 final verdict: PASS / FAIL
