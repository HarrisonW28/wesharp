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
use App\Models\InAppNotification;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\OrderFeedback;
use App\Models\Payment;
use App\Models\PricingRule;
use App\Models\RouteStop;
use App\Models\ServiceArea;
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
use App\Policies\InAppNotificationPolicy;
use App\Policies\InvoicePolicy;
use App\Policies\KnifePolicy;
use App\Policies\OperationalRoutePolicy;
use App\Policies\OrderFeedbackPolicy;
use App\Policies\OrderPolicy;
use App\Policies\PaymentPolicy;
use App\Policies\PricingRulePolicy;
use App\Policies\RouteStopPolicy;
use App\Policies\ServiceAreaPolicy;
use App\Policies\SubscriptionPlanPolicy;
use App\Policies\UserPolicy;
use App\Policies\WebhookInboxPolicy;
use App\Services\Clerk\ClerkJwtVerifier;
use App\Services\Clerk\ClerkUserSynchronizer;
use App\Services\Payments\StripePaymentProvider;
use App\Services\SiteContent\SiteContentService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\View;
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
        $this->app->singleton(PaymentProviderInterface::class, StripePaymentProvider::class);
        $this->app->singleton(SiteContentService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        View::composer('emails.notifications.*', static function ($view): void {
            $line = app(SiteContentService::class)->resolved()['email']['footer_line'] ?? '';
            $view->with('siteEmailFooterLine', is_string($line) ? $line : '');
        });

        RateLimiter::for('booking-enquiries', static function (Request $request): Limit {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('service-area-public', static function (Request $request): Limit {
            return Limit::perMinute(20)->by($request->ip());
        });

        RateLimiter::for('pricing-estimate-public', static function (Request $request): Limit {
            return Limit::perMinute(30)->by($request->ip());
        });

        RateLimiter::for('site-content-public', static function (Request $request): Limit {
            return Limit::perMinute(120)->by($request->ip());
        });

        RateLimiter::for('tracking-public', static function (Request $request): Limit {
            return Limit::perMinute(60)->by($request->ip());
        });

        RateLimiter::for('provider-webhooks', static function (Request $request): Limit {
            return Limit::perMinute(120)->by($request->ip());
        });

        Gate::policy(AuditLog::class, AuditLogPolicy::class);
        Gate::policy(WebhookInbox::class, WebhookInboxPolicy::class);
        Gate::policy(Company::class, CompanyPolicy::class);
        Gate::policy(EvidencePhoto::class, EvidencePhotoPolicy::class);
        Gate::policy(InAppNotification::class, InAppNotificationPolicy::class);
        Gate::policy(CustomerPortalUpdate::class, CustomerPortalUpdatePolicy::class);
        Gate::policy(Booking::class, BookingPolicy::class);
        Gate::policy(OperationalRoute::class, OperationalRoutePolicy::class);
        Gate::policy(RouteStop::class, RouteStopPolicy::class);
        Gate::policy(Order::class, OrderPolicy::class);
        Gate::policy(OrderFeedback::class, OrderFeedbackPolicy::class);
        Gate::policy(Knife::class, KnifePolicy::class);
        Gate::policy(DamageReport::class, DamageReportPolicy::class);
        Gate::policy(Invoice::class, InvoicePolicy::class);
        Gate::policy(Payment::class, PaymentPolicy::class);
        Gate::policy(PricingRule::class, PricingRulePolicy::class);
        Gate::policy(ServiceArea::class, ServiceAreaPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(SubscriptionPlan::class, SubscriptionPlanPolicy::class);
        Gate::policy(CompanySubscription::class, CompanySubscriptionPolicy::class);
    }
}
