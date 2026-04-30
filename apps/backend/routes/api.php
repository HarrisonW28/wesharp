<?php

use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\BookingController;
use App\Http\Controllers\Admin\UserDirectoryController;
use App\Http\Controllers\Admin\CompanyController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\KnifeController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\RouteController;
use App\Http\Controllers\Admin\RouteStopController;
use App\Http\Controllers\Api\Account\AccountBookingController;
use App\Http\Controllers\Api\Account\AccountDashboardController;
use App\Http\Controllers\Api\Account\AccountInvoiceController;
use App\Http\Controllers\Api\Account\AccountKnifeController;
use App\Http\Controllers\Api\Account\AccountLocationController;
use App\Http\Controllers\Api\Account\AccountOrderController;
use App\Http\Controllers\Api\Account\AccountSettingsController;
use App\Http\Controllers\Api\V1\BootstrapTenantOrganisationController;
use App\Http\Controllers\Api\V1\InternalSmokeController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\TenantSmokeController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\Public\PublicBookingEnquiryController;
use App\Http\Controllers\Webhooks\StripeWebhookController;
use Illuminate\Support\Facades\Route;

Route::get('health', HealthController::class)->name('api.health');

/** Tenant portal — Bearer + EnsureTenantCustomer + per-route permission belt (policies retain company scope). */
Route::middleware(['clerk.auth', 'tenant'])->prefix('account')->group(function (): void {
    Route::middleware('permission:dashboard.view')->get('dashboard', [AccountDashboardController::class, 'show'])->name('api.account.dashboard');

    Route::middleware('permission:bookings.view')->get('bookings', [AccountBookingController::class, 'index'])->name('api.account.bookings.index');
    Route::middleware('permission:bookings.create')->post('bookings', [AccountBookingController::class, 'store'])->name('api.account.bookings.store');
    Route::middleware('permission:bookings.view')->get('bookings/{booking}', [AccountBookingController::class, 'show'])->whereUuid('booking')->name('api.account.bookings.show');
    Route::middleware('permission:bookings.cancel')->post('bookings/{booking}/cancel', [AccountBookingController::class, 'cancel'])->whereUuid('booking')->name('api.account.bookings.cancel');

    Route::middleware('permission:orders.view')->get('orders', [AccountOrderController::class, 'index'])->name('api.account.orders.index');
    Route::middleware('permission:orders.view')->get('orders/{order}', [AccountOrderController::class, 'show'])->whereUuid('order')->name('api.account.orders.show');

    Route::middleware('permission:knives.view')->get('knives', [AccountKnifeController::class, 'index'])->name('api.account.knives.index');

    Route::middleware('permission:invoices.view')->get('invoices', [AccountInvoiceController::class, 'index'])->name('api.account.invoices.index');

    Route::middleware('permission:account.locations.manage')->get('locations', [AccountLocationController::class, 'index'])->name('api.account.locations.index');
    Route::middleware('permission:account.locations.manage')->post('locations', [AccountLocationController::class, 'store'])->name('api.account.locations.store');
    Route::middleware('permission:account.locations.manage')->put('locations/{location}', [AccountLocationController::class, 'update'])->whereUuid('location')->name('api.account.locations.update');

    Route::middleware('permission:account.settings.update')->get('settings', [AccountSettingsController::class, 'show'])->name('api.account.settings.show');
    Route::middleware('permission:account.settings.update')->put('settings', [AccountSettingsController::class, 'update'])->name('api.account.settings.update');
});

Route::prefix('v1')->group(function (): void {
    Route::middleware(['clerk.auth'])->group(function (): void {
        Route::get('me', [MeController::class, 'show'])->name('api.v1.me');
        Route::post('account/bootstrap-organisation', [BootstrapTenantOrganisationController::class, 'store'])
            ->middleware('throttle:12,1440')
            ->name('api.v1.account.bootstrap_organisation');
    });

    Route::prefix('admin')->middleware(['clerk.auth', 'staff'])->group(function (): void {
        Route::get('smoke', InternalSmokeController::class)->name('api.v1.admin.smoke');
    });

    Route::prefix('account')->middleware(['clerk.auth', 'tenant'])->group(function (): void {
        Route::middleware('permission:dashboard.view')->get('smoke', TenantSmokeController::class)->name('api.v1.account.smoke');
    });
});

/** Internal ops API — Bearer + EnsureInternalStaff + permission belt on mutators / sensitive reads. Route lifecycle remains policy-aware for driver-as-signing-user. */
Route::prefix('admin')->middleware(['clerk.auth', 'staff'])->group(function (): void {
    Route::middleware('permission:analytics.view')->prefix('analytics')->group(function (): void {
        Route::get('overview', [AnalyticsController::class, 'overview'])->name('api.admin.analytics.overview');
        Route::get('sales', [AnalyticsController::class, 'sales'])->name('api.admin.analytics.sales');
        Route::get('routes', [AnalyticsController::class, 'routes'])->name('api.admin.analytics.routes');
        Route::get('operations', [AnalyticsController::class, 'operations'])->name('api.admin.analytics.operations');
    });

    Route::middleware('permission:users.view')->get('users', [UserDirectoryController::class, 'index'])->name('api.admin.users.index');
    Route::middleware('permission:users.view')->get('users/{target}', [UserDirectoryController::class, 'show'])->whereNumber('target')->name('api.admin.users.show');
    Route::middleware('permission:users.manage')->put('users/{target}', [UserDirectoryController::class, 'update'])->whereNumber('target')->name('api.admin.users.update');
    Route::middleware('permission:users.manage')->post('users/{target}/deactivate', [UserDirectoryController::class, 'deactivate'])->whereNumber('target')->name('api.admin.users.deactivate');
    Route::middleware('permission:users.manage')->post('users/{target}/activate', [UserDirectoryController::class, 'activate'])->whereNumber('target')->name('api.admin.users.activate');

    Route::middleware('permission:companies.view')->get('companies', [CompanyController::class, 'index'])->name('api.admin.companies.index');
    Route::middleware('permission:companies.create')->post('companies', [CompanyController::class, 'store'])->name('api.admin.companies.store');
    Route::middleware('permission:companies.view')->get('companies/{company}', [CompanyController::class, 'show'])->whereUuid('company')->name('api.admin.companies.show');
    Route::middleware('permission:companies.update')->put('companies/{company}', [CompanyController::class, 'update'])->whereUuid('company')->name('api.admin.companies.update');
    Route::middleware('permission:companies.delete')->delete('companies/{company}', [CompanyController::class, 'destroy'])->whereUuid('company')->name('api.admin.companies.destroy');
    Route::middleware('permission:companies.view')->get('companies/{company}/summary', [CompanyController::class, 'summary'])->whereUuid('company')->name('api.admin.companies.summary');
    Route::middleware('permission:companies.view')->get('companies/{company}/activity', [CompanyController::class, 'activity'])->whereUuid('company')->name('api.admin.companies.activity');
    Route::middleware('permission:companies.update')->post('companies/{company}/notes', [CompanyController::class, 'storeNote'])->whereUuid('company')->name('api.admin.companies.notes.store');
    Route::middleware('permission:companies.update')->post('companies/{company}/contacts', [CompanyController::class, 'storeContact'])->whereUuid('company')->name('api.admin.companies.contacts.store');
    Route::middleware('permission:companies.update')->post('companies/{company}/locations', [CompanyController::class, 'storeLocation'])->whereUuid('company')->name('api.admin.companies.locations.store');
    Route::middleware('permission:bookings.create')->post('companies/{company}/bookings', [CompanyController::class, 'storeBooking'])->whereUuid('company')->name('api.admin.companies.bookings.store');
    Route::middleware('permission:companies.update')->put('companies/{company}/status', [CompanyController::class, 'updateStatus'])->whereUuid('company')->name('api.admin.companies.status.update');

    Route::middleware('permission:routes.view')->get('routes/today', [RouteController::class, 'today'])->name('api.admin.routes.today');
    Route::middleware('permission:routes.manage')->post('routes', [RouteController::class, 'store'])->name('api.admin.routes.store');
    Route::middleware('permission:routes.view')->get('routes', [RouteController::class, 'index'])->name('api.admin.routes.index');
    Route::middleware('permission:routes.view')->get('routes/{route}', [RouteController::class, 'show'])->whereUuid('route')->name('api.admin.routes.show');
    Route::middleware('permission:routes.manage')->put('routes/{route}', [RouteController::class, 'update'])->whereUuid('route')->name('api.admin.routes.update');
    Route::post('routes/{route}/start', [RouteController::class, 'start'])->whereUuid('route')->name('api.admin.routes.start');
    Route::post('routes/{route}/complete', [RouteController::class, 'complete'])->whereUuid('route')->name('api.admin.routes.complete');
    Route::middleware('permission:routes.manage')->post('routes/{route}/stops', [RouteController::class, 'storeStop'])->whereUuid('route')->name('api.admin.routes.stops.store');
    Route::middleware('permission:routes.manage')->put('routes/{route}/reorder-stops', [RouteController::class, 'reorder'])->whereUuid('route')->name('api.admin.routes.stops.reorder');

    Route::middleware('permission:routes.view')->get('route-stops/{stop}', [RouteStopController::class, 'show'])->whereUuid('stop')->name('api.admin.route_stops.show');
    Route::put('route-stops/{stop}', [RouteStopController::class, 'update'])->whereUuid('stop')->name('api.admin.route_stops.update');
    Route::post('route-stops/{stop}/mark-travelling', [RouteStopController::class, 'markTravelling'])->whereUuid('stop')->name('api.admin.route_stops.mark_travelling');
    Route::post('route-stops/{stop}/mark-arrived', [RouteStopController::class, 'markArrived'])->whereUuid('stop')->name('api.admin.route_stops.mark_arrived');
    Route::post('route-stops/{stop}/mark-collected', [RouteStopController::class, 'markCollected'])->whereUuid('stop')->name('api.admin.route_stops.mark_collected');
    Route::post('route-stops/{stop}/mark-returned', [RouteStopController::class, 'markReturned'])->whereUuid('stop')->name('api.admin.route_stops.mark_returned');
    Route::post('route-stops/{stop}/complete', [RouteStopController::class, 'complete'])->whereUuid('stop')->name('api.admin.route_stops.complete');

    Route::middleware('permission:bookings.view')->get('bookings', [BookingController::class, 'index'])->name('api.admin.bookings.index');
    Route::middleware('permission:bookings.create')->post('bookings', [BookingController::class, 'store'])->name('api.admin.bookings.store');
    Route::middleware('permission:bookings.view')->get('bookings/{booking}', [BookingController::class, 'show'])->whereUuid('booking')->name('api.admin.bookings.show');
    Route::middleware('permission:bookings.update')->put('bookings/{booking}', [BookingController::class, 'update'])->whereUuid('booking')->name('api.admin.bookings.update');
    Route::middleware('permission:bookings.delete')->delete('bookings/{booking}', [BookingController::class, 'destroy'])->whereUuid('booking')->name('api.admin.bookings.destroy');
    Route::middleware('permission:bookings.update')->post('bookings/{booking}/confirm', [BookingController::class, 'confirm'])->whereUuid('booking')->name('api.admin.bookings.confirm');
    Route::middleware('permission:bookings.cancel')->post('bookings/{booking}/cancel', [BookingController::class, 'cancel'])->whereUuid('booking')->name('api.admin.bookings.cancel');
    Route::middleware('permission:routes.manage')->post('bookings/{booking}/assign-route', [BookingController::class, 'assignRoute'])->whereUuid('booking')->name('api.admin.bookings.assign_route');
    Route::middleware('permission:orders.create')->post('bookings/{booking}/convert-to-order', [BookingController::class, 'convertToOrder'])->whereUuid('booking')->name('api.admin.bookings.convert_to_order');

    Route::middleware('permission:orders.view')->get('orders', [OrderController::class, 'index'])->name('api.admin.orders.index');
    Route::middleware('permission:orders.create')->post('orders', [OrderController::class, 'store'])->name('api.admin.orders.store');
    Route::middleware('permission:orders.view')->get('orders/{order}', [OrderController::class, 'show'])->whereUuid('order')->name('api.admin.orders.show');
    Route::middleware('permission:orders.update')->put('orders/{order}', [OrderController::class, 'update'])->whereUuid('order')->name('api.admin.orders.update');
    Route::middleware('permission:orders.update')->post('orders/{order}/complete', [OrderController::class, 'complete'])->whereUuid('order')->name('api.admin.orders.complete');
    Route::middleware('permission:knives.update')->post('orders/{order}/attach-knife', [OrderController::class, 'attachKnife'])->whereUuid('order')->name('api.admin.orders.attach_knife');
    Route::middleware('permission:knives.update')->post('orders/{order}/add-knife', [OrderController::class, 'addKnife'])->whereUuid('order')->name('api.admin.orders.add_knife');
    Route::middleware('permission:knives.update')->post('orders/{order}/bulk-add-knives', [OrderController::class, 'bulkAddKnives'])->whereUuid('order')->name('api.admin.orders.bulk_add_knives');

    Route::middleware('permission:knives.view')->get('knives', [KnifeController::class, 'index'])->name('api.admin.knives.index');
    Route::middleware('permission:knives.update')->post('knives', [KnifeController::class, 'store'])->name('api.admin.knives.store');
    Route::middleware('permission:knives.view')->get('knives/{knife}', [KnifeController::class, 'show'])->whereUuid('knife')->name('api.admin.knives.show');
    Route::middleware('permission:knives.update')->put('knives/{knife}', [KnifeController::class, 'update'])->whereUuid('knife')->name('api.admin.knives.update');
    Route::middleware('permission:knives.update')->post('knives/{knife}/mark-inspected', [KnifeController::class, 'markInspected'])->whereUuid('knife')->name('api.admin.knives.mark_inspected');
    Route::middleware('permission:knives.update')->post('knives/{knife}/mark-sharpened', [KnifeController::class, 'markSharpened'])->whereUuid('knife')->name('api.admin.knives.mark_sharpened');
    Route::middleware('permission:knives.update')->post('knives/{knife}/mark-quality-checked', [KnifeController::class, 'markQualityChecked'])->whereUuid('knife')->name('api.admin.knives.mark_quality_checked');
    Route::middleware('permission:knives.update')->post('knives/{knife}/mark-returned', [KnifeController::class, 'markReturned'])->whereUuid('knife')->name('api.admin.knives.mark_returned');
    Route::middleware('permission:knives.update')->post('knives/{knife}/report-issue', [KnifeController::class, 'reportIssue'])->whereUuid('knife')->name('api.admin.knives.report_issue');
    Route::middleware('permission:knives.update')->post('knives/{knife}/photos', [KnifeController::class, 'storePhoto'])->whereUuid('knife')->name('api.admin.knives.photos.store');

    Route::middleware('permission:invoices.view')->get('invoices', [InvoiceController::class, 'index'])->name('api.admin.invoices.index');
    Route::middleware('permission:invoices.create')->post('invoices', [InvoiceController::class, 'store'])->name('api.admin.invoices.store');
    Route::middleware('permission:invoices.view')->get('invoices/{invoice}', [InvoiceController::class, 'show'])->whereUuid('invoice')->name('api.admin.invoices.show');
    Route::middleware('permission:invoices.update')->put('invoices/{invoice}', [InvoiceController::class, 'update'])->whereUuid('invoice')->name('api.admin.invoices.update');
    Route::middleware('permission:invoices.update')->post('invoices/{invoice}/send', [InvoiceController::class, 'send'])->whereUuid('invoice')->name('api.admin.invoices.send');
    Route::middleware('permission:invoices.update')->post('invoices/{invoice}/mark-paid', [InvoiceController::class, 'markPaid'])->whereUuid('invoice')->name('api.admin.invoices.mark_paid');
    Route::middleware('permission:invoices.update')->post('invoices/{invoice}/void', [InvoiceController::class, 'void'])->whereUuid('invoice')->name('api.admin.invoices.void');

    Route::middleware('permission:payments.view')->get('payments', [PaymentController::class, 'index'])->name('api.admin.payments.index');
    Route::middleware('permission:payments.manage')->post('payments/manual', [PaymentController::class, 'manual'])->name('api.admin.payments.manual');
});

Route::prefix('public')->middleware('throttle:booking-enquiries')->group(function (): void {
    Route::post('booking-enquiries', [PublicBookingEnquiryController::class, 'store'])->name('api.public.booking_enquiries.store');
});

/** Provider webhooks — unauthenticated; each controller verifies signatures and returns safe JSON errors. */
Route::post('webhooks/stripe', StripeWebhookController::class)->name('api.webhooks.stripe');
