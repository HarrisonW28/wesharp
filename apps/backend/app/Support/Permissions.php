<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\User;

/**
 * Central permission map for the WeSharp API. All authorisation must be enforced here (or policies
 * that delegate to this class) — never trust client-side claims.
 */
final class Permissions
{
    public const DASHBOARD_VIEW = 'dashboard.view';

    public const COMPANIES_VIEW = 'companies.view';

    public const COMPANIES_CREATE = 'companies.create';

    public const COMPANIES_UPDATE = 'companies.update';

    public const COMPANIES_DELETE = 'companies.delete';

    public const BOOKINGS_VIEW = 'bookings.view';

    public const BOOKINGS_CREATE = 'bookings.create';

    public const BOOKINGS_UPDATE = 'bookings.update';

    public const BOOKINGS_CANCEL = 'bookings.cancel';

    /** Rare hard-delete — administrator tooling only (see booking policy guards). */
    public const BOOKINGS_DELETE = 'bookings.delete';

    public const ROUTES_VIEW = 'routes.view';

    public const ROUTES_MANAGE = 'routes.manage';

    /** Complete a route despite open stops or missing required evidence (administrator only). */
    public const ROUTES_COMPLETE_OVERRIDE = 'routes.complete_override';

    public const ROUTE_STOPS_UPDATE = 'route_stops.update';

    public const ORDERS_VIEW = 'orders.view';

    public const ORDERS_CREATE = 'orders.create';

    public const ORDERS_UPDATE = 'orders.update';

    public const KNIVES_VIEW = 'knives.view';

    public const KNIVES_UPDATE = 'knives.update';

    public const INVOICES_VIEW = 'invoices.view';

    public const INVOICES_CREATE = 'invoices.create';

    public const INVOICES_UPDATE = 'invoices.update';

    public const PAYMENTS_VIEW = 'payments.view';

    public const PAYMENTS_MANAGE = 'payments.manage';

    public const ANALYTICS_VIEW = 'analytics.view';

    /** Financial reporting (sales, invoices, subscriptions) — admin API `/api/admin/reports/…`. */
    public const REPORTS_FINANCE = 'reports.finance';

    /** Create/view workshop & visit pricing rules (admin). */
    public const PRICING_VIEW = 'pricing.view';

    public const PRICING_MANAGE = 'pricing.manage';

    /** List/view service coverage areas (postcode + optional map radius). */
    public const SERVICE_AREAS_VIEW = 'service_areas.view';

    /** Create, update, delete service areas (admin / finance). */
    public const SERVICE_AREAS_MANAGE = 'service_areas.manage';

    /** Operational reporting (bookings, orders, routes, knives) — admin API `/api/admin/reports/…`. */
    public const REPORTS_OPERATIONS = 'reports.operations';

    /** Read subscription plans and company subscription rows (admin). */
    public const SUBSCRIPTIONS_VIEW = 'subscriptions.view';

    /** Create/update subscription plans and assign company subscriptions (admin). */
    public const SUBSCRIPTIONS_MANAGE = 'subscriptions.manage';

    /** Create/update/remove pick-up addresses for the signed-in company (tenant portal). */
    public const ACCOUNT_LOCATIONS_MANAGE = 'account.locations.manage';

    /** Read tenant account settings payload (`GET /api/account/settings`). */
    public const ACCOUNT_SETTINGS_VIEW = 'account.settings.view';

    /** Read/update tenant account settings and notification preferences (`GET|PUT /api/account/settings`). */
    public const ACCOUNT_SETTINGS_UPDATE = 'account.settings.update';

    /** Update own portal user display name (tenant). */
    public const ACCOUNT_PROFILE_UPDATE = 'account.profile.update';

    /** Update tenant trading / contact fields on the company record (owner only). */
    public const ACCOUNT_BUSINESS_UPDATE = 'account.business.update';

    public const SETTINGS_VIEW = 'settings.view';

    public const SETTINGS_MANAGE = 'settings.manage';

    /** Admin user directory (super_admin / admin). */
    public const USERS_VIEW = 'users.view';

    public const USERS_MANAGE = 'users.manage';

    /** Internal audit log index and timeline payloads (staff only; never granted to tenant roles). */
    public const AUDIT_LOGS_VIEW = 'audit_logs.view';

    /** Webhook inbox and integration diagnostics — {@see UserRole::Developer} and super admins only (Sprint 15.3). */
    public const SYSTEM_TOOLS_VIEW = 'system.tools.view';

    /** Stored Stripe secrets and integration flags (encrypted at rest); developer + super_admin only. */
    public const SYSTEM_INTEGRATIONS_MANAGE = 'system.integrations.manage';

    /** Cross-resource notification delivery list (ops / finance visibility for failures). */
    public const NOTIFICATIONS_DELIVERIES_VIEW = 'notifications.deliveries.view';

    /** Payment overrides and sensitive adjustment flows (refunds, write-offs). */
    public const PAYMENTS_OVERRIDE = 'payments.override';

    /** Every permission string advertised for QA / audits. */
    public const ALL_PERMISSIONS = [
        self::DASHBOARD_VIEW,
        self::COMPANIES_VIEW,
        self::COMPANIES_CREATE,
        self::COMPANIES_UPDATE,
        self::COMPANIES_DELETE,
        self::BOOKINGS_VIEW,
        self::BOOKINGS_CREATE,
        self::BOOKINGS_UPDATE,
        self::BOOKINGS_CANCEL,
        self::BOOKINGS_DELETE,
        self::ROUTES_VIEW,
        self::ROUTES_MANAGE,
        self::ROUTES_COMPLETE_OVERRIDE,
        self::ROUTE_STOPS_UPDATE,
        self::ORDERS_VIEW,
        self::ORDERS_CREATE,
        self::ORDERS_UPDATE,
        self::KNIVES_VIEW,
        self::KNIVES_UPDATE,
        self::INVOICES_VIEW,
        self::INVOICES_CREATE,
        self::INVOICES_UPDATE,
        self::PAYMENTS_VIEW,
        self::PAYMENTS_MANAGE,
        self::PAYMENTS_OVERRIDE,
        self::ANALYTICS_VIEW,
        self::ACCOUNT_LOCATIONS_MANAGE,
        self::ACCOUNT_SETTINGS_VIEW,
        self::ACCOUNT_SETTINGS_UPDATE,
        self::ACCOUNT_PROFILE_UPDATE,
        self::ACCOUNT_BUSINESS_UPDATE,
        self::SETTINGS_VIEW,
        self::SETTINGS_MANAGE,
        self::USERS_VIEW,
        self::USERS_MANAGE,
        self::AUDIT_LOGS_VIEW,
        self::SYSTEM_TOOLS_VIEW,
        self::SYSTEM_INTEGRATIONS_MANAGE,
        self::NOTIFICATIONS_DELIVERIES_VIEW,
        self::REPORTS_FINANCE,
        self::REPORTS_OPERATIONS,
        self::PRICING_VIEW,
        self::PRICING_MANAGE,
        self::SERVICE_AREAS_VIEW,
        self::SERVICE_AREAS_MANAGE,
        self::SUBSCRIPTIONS_VIEW,
        self::SUBSCRIPTIONS_MANAGE,
    ];

    /**
     * @return array<string, list<string>>
     */
    private static function map(): array
    {
        static $cached = null;

        if ($cached !== null) {
            return $cached;
        }

        return $cached = [
            UserRole::SuperAdmin->value => self::ALL_PERMISSIONS,

            UserRole::Admin->value => array_values(array_diff(self::ALL_PERMISSIONS, [
                self::AUDIT_LOGS_VIEW,
                self::SYSTEM_TOOLS_VIEW,
                self::SYSTEM_INTEGRATIONS_MANAGE,
            ])),

            UserRole::Developer->value => [
                self::DASHBOARD_VIEW,
                self::ANALYTICS_VIEW,
                self::USERS_VIEW,
                self::AUDIT_LOGS_VIEW,
                self::SYSTEM_TOOLS_VIEW,
                self::SYSTEM_INTEGRATIONS_MANAGE,
                self::NOTIFICATIONS_DELIVERIES_VIEW,
                /** Marketing copy + notification template settings (same middleware group as site-content). */
                self::SETTINGS_MANAGE,
                /** Remove demo / seeded CRM and rare draft booking hard-deletes — not for production operators. */
                self::COMPANIES_VIEW,
                self::COMPANIES_DELETE,
                self::BOOKINGS_VIEW,
                self::BOOKINGS_DELETE,
            ],

            UserRole::RouteManager->value => [
                self::DASHBOARD_VIEW,
                self::COMPANIES_VIEW,
                self::BOOKINGS_VIEW,
                self::BOOKINGS_CREATE,
                self::BOOKINGS_UPDATE,
                self::BOOKINGS_CANCEL,
                self::ROUTES_VIEW,
                self::ROUTES_MANAGE,
                self::ROUTE_STOPS_UPDATE,
                self::ORDERS_VIEW,
                self::ORDERS_CREATE,
                self::ORDERS_UPDATE,
                self::KNIVES_VIEW,
                self::KNIVES_UPDATE,
                self::ANALYTICS_VIEW,
                self::REPORTS_OPERATIONS,
                self::SERVICE_AREAS_VIEW,
                self::SETTINGS_VIEW,
                self::AUDIT_LOGS_VIEW,
            ],

            UserRole::Finance->value => [
                self::DASHBOARD_VIEW,
                self::COMPANIES_VIEW,
                self::BOOKINGS_VIEW,
                self::BOOKINGS_CANCEL,
                self::ORDERS_VIEW,
                self::ORDERS_UPDATE,
                self::KNIVES_VIEW,
                self::INVOICES_VIEW,
                self::INVOICES_CREATE,
                self::INVOICES_UPDATE,
                self::PAYMENTS_VIEW,
                self::PAYMENTS_MANAGE,
                self::ANALYTICS_VIEW,
                self::REPORTS_FINANCE,
                self::PRICING_VIEW,
                self::PRICING_MANAGE,
                self::SERVICE_AREAS_VIEW,
                self::SERVICE_AREAS_MANAGE,
                self::SUBSCRIPTIONS_VIEW,
                self::SUBSCRIPTIONS_MANAGE,
                self::SETTINGS_VIEW,
                self::AUDIT_LOGS_VIEW,
                self::NOTIFICATIONS_DELIVERIES_VIEW,
            ],

            UserRole::CustomerOwner->value => [
                self::DASHBOARD_VIEW,
                self::COMPANIES_VIEW,
                self::BOOKINGS_VIEW,
                self::BOOKINGS_CREATE,
                self::BOOKINGS_CANCEL,
                self::ORDERS_VIEW,
                self::KNIVES_VIEW,
                self::KNIVES_UPDATE,
                self::INVOICES_VIEW,
                self::PAYMENTS_VIEW,
                self::ACCOUNT_SETTINGS_VIEW,
                self::ACCOUNT_SETTINGS_UPDATE,
                self::ACCOUNT_PROFILE_UPDATE,
                self::ACCOUNT_BUSINESS_UPDATE,
                self::ACCOUNT_LOCATIONS_MANAGE,
            ],

            UserRole::CustomerStaff->value => [
                self::DASHBOARD_VIEW,
                self::COMPANIES_VIEW,
                self::BOOKINGS_VIEW,
                self::BOOKINGS_CREATE,
                self::BOOKINGS_CANCEL,
                self::ORDERS_VIEW,
                self::KNIVES_VIEW,
                self::INVOICES_VIEW,
                self::PAYMENTS_VIEW,
                self::ACCOUNT_SETTINGS_VIEW,
                self::ACCOUNT_SETTINGS_UPDATE,
                self::ACCOUNT_PROFILE_UPDATE,
            ],
        ];
    }

    /** @return list<string> */
    public static function forRole(UserRole $role): array
    {
        return array_values(array_unique(self::map()[$role->value] ?? []));
    }

    public static function userMay(User $user, string $permission): bool
    {
        $role = $user->resolvedRole();

        $granted = self::forRole($role);

        return in_array($permission, $granted, true);
    }

    /**
     * Customer users may only act when bound to a company (except read-only internal edge cases).
     */
    public static function userMayForCompany(User $user, string $permission, ?string $companyId): bool
    {
        if (! self::userMay($user, $permission)) {
            return false;
        }

        if ($user->resolvedRole()->isCustomer()) {
            if ($user->company_id === null || $companyId === null) {
                return false;
            }

            return $user->company_id === $companyId;
        }

        return true;
    }
}
