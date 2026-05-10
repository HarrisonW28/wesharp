# WeSharp Sprint 24 — Advanced Finance Reporting, Forecasting and Business Performance

## Context

Sprint 23 created the cost engine: seeded costs, spreadsheet import, recurring commitments, consumables, cost allocation and profit dashboard foundations.

Sprint 24 takes this further into forecasting, scenario planning, deep profitability reporting and executive business intelligence.

## Sprint 24 principles

- Do not duplicate Sprint 23 models.
- Use imported/seeded cost data as the cost source.
- Use existing orders, invoices, payments, routes, subscriptions and CRM data.
- Reports should be explainable, not magic.
- Show assumptions clearly.
- Keep GBP formatting consistent.
- Customer users must not access internal finance reporting.
- Finance/admin/developer permissions should control report access.

---

## Sprint 24.1 — Cash Position, Burn and Runway Reporting

### Goal

Bring the spreadsheet Cash Position tab fully into the app as a living report.

### Build

Track/report:
- starting capital
- purchased spend
- live cash buffer
- upcoming to-order spend
- pending quote spend
- deferred spend
- total upcoming one-time spend
- cash remaining if immediate purchases are made
- weekly running costs
- monthly fixed costs
- total monthly burn
- weeks/months runway

### Assumptions

Store/edit assumptions:
- starting capital
- regular route price per knife
- first-visit trial price per knife
- route days per week
- cash buffer warning threshold
- conversion target price
- second machine trigger
- van assessment trigger

### Acceptance criteria

- Cash Position report matches spreadsheet logic.
- Assumptions are editable by permitted users.
- Changes update calculations.
- Warnings appear when cash buffer is low.
- Finance/admin/developer can access.
- Customer users cannot access.

### QA

- Confirm starting capital £1,050 can be represented.
- Confirm purchased spend reflects purchased cost items.
- Confirm cash buffer updates.
- Confirm upcoming spend is separated.
- Confirm runway calculation.
- Test assumption edit.

---

## Sprint 24.2 — Forecasting and Scenario Planning

### Goal

Allow WeSharp to model business outcomes based on routes, knife volume, pricing, costs and subscriptions.

### Build

Scenario model/input:
- scenario name
- route days per week
- stops per route
- average knives per stop
- average price per knife
- trial price percentage
- conversion rate from trial to regular
- subscription customers
- average subscription price
- churn percentage
- consumable cost per knife
- petrol/fuel per route
- sales/driver cost
- marketing spend
- monthly fixed costs

### Scenario outputs

Show:
- weekly revenue
- monthly revenue
- monthly recurring revenue
- gross profit
- net profit estimate
- monthly costs
- break-even date
- cash low point
- runway
- knives needed to break even
- routes needed to break even

### Scenario types

Support saved scenarios:
- Conservative
- Expected
- Aggressive
- Custom

### Acceptance criteria

- Users can create/edit scenarios.
- Scenarios use real cost assumptions where available.
- Forecast outputs update when assumptions change.
- Break-even and runway are shown.
- Reports are clearly labelled as forecast/estimate.

### QA

- Create conservative scenario.
- Create expected scenario.
- Create aggressive scenario.
- Change route days and confirm revenue forecast changes.
- Change average price and confirm break-even changes.
- Confirm forecasts do not overwrite actual financial records.

---

## Sprint 24.3 — Subscription Profitability Reporting

### Goal

Report subscription profitability without mixing subscription-covered usage with one-off revenue.

### Build

Report:
- MRR
- ARR
- active subscriptions
- cancelled subscriptions
- subscription customers
- plan allowance
- used allowance
- unused allowance
- overage usage
- overage revenue
- subscription gross margin
- churn risk
- renewal dates
- failed payments
- high usage customers
- low margin subscription customers

### Important rule

Do not count subscription-covered knives as normal one-off revenue.

Separate:
- recurring subscription revenue
- covered usage
- overage revenue
- one-off invoice revenue

### Acceptance criteria

- Subscription revenue is separated from one-off revenue.
- Covered usage is visible.
- Overage is visible.
- Margin estimate includes allocated costs.
- High usage/low margin subscriptions are flagged.
- Finance/admin can drill into customer/company.

### QA

- Test covered subscription usage.
- Test overage usage.
- Confirm one-off revenue and subscription revenue remain separate.
- Confirm low-margin subscription warning.
- Confirm renewal/failed payment states where data exists.

---

## Sprint 24.4 — Route, Driver and Sales Route Profitability

### Goal

Report route, driver and sales-route profitability.

### Build

Service route report:
- revenue per route
- profit per route
- orders per route
- knives per route
- average stop time
- failed/no-answer stops
- completed stops
- photo compliance
- allocated petrol/fuel cost
- allocated consumable cost
- route margin

Driver report:
- assigned stops
- completed stops
- failed/no-answer stops
- average completion time
- issues raised
- photo compliance
- route notes

Sales route report if implemented:
- leads created
- bookings created
- conversion rate
- revenue created
- POS sales
- discounts given
- follow-ups created
- abandoned checkout recovery

### Acceptance criteria

- Route profitability is visible.
- Driver performance is visible to permitted users.
- Sales route performance is visible where sales routes exist.
- Driver role cannot see finance-level profitability unless permitted.
- Finance/admin can see margin details.

### QA

- Create/complete route with allocated petrol cost.
- Confirm route margin.
- Confirm driver view remains limited.
- Confirm admin/finance can view profitability.
- Test sales route metrics if sales route exists.

---

## Sprint 24.5 — Sales, POS and Abandonment Performance Reporting

### Goal

Report how well sales and POS workflows convert into bookings, invoices and paid revenue.

### Build

Report:
- POS revenue
- sales-created bookings
- sales-created orders
- quotes/estimates if present
- average POS sale value
- discounts given
- discount reasons
- abandoned checkouts
- recovered checkouts
- recovery rate
- sales follow-ups
- follow-up outcome
- sales role/user performance
- customer acquisition source

### Abandonment

Use Sprint 19 checkout attempts:
- pending
- completed
- expired
- abandoned
- recovered

Do not build full booking wizard abandonment unless already exists.

### Acceptance criteria

- Sales/POS performance is visible.
- Abandoned checkout metrics are visible.
- Recovery/recovered revenue can be tracked where data exists.
- Sales role can view own performance if allowed.
- Admin/finance can view all sales performance.

### QA

- Create POS order.
- Confirm POS revenue appears.
- Simulate abandoned checkout.
- Confirm abandoned metric appears.
- Mark/recover checkout and confirm recovery reporting.
- Confirm permissions.

---

## Sprint 24.6 — Executive Owner Dashboard

### Goal

Create a high-level owner dashboard that brings operational, finance, subscription, route and cost intelligence together.

### Dashboard sections

Show:
- Today
- This week
- This month
- Revenue
- Profit
- Cash
- MRR
- Bookings
- Orders
- Invoices
- Outstanding debt
- Route performance
- Customer growth
- Costs
- ROI
- Alerts

### KPI cards

Include:
- revenue this month
- gross profit estimate
- net profit estimate
- cash buffer
- runway
- recurring costs
- MRR
- overdue invoices
- active subscriptions
- route margin
- average order value
- profit per knife
- cost per knife
- equipment payback

### Alerts

Show:
- cash buffer low
- upcoming spend exceeds cash
- recurring costs rising
- overdue invoices
- low-margin customers
- high consumables usage
- subscription overage
- route not profitable
- abandoned checkouts rising
- equipment not paid back

### Acceptance criteria

- Owner dashboard provides a clear snapshot.
- KPIs are linked to detail reports.
- Alerts are actionable.
- Dashboard is responsive.
- Customer users cannot access.
- Developer/admin/finance access is permissioned.

### QA

- Test dashboard with seeded costs and sample revenue.
- Confirm KPI cards calculate.
- Confirm alerts appear.
- Confirm links to detail pages.
- Test mobile/tablet layout.
- Test permissions.

---

## Sprint 24.7 — Sprint 24 Regression QA

### Goal

Regression test advanced finance reporting, forecasting, subscription profitability, route/sales reporting and executive dashboards.

### QA areas

Check:
- cash position/runway report
- editable assumptions
- forecasting scenarios
- subscription profitability
- route/driver profitability
- sales/POS performance
- abandoned checkout reporting
- executive dashboard
- permissions
- GBP formatting
- drill-down links
- responsive layout

### Required output

At the end, provide:
- QA checks completed
- bugs found
- bugs fixed
- files changed
- deferred issues
- Sprint 24 final verdict: PASS / FAIL
