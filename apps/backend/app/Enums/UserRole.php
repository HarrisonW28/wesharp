<?php

namespace App\Enums;

use App\Support\Permissions;

/**
 * MVP staff and tenant portal roles — enforced server-side via {@see Permissions}.
 */
enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case Admin = 'admin';
    case Developer = 'developer';
    case RouteManager = 'route_manager';
    case Finance = 'finance';
    case CustomerOwner = 'customer_owner';
    case CustomerStaff = 'customer_staff';

    /** @return list<self> */
    public static function internal(): array
    {
        return [
            self::SuperAdmin,
            self::Admin,
            self::Developer,
            self::RouteManager,
            self::Finance,
        ];
    }

    /** @return list<string> */
    public static function internalValues(): array
    {
        return array_map(static fn (self $r) => $r->value, self::internal());
    }

    public function isInternal(): bool
    {
        return in_array($this, self::internal(), true);
    }

    public function isCustomer(): bool
    {
        return $this === self::CustomerOwner || $this === self::CustomerStaff;
    }
}
