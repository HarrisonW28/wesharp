# Pricing & charge accuracy (Sprint 10.6)

Laravel owns **pricing rules**, **order line math**, **subscription coverage on completed orders**, and **invoice line typing**. The SPA must not hardcode blade prices.

## Pricing rules (`pricing_rules`)

Managed via **admin API** (`pricing.view` / `pricing.manage`, Finance + Admin + SuperAdmin):

- `GET /api/admin/pricing-rules` — optional `?active_only=1`
- `POST /api/admin/pricing-rules`
- `PUT /api/admin/pricing-rules/{pricingRule}`

### Matching logic (`PricingRuleResolver`)

For an order, rules are scanned **highest `priority` first**:

1. **`active`** must be true.
2. **`service_type`**: if set on the rule, it must equal the booking’s `service_type`. If the rule is null, it applies to any service type.
3. **`service_area_id`**: if null, rule is global for the service type. If set, the company’s **default non-archived location** postcode (normalised, no spaces) must match the linked **active** service area using the same rules as public coverage: **inside the area’s map radius** when latitude/longitude/radius are set and postcodes.io returns coordinates for that postcode; otherwise the postcode must **start with** the area’s `postcode_prefix` when the prefix is set (prefix acts as fallback when geocoding is unavailable or when the area has no radius). If an area uses a radius and coordinates are available, prefix is **not** used for that area—the point must fall inside the circle.

The first matching rule wins.

### Rule kinds

- **`per_knife`** — `amount_pence` is the default **per-blade / per line** workshop price. Used when bulk-adding order lines **without** `unit_amount_pence`, and to pre-fill `price_per_knife_pence` when converting a booking to an order.
- **`flat_visit`** — stored for catalogue purposes; **default unit price** resolution still requires a **`per_knife`** rule (flat visit lines are not auto-applied to multi-line intake in this sprint).

## Order totals (`OrderService::rebuildMonetaryTotals`)

Applied after updates, line intake, and **order completion** (after subscription coverage is computed).

1. **`is_complimentary`** — forces `subtotal`, `tax`, and `total` to **0**.
2. **`manual_charge_subtotal_pence` + `manual_charge_reason`** (reason required) — **net** workshop subtotal before VAT; discount still applies; VAT at 20% on the result.
3. Else if there are **order items**: sum line nets. For **completed** orders with **`subscription_coverage.mode = subscription`**:
   - **`included`** lines contribute **0**.
   - **`overage`** lines use **`overage_unit_price_pence`** from coverage × quantity (not the line’s stored unit price).
   - **`na`** lines use **`unit_amount_pence` × quantity** (one-off behaviour).
4. Else **legacy** `price_per_knife_pence` × knife units.

## Reporting

The **billing** report `secondary.invoice_line_revenue_by_type` sums `invoice_items.line_total_pence` by `line_item_type` for **issued** invoices in the filter window (draft/void excluded), separating **one-off**, **subscription** (often £0), **overage**, and **adjustment** rows.

## Limitations

- Flat-visit rules do not auto-split multi-line orders.
- Collection-only subscription overage without workshop lines still follows legacy totals unless captured on the invoice (invoice path already uses coverage).
- Tax on subscription draft invoices remains **0** in `CreateInvoiceFromOrderAction` (existing behaviour); order VAT may differ until invoicing is aligned.
