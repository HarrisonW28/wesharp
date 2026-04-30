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

    /** Create/update/remove pick-up addresses for the signed-in company (tenant portal). */
    public const ACCOUNT_LOCATIONS_MANAGE = 'account.locations.manage';

    /** Safe profile fields on user + tenant company metadata (non-financial / non-admin fields). */
    public const ACCOUNT_SETTINGS_UPDATE = 'account.settings.update';

    public const SETTINGS_VIEW = 'settings.view';

    public const SETTINGS_MANAGE = 'settings.manage';

    /** Admin user directory (super_admin / admin). */
    public const USERS_VIEW = 'users.view';

    public const USERS_MANAGE = 'users.manage';

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
        self::ACCOUNT_SETTINGS_UPDATE,
        self::SETTINGS_VIEW,
        self::SETTINGS_MANAGE,
        self::USERS_VIEW,
        self::USERS_MANAGE,
    ];

    /** @var array<string, list<string>> Role value => granted permission keys */
    private const MAP = [
        UserRole::SuperAdmin->value => self::ALL_PERMISSIONS,

        UserRole::Admin->value => self::ALL_PERMISSIONS,

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
            self::KNIVES_VIEW,
            self::KNIVES_UPDATE,
            self::ANALYTICS_VIEW,
            self::SETTINGS_VIEW,
        ],

        UserRole::Finance->value => [
            self::DASHBOARD_VIEW,
            self::COMPANIES_VIEW,
            self::BOOKINGS_VIEW,
            self::BOOKINGS_CANCEL,
            self::ROUTES_VIEW,
            self::ORDERS_VIEW,
            self::ORDERS_UPDATE,
            self::KNIVES_VIEW,
            self::INVOICES_VIEW,
            self::INVOICES_CREATE,
            self::INVOICES_UPDATE,
            self::PAYMENTS_VIEW,
            self::PAYMENTS_MANAGE,
            self::PAYMENTS_OVERRIDE,
            self::ANALYTICS_VIEW,
            self::SETTINGS_VIEW,
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
            self::ACCOUNT_LOCATIONS_MANAGE,
            self::ACCOUNT_SETTINGS_UPDATE,
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
            self::ACCOUNT_LOCATIONS_MANAGE,
            self::ACCOUNT_SETTINGS_UPDATE,
        ],
    ];

    /** @return list<string> */
    public static function forRole(UserRole $role): array
    {
        return array_values(array_unique(self::MAP[$role->value] ?? []));
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
