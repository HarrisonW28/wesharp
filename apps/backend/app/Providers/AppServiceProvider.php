<?php

namespace App\Providers;

use App\Models\Booking;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\Payment;
use App\Models\RouteStop;
use App\Models\User;
use App\Policies\BookingPolicy;
use App\Policies\CompanyPolicy;
use App\Policies\InvoicePolicy;
use App\Policies\KnifePolicy;
use App\Policies\OperationalRoutePolicy;
use App\Policies\OrderPolicy;
use App\Policies\PaymentPolicy;
use App\Policies\RouteStopPolicy;
use App\Policies\UserPolicy;
use App\Services\Clerk\ClerkJwtVerifier;
use App\Services\Clerk\ClerkUserSynchronizer;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(ClerkJwtVerifier::class);
        $this->app->singleton(ClerkUserSynchronizer::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('booking-enquiries', static function (Request $request): Limit {
            return Limit::perMinute(10)->by($request->ip());
        });

        Gate::policy(Company::class, CompanyPolicy::class);
        Gate::policy(Booking::class, BookingPolicy::class);
        Gate::policy(OperationalRoute::class, OperationalRoutePolicy::class);
        Gate::policy(RouteStop::class, RouteStopPolicy::class);
        Gate::policy(Order::class, OrderPolicy::class);
        Gate::policy(Knife::class, KnifePolicy::class);
        Gate::policy(Invoice::class, InvoicePolicy::class);
        Gate::policy(Payment::class, PaymentPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
    }
}
