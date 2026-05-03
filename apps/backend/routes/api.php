<?php

use App\Http\Controllers\Admin\AdminSubscriptionDashboardController;
use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\BookingController;
use App\Http\Controllers\Admin\CompanyContactController;
use App\Http\Controllers\Admin\CompanyController;
use App\Http\Controllers\Admin\CompanyLocationController;
use App\Http\Controllers\Admin\CompanyPortalInviteController;
use App\Http\Controllers\Admin\CompanySubscriptionController;
use App\Http\Controllers\Admin\CustomerPortalUpdateController;
use App\Http\Controllers\Admin\DamageReportController;
use App\Http\Controllers\Admin\DashboardSearchController;
use App\Http\Controllers\Admin\EvidencePhotoController;
use App\Http\Controllers\Admin\FinanceDashboardController;
use App\Http\Controllers\Admin\InAppNotificationController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\KnifeController;
use App\Http\Controllers\Admin\LookupController;
use App\Http\Controllers\Admin\NotificationAdminSettingController;
use App\Http\Controllers\Admin\NotificationDeliveryController;
use App\Http\Controllers\Admin\NotificationEmailPreviewController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\OrderFeedbackController;
use App\Http\Controllers\Admin\OrderSubscriptionCoverageController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\PricingRuleController;
use App\Http\Controllers\Admin\ReportExportController;
use App\Http\Controllers\Admin\ReportingController;
use App\Http\Controllers\Admin\RouteController;
use App\Http\Controllers\Admin\RouteStopController;
use App\Http\Controllers\Admin\ServiceAreaController;
use App\Http\Controllers\Admin\ServiceAreaWaitlistController;
use App\Http\Controllers\Admin\SiteContentController;
use App\Http\Controllers\Admin\SubscriptionPlanController;
use App\Http\Controllers\Admin\UserDirectoryController;
use App\Http\Controllers\Admin\WebhookInboxController;
use App\Http\Controllers\Admin\WorkQueueController;
use App\Http\Controllers\Api\Account\AccountBookingController;
use App\Http\Controllers\Api\Account\AccountDashboardController;
use App\Http\Controllers\Api\Account\AccountInAppNotificationController;
use App\Http\Controllers\Api\Account\AccountInvoiceController;
use App\Http\Controllers\Api\Account\AccountKnifeController;
use App\Http\Controllers\Api\Account\AccountLocationController;
use App\Http\Controllers\Api\Account\AccountOrderController;
use App\Http\Controllers\Api\Account\AccountOrderEvidencePhotoController;
use App\Http\Controllers\Api\Account\AccountOrderFeedbackController;
use App\Http\Controllers\Api\Account\AccountSettingsController;
use App\Http\Controllers\Api\Account\AccountSubscriptionController;
use App\Http\Controllers\Api\V1\BootstrapTenantOrganisationController;
use App\Http\Controllers\Api\V1\InternalSmokeController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\TenantSmokeController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\Public\PublicBookingEnquiryController;
use App\Http\Controllers\Public\PublicPricingEstimateController;
use App\Http\Controllers\Public\PublicServiceAreaCheckController;
use App\Http\Controllers\Public\PublicServiceAreaWaitlistController;
use App\Http\Controllers\Public\PublicSiteContentController;
use App\Http\Controllers\Public\PublicSubscriptionPlansController;
use App\Http\Controllers\Public\PublicTrackingController;
use App\Http\Controllers\Webhooks\ClerkWebhookController;
use App\Http\Controllers\Webhooks\StripeWebhookController;
use Illuminate\Support\Facades\Route;

Route::get('health', HealthController::class)->name('api.health');

Route::prefix('public')->middleware('throttle:site-content-public')->group(function (): void {
    Route::get('site-content', [PublicSiteContentController::class, 'show'])->name('api.public.site_content.show');
    Route::get('subscription-plans', [PublicSubscriptionPlansController::class, 'index'])
        ->name('api.public.subscription_plans.index');
});

Route::prefix('public')->middleware('throttle:tracking-public')->group(function (): void {
    Route::get('track/{token}', [PublicTrackingController::class, 'show'])
        ->where('token', '[A-Za-z0-9_-]+')
        ->name('api.public.track.show');
});

/** Tenant portal — Bearer + EnsureTenantCustomer + per-route permission belt (policies retain company scope). */
Route::middleware(['clerk.auth', 'tenant'])->prefix('account')->group(function (): void {
    Route::middleware('permission:dashboard.view')->get('dashboard', [AccountDashboardController::class, 'show'])->name('api.account.dashboard');
    Route::middleware('permission:dashboard.view')->get('subscription', [AccountSubscriptionController::class, 'show'])->name('api.account.subscription.show');

    Route::middleware('permission:bookings.view')->get('bookings', [AccountBookingController::class, 'index'])->name('api.account.bookings.index');
    Route::middleware('permission:bookings.create')->post('bookings', [AccountBookingController::class, 'store'])->name('api.account.bookings.store');
    Route::middleware('permission:bookings.view')->get('bookings/{booking}', [AccountBookingController::class, 'show'])->whereUuid('booking')->name('api.account.bookings.show');
    Route::middleware('permission:bookings.view')->get('bookings/{booking}/tracking-link', [AccountBookingController::class, 'trackingLink'])->whereUuid('booking')->name('api.account.bookings.tracking_link');
    Route::middleware('permission:bookings.cancel')->post('bookings/{booking}/cancel', [AccountBookingController::class, 'cancel'])->whereUuid('booking')->name('api.account.bookings.cancel');

    Route::middleware('permission:orders.view')->get('orders', [AccountOrderController::class, 'index'])->name('api.account.orders.index');
    Route::middleware('permission:orders.view')->get('orders/{order}', [AccountOrderController::class, 'show'])->whereUuid('order')->name('api.account.orders.show');
    Route::middleware('permission:orders.view')->get('orders/{order}/feedback', [AccountOrderFeedbackController::class, 'show'])->whereUuid('order')->name('api.account.orders.feedback.show');
    Route::middleware('permission:orders.view')->post('orders/{order}/feedback', [AccountOrderFeedbackController::class, 'store'])->whereUuid('order')->name('api.account.orders.feedback.store');
    Route::middleware('permission:orders.view')->get('orders/{order}/evidence-photos/{photo}/file', [AccountOrderEvidencePhotoController::class, 'showFile'])->whereUuid(['order', 'photo'])->name('api.account.orders.evidence_photos.file');

    Route::middleware('permission:knives.view')->get('knives', [AccountKnifeController::class, 'index'])->name('api.account.knives.index');
    Route::middleware('permission:knives.view')->get('knives/{knife}', [AccountKnifeController::class, 'show'])->whereUuid('knife')->name('api.account.knives.show');

    Route::middleware('permission:invoices.view')->get('invoices', [AccountInvoiceController::class, 'index'])->name('api.account.invoices.index');
    Route::middleware('permission:invoices.view')->get('invoices/{invoice}', [AccountInvoiceController::class, 'show'])->whereUuid('invoice')->name('api.account.invoices.show');

    Route::middleware('permission:account.locations.manage')->get('locations', [AccountLocationController::class, 'index'])->name('api.account.locations.index');
    Route::middleware('permission:account.locations.manage')->post('locations', [AccountLocationController::class, 'store'])->name('api.account.locations.store');
    Route::middleware('permission:account.locations.manage')->put('locations/{location}', [AccountLocationController::class, 'update'])->whereUuid('location')->name('api.account.locations.update');

    Route::middleware('permission:account.settings.update')->get('settings', [AccountSettingsController::class, 'show'])->name('api.account.settings.show');
    Route::middleware('permission:account.settings.update')->put('settings', [AccountSettingsController::class, 'update'])->name('api.account.settings.update');

    Route::middleware('permission:dashboard.view')->get('in-app-notifications', [AccountInAppNotificationController::class, 'index'])->name('api.account.in_app_notifications.index');
    Route::middleware('permission:dashboard.view')->patch('in-app-notifications/{notification}', [AccountInAppNotificationController::class, 'markRead'])
        ->whereUuid('notification')
        ->name('api.account.in_app_notifications.mark_read');
    Route::middleware('permission:dashboard.view')->post('in-app-notifications/mark-all-read', [AccountInAppNotificationController::class, 'markAllRead'])
        ->name('api.account.in_app_notifications.mark_all_read');
});

Route::prefix('v1')->group(function (): void {
    Route::middleware(['clerk.auth'])->group(function (): void {
        Route::get('me', [MeController::class, 'show'])->name('api.v1.me');
        Route::post('account/bootstrap-organisation', [BootstrapTenantOrganisationController::class, 'store'])
            ->middleware('throttle:12,1440')
            ->name('api.v1.account.bootstrap_organisation');
    });

    if (! app()->environment('production')) {
        Route::prefix('admin')->middleware(['clerk.auth', 'staff'])->group(function (): void {
            Route::get('smoke', InternalSmokeController::class)->name('api.v1.admin.smoke');
        });

        Route::prefix('account')->middleware(['clerk.auth', 'tenant'])->group(function (): void {
            Route::middleware('permission:dashboard.view')->get('smoke', TenantSmokeController::class)->name('api.v1.account.smoke');
        });
    }
});

/** Internal ops API — Bearer + EnsureInternalStaff + permission belt on mutators / sensitive reads. Route lifecycle remains policy-aware for driver-as-signing-user. */
Route::prefix('admin')->middleware(['clerk.auth', 'staff'])->group(function (): void {
    Route::middleware('permission:analytics.view')->prefix('analytics')->group(function (): void {
        Route::get('overview', [AnalyticsController::class, 'overview'])->name('api.admin.analytics.overview');
        Route::get('sales', [AnalyticsController::class, 'sales'])->name('api.admin.analytics.sales');
        Route::get('routes', [AnalyticsController::class, 'routes'])->name('api.admin.analytics.routes');
        Route::get('operations', [AnalyticsController::class, 'operations'])->name('api.admin.analytics.operations');
    });

    Route::middleware('permission:dashboard.view')->get('work-queue', [WorkQueueController::class, 'index'])->name('api.admin.work_queue.index');

    Route::middleware('permission:dashboard.view')->get('notifications/in-app', [InAppNotificationController::class, 'index'])->name('api.admin.in_app_notifications.index');
    Route::middleware('permission:dashboard.view')->patch('notifications/in-app/{notification}', [InAppNotificationController::class, 'markRead'])
        ->whereUuid('notification')
        ->name('api.admin.in_app_notifications.mark_read');
    Route::middleware('permission:dashboard.view')->post('notifications/in-app/mark-all-read', [InAppNotificationController::class, 'markAllRead'])
        ->name('api.admin.in_app_notifications.mark_all_read');

    Route::middleware('permission:dashboard.view')->get('dashboard-search', DashboardSearchController::class)->name('api.admin.dashboard_search');

    Route::middleware('permission:audit_logs.view')->get('audit-logs', [AuditLogController::class, 'index'])->name('api.admin.audit_logs.index');

    Route::middleware('permission:system.tools.view')->get('webhooks/inbox', [WebhookInboxController::class, 'index'])->name('api.admin.webhooks.inbox.index');

    Route::middleware('permission:notifications.deliveries.view')
        ->get('notifications/deliveries', [NotificationDeliveryController::class, 'globalIndex'])
        ->name('api.admin.notifications.deliveries.index');

    Route::middleware('permission:settings.manage')->group(function (): void {
        Route::get('notifications/settings', [NotificationAdminSettingController::class, 'show'])->name('api.admin.notifications.settings.show');
        Route::put('notifications/settings', [NotificationAdminSettingController::class, 'update'])->name('api.admin.notifications.settings.update');
        Route::get('notifications/email-preview', [NotificationEmailPreviewController::class, 'show'])->name('api.admin.notifications.email_preview.show');
        Route::get('site-content', [SiteContentController::class, 'show'])->name('api.admin.site_content.show');
        Route::put('site-content', [SiteContentController::class, 'update'])->name('api.admin.site_content.update');
        Route::delete('site-content', [SiteContentController::class, 'destroy'])->name('api.admin.site_content.destroy');
    });

    Route::middleware('permission:subscriptions.view')->prefix('subscription-plans')->group(function (): void {
        Route::get('/', [SubscriptionPlanController::class, 'index'])->name('api.admin.subscription_plans.index');
    });

    Route::middleware('permission:subscriptions.manage')->prefix('subscription-plans')->group(function (): void {
        Route::post('/', [SubscriptionPlanController::class, 'store'])->name('api.admin.subscription_plans.store');
        Route::put('{plan}', [SubscriptionPlanController::class, 'update'])->whereUuid('plan')->name('api.admin.subscription_plans.update');
        Route::post('{plan}/activate', [SubscriptionPlanController::class, 'activate'])->whereUuid('plan')->name('api.admin.subscription_plans.activate');
        Route::post('{plan}/deactivate', [SubscriptionPlanController::class, 'deactivate'])->whereUuid('plan')->name('api.admin.subscription_plans.deactivate');
        Route::post('{plan}/archive', [SubscriptionPlanController::class, 'archive'])->whereUuid('plan')->name('api.admin.subscription_plans.archive');
    });

    Route::middleware('permission:pricing.view')->get('pricing-rules', [PricingRuleController::class, 'index'])->name('api.admin.pricing_rules.index');
    Route::middleware('permission:pricing.manage')->post('pricing-rules', [PricingRuleController::class, 'store'])->name('api.admin.pricing_rules.store');
    Route::middleware('permission:pricing.manage')->put('pricing-rules/{pricingRule}', [PricingRuleController::class, 'update'])->whereUuid('pricingRule')->name('api.admin.pricing_rules.update');

    Route::middleware('permission:users.view')->get('users', [UserDirectoryController::class, 'index'])->name('api.admin.users.index');
    Route::middleware('permission:users.view')->get('users/{target}', [UserDirectoryController::class, 'show'])->whereNumber('target')->name('api.admin.users.show');
    Route::middleware('permission:users.manage')->put('users/{target}', [UserDirectoryController::class, 'update'])->whereNumber('target')->name('api.admin.users.update');
    Route::middleware('permission:users.manage')->post('users/{target}/deactivate', [UserDirectoryController::class, 'deactivate'])->whereNumber('target')->name('api.admin.users.deactivate');
    Route::middleware('permission:users.manage')->post('users/{target}/activate', [UserDirectoryController::class, 'activate'])->whereNumber('target')->name('api.admin.users.activate');
    Route::middleware('permission:users.manage')->post('users/{target}/invite-placeholder', [UserDirectoryController::class, 'invitePlaceholder'])->whereNumber('target')->name('api.admin.users.invite_placeholder');

    Route::middleware('permission:companies.view')->get('lookups/companies', [LookupController::class, 'companies'])->name('api.admin.lookups.companies');
    Route::middleware('permission:users.view')->get('lookups/users', [LookupController::class, 'users'])->name('api.admin.lookups.users');
    Route::middleware('permission:bookings.view')->get('lookups/bookings', [LookupController::class, 'bookings'])->name('api.admin.lookups.bookings');
    Route::middleware('permission:routes.view')->get('lookups/routes', [LookupController::class, 'routes'])->name('api.admin.lookups.routes');
    Route::middleware('permission:routes.manage')->get('lookups/route-drivers', [LookupController::class, 'routeDrivers'])->name('api.admin.lookups.route_drivers');
    Route::middleware('permission:orders.view')->get('lookups/orders', [LookupController::class, 'orders'])->name('api.admin.lookups.orders');
    Route::middleware('permission:knives.view')->get('lookups/knives', [LookupController::class, 'knives'])->name('api.admin.lookups.knives');
    Route::middleware('permission:companies.view')->get('lookups/locations', [LookupController::class, 'locations'])->name('api.admin.lookups.locations');
    Route::middleware('permission:companies.view')->get('lookups/contacts', [LookupController::class, 'contacts'])->name('api.admin.lookups.contacts');

    Route::middleware('permission:companies.view')->get('companies', [CompanyController::class, 'index'])->name('api.admin.companies.index');
    Route::middleware('permission:companies.view')->get('service-area-waitlist', [ServiceAreaWaitlistController::class, 'index'])->name('api.admin.service_area_waitlist.index');
    Route::middleware('permission:service_areas.view')->get('service-areas', [ServiceAreaController::class, 'index'])->name('api.admin.service_areas.index');
    Route::middleware('permission:service_areas.manage')->post('service-areas', [ServiceAreaController::class, 'store'])->name('api.admin.service_areas.store');
    Route::middleware('permission:service_areas.manage')->put('service-areas/{service_area}', [ServiceAreaController::class, 'update'])
        ->whereUuid('service_area')
        ->name('api.admin.service_areas.update');
    Route::middleware('permission:service_areas.manage')->delete('service-areas/{service_area}', [ServiceAreaController::class, 'destroy'])
        ->whereUuid('service_area')
        ->name('api.admin.service_areas.destroy');
    Route::middleware('permission:companies.create')->post('companies', [CompanyController::class, 'store'])->name('api.admin.companies.store');
    Route::middleware('permission:companies.view')->get('companies/{company}', [CompanyController::class, 'show'])->whereUuid('company')->name('api.admin.companies.show');
    Route::middleware('permission:subscriptions.view')->get('subscription-billing/dashboard', [AdminSubscriptionDashboardController::class, 'index'])->name('api.admin.subscription_billing.dashboard');
    Route::middleware('permission:subscriptions.view')->get('companies/{company}/subscription-billing-periods', [CompanySubscriptionController::class, 'billingPeriods'])->whereUuid('company')->name('api.admin.companies.subscription_billing_periods.index');
    Route::middleware('permission:subscriptions.view')->get('companies/{company}/subscriptions', [CompanySubscriptionController::class, 'index'])->whereUuid('company')->name('api.admin.companies.subscriptions.index');
    Route::middleware('permission:subscriptions.view')->get('companies/{company}/subscriptions/{subscription}/activity', [CompanySubscriptionController::class, 'activity'])->whereUuid(['company', 'subscription'])->name('api.admin.companies.subscriptions.activity');
    Route::middleware('permission:subscriptions.view')->get('companies/{company}/subscription-usage', [CompanySubscriptionController::class, 'usage'])->whereUuid('company')->name('api.admin.companies.subscription_usage');
    Route::middleware('permission:invoices.create')->post('companies/{company}/subscriptions/{subscription}/invoice-draft', [CompanySubscriptionController::class, 'generateInvoiceDraft'])
        ->whereUuid(['company', 'subscription'])
        ->name('api.admin.companies.subscriptions.invoice_draft');
    Route::middleware('permission:subscriptions.manage')->post('companies/{company}/subscriptions', [CompanySubscriptionController::class, 'store'])->whereUuid('company')->name('api.admin.companies.subscriptions.store');
    Route::middleware('permission:subscriptions.manage')->post('companies/{company}/subscriptions/change-plan', [CompanySubscriptionController::class, 'changePlan'])->whereUuid('company')->name('api.admin.companies.subscriptions.change_plan');
    Route::middleware('permission:subscriptions.manage')->post('companies/{company}/subscriptions/cancel', [CompanySubscriptionController::class, 'cancel'])->whereUuid('company')->name('api.admin.companies.subscriptions.cancel');
    Route::middleware('permission:subscriptions.manage')->post('companies/{company}/subscriptions/reactivate', [CompanySubscriptionController::class, 'reactivate'])->whereUuid('company')->name('api.admin.companies.subscriptions.reactivate');
    Route::middleware('permission:subscriptions.view')->get('companies/{company}/subscriptions/{subscription}/notifications', [NotificationDeliveryController::class, 'subscriptionIndex'])->whereUuid(['company', 'subscription'])->name('api.admin.companies.subscriptions.notifications.index');
    Route::middleware('permission:subscriptions.manage')->post('companies/{company}/subscriptions/{subscription}/renew-billing-period', [CompanySubscriptionController::class, 'renewBillingPeriod'])
        ->whereUuid(['company', 'subscription'])
        ->name('api.admin.companies.subscriptions.renew_billing_period');
    Route::middleware('permission:subscriptions.manage')->patch('companies/{company}/subscriptions/{subscription}', [CompanySubscriptionController::class, 'updateBillingContact'])->whereUuid(['company', 'subscription'])->name('api.admin.companies.subscriptions.update_billing_contact');
    Route::middleware('permission:companies.update')->put('companies/{company}', [CompanyController::class, 'update'])->whereUuid('company')->name('api.admin.companies.update');
    Route::middleware('permission:companies.delete')->delete('companies/{company}', [CompanyController::class, 'destroy'])->whereUuid('company')->name('api.admin.companies.destroy');
    Route::middleware('permission:companies.view')->get('companies/{company}/summary', [CompanyController::class, 'summary'])->whereUuid('company')->name('api.admin.companies.summary');
    Route::middleware('permission:companies.view')->get('companies/{company}/activity', [CompanyController::class, 'activity'])->whereUuid('company')->name('api.admin.companies.activity');
    Route::middleware('permission:orders.view')->get('companies/{company}/order-feedback', [OrderFeedbackController::class, 'index'])->whereUuid('company')->name('api.admin.companies.order_feedback.index');
    Route::middleware('permission:orders.view')->patch('companies/{company}/order-feedback/{feedback}', [OrderFeedbackController::class, 'update'])->whereUuid(['company', 'feedback'])->name('api.admin.companies.order_feedback.update');
    Route::middleware('permission:companies.update')->post('companies/{company}/notes', [CompanyController::class, 'storeNote'])->whereUuid('company')->name('api.admin.companies.notes.store');
    Route::middleware('permission:companies.update')->post('companies/{company}/portal-invites', [CompanyPortalInviteController::class, 'store'])->whereUuid('company')->name('api.admin.companies.portal_invites.store');
    Route::middleware('permission:companies.update')->post('companies/{company}/portal-invites/{invite}/resend', [CompanyPortalInviteController::class, 'resend'])->whereUuid(['company', 'invite'])->name('api.admin.companies.portal_invites.resend');
    Route::middleware('permission:companies.update')->post('companies/{company}/contacts', [CompanyController::class, 'storeContact'])->whereUuid('company')->name('api.admin.companies.contacts.store');
    Route::middleware('permission:companies.update')->put('companies/{company}/contacts/{contact}', [CompanyContactController::class, 'update'])->whereUuid('company')->whereUuid('contact')->name('api.admin.companies.contacts.update');
    Route::middleware('permission:companies.update')->post('companies/{company}/contacts/{contact}/archive', [CompanyContactController::class, 'archive'])->whereUuid('company')->whereUuid('contact')->name('api.admin.companies.contacts.archive');
    Route::middleware('permission:companies.update')->post('companies/{company}/contacts/{contact}/restore', [CompanyContactController::class, 'restore'])->whereUuid('company')->whereUuid('contact')->name('api.admin.companies.contacts.restore');
    Route::middleware('permission:companies.update')->post('companies/{company}/contacts/{contact}/set-primary', [CompanyContactController::class, 'setPrimary'])->whereUuid('company')->whereUuid('contact')->name('api.admin.companies.contacts.set_primary');
    Route::middleware('permission:companies.update')->post('companies/{company}/locations', [CompanyController::class, 'storeLocation'])->whereUuid('company')->name('api.admin.companies.locations.store');
    Route::middleware('permission:companies.update')->put('companies/{company}/locations/{location}', [CompanyLocationController::class, 'update'])->whereUuid('company')->whereUuid('location')->name('api.admin.companies.locations.update');
    Route::middleware('permission:companies.update')->post('companies/{company}/locations/{location}/archive', [CompanyLocationController::class, 'archive'])->whereUuid('company')->whereUuid('location')->name('api.admin.companies.locations.archive');
    Route::middleware('permission:companies.update')->post('companies/{company}/locations/{location}/restore', [CompanyLocationController::class, 'restore'])->whereUuid('company')->whereUuid('location')->name('api.admin.companies.locations.restore');
    Route::middleware('permission:companies.update')->post('companies/{company}/locations/{location}/set-default', [CompanyLocationController::class, 'setDefault'])->whereUuid('company')->whereUuid('location')->name('api.admin.companies.locations.set_default');
    Route::middleware('permission:bookings.create')->post('companies/{company}/bookings', [CompanyController::class, 'storeBooking'])->whereUuid('company')->name('api.admin.companies.bookings.store');
    Route::middleware('permission:companies.update')->put('companies/{company}/status', [CompanyController::class, 'updateStatus'])->whereUuid('company')->name('api.admin.companies.status.update');

    Route::middleware('permission:routes.view')->get('routes/today', [RouteController::class, 'today'])->name('api.admin.routes.today');
    Route::middleware('permission:routes.manage')->post('routes', [RouteController::class, 'store'])->name('api.admin.routes.store');
    Route::middleware('permission:routes.view')->get('routes', [RouteController::class, 'index'])->name('api.admin.routes.index');
    Route::middleware('permission:routes.view')->get('routes/{route}', [RouteController::class, 'show'])->whereUuid('route')->name('api.admin.routes.show');
    Route::middleware('permission:routes.manage')->put('routes/{route}', [RouteController::class, 'update'])->whereUuid('route')->name('api.admin.routes.update');
    Route::middleware('permission:routes.view')->get('routes/{route}/completion-summary', [RouteController::class, 'completionSummary'])->whereUuid('route')->name('api.admin.routes.completion_summary');
    Route::middleware('permission:routes.view')->post('routes/{route}/start', [RouteController::class, 'start'])->whereUuid('route')->name('api.admin.routes.start');
    Route::middleware('permission:routes.view')->post('routes/{route}/complete', [RouteController::class, 'complete'])->whereUuid('route')->name('api.admin.routes.complete');
    Route::middleware('permission:routes.manage')->post('routes/{route}/stops', [RouteController::class, 'storeStop'])->whereUuid('route')->name('api.admin.routes.stops.store');
    Route::middleware('permission:routes.manage')->put('routes/{route}/reorder-stops', [RouteController::class, 'reorder'])->whereUuid('route')->name('api.admin.routes.stops.reorder');
    Route::middleware('permission:routes.manage')->delete('routes/{route}/stops/{stop}', [RouteController::class, 'destroyStop'])->whereUuid(['route', 'stop'])->name('api.admin.routes.stops.destroy');

    Route::middleware('permission:routes.view')->get('route-stops/{stop}', [RouteStopController::class, 'show'])->whereUuid('stop')->name('api.admin.route_stops.show');
    Route::middleware('permission:route_stops.update')->put('route-stops/{stop}', [RouteStopController::class, 'update'])->whereUuid('stop')->name('api.admin.route_stops.update');
    Route::middleware('permission:route_stops.update')->post('route-stops/{stop}/mark-travelling', [RouteStopController::class, 'markTravelling'])->whereUuid('stop')->name('api.admin.route_stops.mark_travelling');
    Route::middleware('permission:route_stops.update')->post('route-stops/{stop}/mark-arrived', [RouteStopController::class, 'markArrived'])->whereUuid('stop')->name('api.admin.route_stops.mark_arrived');
    Route::middleware('permission:route_stops.update')->post('route-stops/{stop}/mark-collected', [RouteStopController::class, 'markCollected'])->whereUuid('stop')->name('api.admin.route_stops.mark_collected');
    Route::middleware('permission:route_stops.update')->post('route-stops/{stop}/mark-returned', [RouteStopController::class, 'markReturned'])->whereUuid('stop')->name('api.admin.route_stops.mark_returned');
    Route::middleware('permission:route_stops.update')->post('route-stops/{stop}/mark-skipped', [RouteStopController::class, 'markSkipped'])->whereUuid('stop')->name('api.admin.route_stops.mark_skipped');
    Route::middleware('permission:route_stops.update')->post('route-stops/{stop}/complete', [RouteStopController::class, 'complete'])->whereUuid('stop')->name('api.admin.route_stops.complete');

    Route::middleware('permission:route_stops.update')->post('route-stops/{stop}/evidence-photos', [EvidencePhotoController::class, 'storeForRouteStop'])->whereUuid('stop')->name('api.admin.route_stops.evidence_photos.store');
    Route::middleware('permission:orders.update')->post('orders/{order}/evidence-photos', [EvidencePhotoController::class, 'storeForOrder'])->whereUuid('order')->name('api.admin.orders.evidence_photos.store');
    Route::middleware('permission:knives.update')->post('knives/{knife}/evidence-photos', [EvidencePhotoController::class, 'storeForKnife'])->whereUuid('knife')->name('api.admin.knives.evidence_photos.store');
    Route::middleware('permission:knives.update')->post('damage-reports/{damageReport}/evidence-photos', [EvidencePhotoController::class, 'storeForDamageReport'])->whereUuid('damageReport')->name('api.admin.damage_reports.evidence_photos.store');
    Route::patch('evidence-photos/{photo}', [EvidencePhotoController::class, 'update'])->whereUuid('photo')->name('api.admin.evidence_photos.update');
    Route::middleware('permission:routes.view')->get('evidence-photos/{photo}/file', [EvidencePhotoController::class, 'showFile'])->whereUuid('photo')->name('api.admin.evidence_photos.file');

    Route::middleware('permission:route_stops.update')->post('route-stops/{stop}/customer-portal-updates', [CustomerPortalUpdateController::class, 'storeForRouteStop'])->whereUuid('stop')->name('api.admin.route_stops.customer_portal_updates.store');
    Route::middleware('permission:orders.update')->post('orders/{order}/customer-portal-updates', [CustomerPortalUpdateController::class, 'storeForOrder'])->whereUuid('order')->name('api.admin.orders.customer_portal_updates.store');
    Route::patch('customer-portal-updates/{update}', [CustomerPortalUpdateController::class, 'update'])->whereUuid('update')->name('api.admin.customer_portal_updates.update');

    Route::middleware('permission:bookings.view')->get('bookings', [BookingController::class, 'index'])->name('api.admin.bookings.index');
    Route::middleware('permission:bookings.create')->post('bookings', [BookingController::class, 'store'])->name('api.admin.bookings.store');
    Route::middleware('permission:bookings.view')->get('bookings/{booking}', [BookingController::class, 'show'])->whereUuid('booking')->name('api.admin.bookings.show');
    Route::middleware('permission:bookings.update')->put('bookings/{booking}', [BookingController::class, 'update'])->whereUuid('booking')->name('api.admin.bookings.update');
    Route::middleware('permission:bookings.delete')->delete('bookings/{booking}', [BookingController::class, 'destroy'])->whereUuid('booking')->name('api.admin.bookings.destroy');
    Route::middleware('permission:bookings.update')->post('bookings/{booking}/confirm', [BookingController::class, 'confirm'])->whereUuid('booking')->name('api.admin.bookings.confirm');
    Route::middleware('permission:bookings.cancel')->post('bookings/{booking}/cancel', [BookingController::class, 'cancel'])->whereUuid('booking')->name('api.admin.bookings.cancel');
    Route::middleware('permission:bookings.view')->get('bookings/{booking}/notifications', [NotificationDeliveryController::class, 'bookingIndex'])->whereUuid('booking')->name('api.admin.bookings.notifications.index');
    Route::middleware('permission:routes.manage')->post('bookings/{booking}/assign-route', [BookingController::class, 'assignRoute'])->whereUuid('booking')->name('api.admin.bookings.assign_route');
    Route::middleware('permission:routes.manage')->post('bookings/{booking}/unassign-route', [BookingController::class, 'unassignRoute'])->whereUuid('booking')->name('api.admin.bookings.unassign_route');
    Route::middleware('permission:routes.manage')->post('bookings/{booking}/create-route-placeholder', [BookingController::class, 'createRoutePlaceholder'])->whereUuid('booking')->name('api.admin.bookings.create_route_placeholder');
    Route::middleware('permission:orders.create')->post('bookings/{booking}/convert-to-order', [BookingController::class, 'convertToOrder'])->whereUuid('booking')->name('api.admin.bookings.convert_to_order');

    Route::middleware('permission:orders.view')->get('orders', [OrderController::class, 'index'])->name('api.admin.orders.index');
    Route::middleware('permission:orders.create')->post('orders', [OrderController::class, 'store'])->name('api.admin.orders.store');
    Route::middleware('permission:orders.view')->get('orders/{order}', [OrderController::class, 'show'])->whereUuid('order')->name('api.admin.orders.show');
    Route::middleware('permission:orders.view')->get('orders/{order}/notifications', [NotificationDeliveryController::class, 'orderIndex'])->whereUuid('order')->name('api.admin.orders.notifications.index');
    Route::middleware('permission:orders.update')->put('orders/{order}', [OrderController::class, 'update'])->whereUuid('order')->name('api.admin.orders.update');
    Route::middleware('permission:orders.update')->post('orders/{order}/subscription-coverage/recompute', [OrderSubscriptionCoverageController::class, 'recompute'])->whereUuid('order')->name('api.admin.orders.subscription_coverage.recompute');
    Route::middleware('permission:orders.update')->post('orders/{order}/subscription-coverage/override-one-off', [OrderSubscriptionCoverageController::class, 'overrideOneOff'])->whereUuid('order')->name('api.admin.orders.subscription_coverage.override_one_off');
    Route::middleware('permission:orders.update')->post('orders/{order}/transition', [OrderController::class, 'transition'])->whereUuid('order')->name('api.admin.orders.transition');
    Route::middleware('permission:orders.update')->post('orders/{order}/complete', [OrderController::class, 'complete'])->whereUuid('order')->name('api.admin.orders.complete');
    Route::middleware('permission:invoices.create')->post('orders/{order}/invoice-draft', [OrderController::class, 'storeInvoiceDraft'])->whereUuid('order')->name('api.admin.orders.invoice_draft');
    Route::middleware('permission:knives.update')->post('orders/{order}/attach-knife', [OrderController::class, 'attachKnife'])->whereUuid('order')->name('api.admin.orders.attach_knife');
    Route::middleware('permission:knives.update')->post('orders/{order}/add-knife', [OrderController::class, 'addKnife'])->whereUuid('order')->name('api.admin.orders.add_knife');
    Route::middleware('permission:knives.update')->post('orders/{order}/bulk-add-knives', [OrderController::class, 'bulkAddKnives'])->whereUuid('order')->name('api.admin.orders.bulk_add_knives');
    Route::middleware('permission:knives.update')->post('orders/{order}/bulk-order-items', [OrderController::class, 'bulkAddOrderItems'])->whereUuid('order')->name('api.admin.orders.bulk_order_items');
    Route::middleware('permission:knives.update')->post('orders/{order}/bulk-workshop', [OrderController::class, 'bulkWorkshop'])->whereUuid('order')->name('api.admin.orders.bulk_workshop');
    Route::middleware('permission:knives.update')->post('orders/{order}/items/{orderItem}/transition', [OrderController::class, 'transitionOrderItem'])->whereUuid(['order', 'orderItem'])->name('api.admin.orders.items.transition');

    Route::middleware('permission:knives.view')->get('knives', [KnifeController::class, 'index'])->name('api.admin.knives.index');
    Route::middleware('permission:knives.update')->post('knives', [KnifeController::class, 'store'])->name('api.admin.knives.store');
    Route::middleware('permission:knives.view')->get('knives/{knife}', [KnifeController::class, 'show'])->whereUuid('knife')->name('api.admin.knives.show');
    Route::middleware('permission:knives.update')->put('knives/{knife}', [KnifeController::class, 'update'])->whereUuid('knife')->name('api.admin.knives.update');
    Route::middleware('permission:knives.update')->post('knives/{knife}/transition', [KnifeController::class, 'transition'])->whereUuid('knife')->name('api.admin.knives.transition');
    Route::middleware('permission:knives.update')->post('knives/{knife}/mark-inspected', [KnifeController::class, 'markInspected'])->whereUuid('knife')->name('api.admin.knives.mark_inspected');
    Route::middleware('permission:knives.update')->post('knives/{knife}/mark-sharpened', [KnifeController::class, 'markSharpened'])->whereUuid('knife')->name('api.admin.knives.mark_sharpened');
    Route::middleware('permission:knives.update')->post('knives/{knife}/mark-quality-checked', [KnifeController::class, 'markQualityChecked'])->whereUuid('knife')->name('api.admin.knives.mark_quality_checked');
    Route::middleware('permission:knives.update')->post('knives/{knife}/mark-returned', [KnifeController::class, 'markReturned'])->whereUuid('knife')->name('api.admin.knives.mark_returned');
    Route::middleware('permission:knives.update')->post('knives/{knife}/report-issue', [KnifeController::class, 'reportIssue'])->whereUuid('knife')->name('api.admin.knives.report_issue');
    Route::middleware('permission:knives.update')->post('knives/{knife}/inspection', [KnifeController::class, 'recordInspection'])->whereUuid('knife')->name('api.admin.knives.inspection');
    Route::middleware('permission:knives.update')->post('knives/{knife}/damage-reports', [DamageReportController::class, 'store'])->whereUuid('knife')->name('api.admin.knives.damage_reports.store');
    Route::middleware('permission:knives.update')->put('damage-reports/{damageReport}', [DamageReportController::class, 'update'])->whereUuid('damageReport')->name('api.admin.damage_reports.update');
    Route::middleware('permission:knives.update')->post('damage-reports/{damageReport}/archive', [DamageReportController::class, 'archive'])->whereUuid('damageReport')->name('api.admin.damage_reports.archive');
    Route::middleware('permission:knives.update')->post('knives/{knife}/photos', [KnifeController::class, 'storePhoto'])->whereUuid('knife')->name('api.admin.knives.photos.store');
    Route::middleware('permission:knives.view')->get('knife-photos/{photo}/file', [KnifeController::class, 'showPhotoFile'])->whereUuid('photo')->name('api.admin.knife_photos.file');
    Route::middleware('permission:knives.update')->delete('knives/{knife}/photos/{photo}', [KnifeController::class, 'destroyPhoto'])->whereUuid(['knife', 'photo'])->name('api.admin.knives.photos.destroy');

    Route::middleware('permission:invoices.view')->get('invoices', [InvoiceController::class, 'index'])->name('api.admin.invoices.index');
    Route::middleware('permission:invoices.create')->post('invoices', [InvoiceController::class, 'store'])->name('api.admin.invoices.store');
    Route::middleware('permission:invoices.view')->get('invoices/{invoice}', [InvoiceController::class, 'show'])->whereUuid('invoice')->name('api.admin.invoices.show');
    Route::middleware('permission:invoices.update')->put('invoices/{invoice}', [InvoiceController::class, 'update'])->whereUuid('invoice')->name('api.admin.invoices.update');
    Route::middleware('permission:invoices.update')->post('invoices/{invoice}/send', [InvoiceController::class, 'send'])->whereUuid('invoice')->name('api.admin.invoices.send');
    Route::middleware('permission:invoices.update')->post('invoices/{invoice}/resend-customer-email', [InvoiceController::class, 'resendCustomerEmail'])->whereUuid('invoice')->name('api.admin.invoices.resend_customer_email');
    Route::middleware('permission:invoices.view')->get('invoices/{invoice}/notifications', [NotificationDeliveryController::class, 'invoiceIndex'])->whereUuid('invoice')->name('api.admin.invoices.notifications.index');
    Route::middleware('permission:invoices.update')->post('invoices/{invoice}/mark-paid', [InvoiceController::class, 'markPaid'])->whereUuid('invoice')->name('api.admin.invoices.mark_paid');
    Route::middleware('permission:invoices.update')->post('invoices/{invoice}/void', [InvoiceController::class, 'void'])->whereUuid('invoice')->name('api.admin.invoices.void');
    Route::middleware('permission:invoices.update')->post('invoices/{invoice}/reopen-draft', [InvoiceController::class, 'reopenDraft'])->whereUuid('invoice')->name('api.admin.invoices.reopen_draft');
    Route::middleware('permission:payments.manage')->post('invoices/{invoice}/stripe-checkout-session', [InvoiceController::class, 'stripeCheckoutSession'])->whereUuid('invoice')->name('api.admin.invoices.stripe_checkout_session');

    Route::middleware(['permission:invoices.view', 'permission:payments.view'])->get('finance/dashboard', FinanceDashboardController::class)->name('api.admin.finance.dashboard');

    Route::middleware('permission:reports.finance')->prefix('reports')->group(function (): void {
        Route::get('sales', [ReportingController::class, 'sales'])->name('api.admin.reports.sales');
        Route::get('invoices', [ReportingController::class, 'invoices'])->name('api.admin.reports.invoices');
        Route::get('billing', [ReportingController::class, 'billing'])->name('api.admin.reports.billing');
        Route::get('recurring-revenue', [ReportingController::class, 'recurringRevenue'])->name('api.admin.reports.recurring_revenue');
        Route::get('subscriptions', [ReportingController::class, 'subscriptions'])->name('api.admin.reports.subscriptions');
        Route::get('export', [ReportingController::class, 'exportPlaceholder'])->name('api.admin.reports.export');
    });

    Route::middleware('permission:reports.finance')->prefix('reports/exports')->group(function (): void {
        Route::get('sales-invoices.csv', [ReportExportController::class, 'salesInvoices'])->name('api.admin.reports.exports.sales_invoices');
        Route::get('invoices-outstanding.csv', [ReportExportController::class, 'invoicesOutstanding'])->name('api.admin.reports.exports.invoices_outstanding');
        Route::get('payments.csv', [ReportExportController::class, 'payments'])->name('api.admin.reports.exports.payments');
        Route::get('subscriptions.csv', [ReportExportController::class, 'subscriptions'])->name('api.admin.reports.exports.subscriptions');
    });

    Route::middleware('permission:reports.operations')->prefix('reports')->group(function (): void {
        Route::get('bookings', [ReportingController::class, 'bookings'])->name('api.admin.reports.bookings');
        Route::get('orders', [ReportingController::class, 'orders'])->name('api.admin.reports.orders');
        Route::get('routes', [ReportingController::class, 'routes'])->name('api.admin.reports.routes');
        Route::get('knives', [ReportingController::class, 'knives'])->name('api.admin.reports.knives');
    });

    Route::middleware('permission:reports.operations')->prefix('reports/exports')->group(function (): void {
        Route::get('bookings.csv', [ReportExportController::class, 'bookings'])->name('api.admin.reports.exports.bookings');
        Route::get('orders.csv', [ReportExportController::class, 'orders'])->name('api.admin.reports.exports.orders');
        Route::get('routes.csv', [ReportExportController::class, 'routes'])->name('api.admin.reports.exports.routes');
        Route::get('knives.csv', [ReportExportController::class, 'knives'])->name('api.admin.reports.exports.knives');
    });

    Route::middleware('permission:payments.view')->get('payments', [PaymentController::class, 'index'])->name('api.admin.payments.index');
    Route::middleware('permission:payments.manage')->post('payments/manual', [PaymentController::class, 'manual'])->name('api.admin.payments.manual');
    Route::middleware('permission:payments.manage')->patch('payments/{payment}', [PaymentController::class, 'update'])->whereUuid('payment')->name('api.admin.payments.update');
});

Route::prefix('public')->middleware('throttle:service-area-public')->group(function (): void {
    Route::post('service-area/check', [PublicServiceAreaCheckController::class, 'store'])->name('api.public.service_area.check');
    Route::post('service-area/waitlist', [PublicServiceAreaWaitlistController::class, 'store'])->name('api.public.service_area.waitlist.store');
});

Route::prefix('public')->middleware('throttle:pricing-estimate-public')->group(function (): void {
    Route::post('pricing-estimate', [PublicPricingEstimateController::class, 'store'])->name('api.public.pricing_estimate.store');
});

Route::prefix('public')->middleware('throttle:booking-enquiries')->group(function (): void {
    Route::post('booking-enquiries', [PublicBookingEnquiryController::class, 'store'])->name('api.public.booking_enquiries.store');
});

/** Provider webhooks — unauthenticated; each controller verifies signatures and returns safe JSON errors. */
Route::middleware('throttle:provider-webhooks')->group(function (): void {
    Route::post('webhooks/clerk', ClerkWebhookController::class)->name('api.webhooks.clerk');
    Route::post('webhooks/stripe', StripeWebhookController::class)->name('api.webhooks.stripe');
});
