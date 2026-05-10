<?php

declare(strict_types=1);

namespace App\Enums;

enum CostAllocationTargetType: string
{
    case Company = 'company';
    case Order = 'order';
    case Route = 'route';
    case RouteStop = 'route_stop';
    case Booking = 'booking';
    case Invoice = 'invoice';
    case Subscription = 'subscription';
}
