<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Company;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\RouteStop;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class WeSharpDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeder_populates_core_graph_consistently(): void
    {
        $this->seed(WeSharpDemoSeeder::class);

        self::assertSame(8, Company::query()->count());

        self::assertSame(24, Booking::query()->count());

        self::assertSame(14, RouteStop::query()->count());

        self::assertSame(16, Order::query()->count());

        self::assertSame(1, OperationalRoute::query()->count());

        $company = Company::query()->with(['locations', 'orders'])->first();
        self::assertNotNull($company);

        foreach ($company->locations as $location) {
            self::assertSame($company->id, $location->company_id);
        }

        $route = OperationalRoute::query()->first();
        self::assertNotNull($route);
        self::assertSame(14, $route->stops()->count());
    }
}
