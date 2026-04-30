# Route Manager — field technician guide

This guide targets **drivers and ops staff** running the **`/admin/routes`** experience on phones (mobile Safari / Chrome).

---

## Before you start

1. Sign in via **Clerk** with an internal (**`staff`**) workspace user.
2. Ensure **`NEXT_PUBLIC_API_ORIGIN`** on the SPA points at Laravel (same LAN host as **`php artisan serve`** in dev).
3. Confirm your Laravel user carries **`routes.view`**, **`route_stops.update`**, and either **`routes.manage`** (dispatch) or route assignment (**`routes.driver_user_id`**) on the manifests you intend to operate.

---

## Screens

| Path | Purpose |
| --- | --- |
| **`/admin/routes/today`** | Live shift dashboard: date banner, KPI strip, **`primary_route`**, **`Start route`**, shortcuts to manifests. |
| **`/admin/routes`** | Paginated list for other days (**`paginate`** query switches full list vs picker-style rows). |
| **`/admin/routes/{uuid}`** | Manifest: progress metre, textual notes, driver chip, sequential stop tiles. |
| **`/admin/routes/{uuid}/stops/{uuid}`** | Venue detail — status workflow, telecom shortcuts, knives + damage edits. |

---

## Workflow tips

### Start-of-day

- Open **Today**. If **`Start route`** is visible, tap it once on-site (transitions **`scheduled → in_progress`**).

### Visiting a venue

Open the stop tile:

1. **Call** opens the handset dialer.
2. **Maps** pushes to Google Maps with the geocodable address query.
3. Tap **Mark travelling**, then **Mark arrived**, then **Mark collected**, **Mark returned**, and finally **Complete stop**. Disabled transitions mean Laravel rejected illegal hops (`422`).
4. Use **Save count & damage** after typing knives or defects — Laravel **`PUT`** on the stop.
5. **Back to route** restores the manifest.

### Troubleshooting (`4xx`)

- **`403`** — Permission mismatch; dispatcher must grant **`routes.manage`** or attach you as driver (`driver_user_id`).
- **`422`** — Illegal transition; reload the stop (another teammate may have advanced it).
- Network errors — Verify API URL + bearer token issuance.

---

## Installable PWA (optional)

Safari (**Share › Add to Home Screen**) / Chrome (**Install**) use the **`manifest.ts`** defaults (`display: standalone`). Launcher icons ship later — see **`apps/frontend/public/icons/README.txt`**.

---

## Offline

The **`/offline`** route is a UX placeholder pending service worker caches. Assume connectivity until offline work lands.
