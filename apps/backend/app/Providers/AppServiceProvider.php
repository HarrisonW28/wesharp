<?php

namespace App\Providers;

use App\Contracts\Payments\PaymentProviderInterface;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\CustomerPortalUpdate;
use App\Models\DamageReport;
use App\Models\EvidencePhoto;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PricingRule;
use App\Models\RouteStop;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\WebhookInbox;
use App\Policies\AuditLogPolicy;
use App\Policies\BookingPolicy;
use App\Policies\CompanyPolicy;
use App\Policies\CompanySubscriptionPolicy;
use App\Policies\CustomerPortalUpdatePolicy;
use App\Policies\DamageReportPolicy;
use App\Policies\EvidencePhotoPolicy;
use App\Policies\InvoicePolicy;
use App\Policies\KnifePolicy;
use App\Policies\OperationalRoutePolicy;
use App\Policies\OrderPolicy;
use App\Policies\PaymentPolicy;
use App\Policies\PricingRulePolicy;
use App\Policies\RouteStopPolicy;
use App\Policies\SubscriptionPlanPolicy;
use App\Policies\UserPolicy;
use App\Policies\WebhookInboxPolicy;
use App\Services\Clerk\ClerkJwtVerifier;
use App\Services\Clerk\ClerkUserSynchronizer;
use App\Services\Payments\StripePaymentProvider;
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
        $this->app->singleton(StripePaymentProvider::class);
        $this->app->bind(PaymentProviderInterface::class, StripePaymentProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('booking-enquiries', static function (Request $request): Limit {
            return Limit::perMinute(10)->by($request->ip());
        });

        Gate::policy(AuditLog::class, AuditLogPolicy::class);
        Gate::policy(WebhookInbox::class, WebhookInboxPolicy::class);
        Gate::policy(Company::class, CompanyPolicy::class);
        Gate::policy(EvidencePhoto::class, EvidencePhotoPolicy::class);
        Gate::policy(CustomerPortalUpdate::class, CustomerPortalUpdatePolicy::class);
        Gate::policy(Booking::class, BookingPolicy::class);
        Gate::policy(OperationalRoute::class, OperationalRoutePolicy::class);
        Gate::policy(RouteStop::class, RouteStopPolicy::class);
        Gate::policy(Order::class, OrderPolicy::class);
        Gate::policy(Knife::class, KnifePolicy::class);
        Gate::policy(DamageReport::class, DamageReportPolicy::class);
        Gate::policy(Invoice::class, InvoicePolicy::class);
        Gate::policy(Payment::class, PaymentPolicy::class);
        Gate::policy(PricingRule::class, PricingRulePolicy::class);
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(SubscriptionPlan::class, SubscriptionPlanPolicy::class);
        Gate::policy(CompanySubscription::class, CompanySubscriptionPolicy::class);
    }
}
