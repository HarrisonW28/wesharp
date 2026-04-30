<?php

use App\Http\Controllers\Admin\BookingController;
use App\Http\Controllers\Admin\CompanyController;
use App\Http\Controllers\Admin\KnifeController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\RouteController;
use App\Http\Controllers\Admin\RouteStopController;
use App\Http\Controllers\Api\V1\InternalSmokeController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\TenantSmokeController;
use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('health', HealthController::class)->name('api.health');

Route::prefix('v1')->group(function (): void {
    Route::middleware(['clerk.auth'])->group(function (): void {
        Route::get('me', [MeController::class, 'show'])->name('api.v1.me');
    });

    Route::prefix('admin')->middleware(['clerk.auth', 'staff'])->group(function (): void {
        Route::get('smoke', InternalSmokeController::class)->name('api.v1.admin.smoke');
    });

    Route::prefix('account')->middleware(['clerk.auth', 'tenant'])->group(function (): void {
        Route::get('smoke', TenantSmokeController::class)->name('api.v1.account.smoke');
    });
});

Route::prefix('admin')->middleware(['clerk.auth', 'staff'])->group(function (): void {
    Route::get('companies', [CompanyController::class, 'index'])->name('api.admin.companies.index');
    Route::post('companies', [CompanyController::class, 'store'])->name('api.admin.companies.store');
    Route::get('companies/{company}', [CompanyController::class, 'show'])->whereUuid('company')->name('api.admin.companies.show');
    Route::put('companies/{company}', [CompanyController::class, 'update'])->whereUuid('company')->name('api.admin.companies.update');
    Route::delete('companies/{company}', [CompanyController::class, 'destroy'])->whereUuid('company')->name('api.admin.companies.destroy');
    Route::get('companies/{company}/summary', [CompanyController::class, 'summary'])->whereUuid('company')->name('api.admin.companies.summary');
    Route::get('companies/{company}/activity', [CompanyController::class, 'activity'])->whereUuid('company')->name('api.admin.companies.activity');
    Route::post('companies/{company}/notes', [CompanyController::class, 'storeNote'])->whereUuid('company')->name('api.admin.companies.notes.store');
    Route::post('companies/{company}/contacts', [CompanyController::class, 'storeContact'])->whereUuid('company')->name('api.admin.companies.contacts.store');
    Route::post('companies/{company}/locations', [CompanyController::class, 'storeLocation'])->whereUuid('company')->name('api.admin.companies.locations.store');
    Route::post('companies/{company}/bookings', [CompanyController::class, 'storeBooking'])->whereUuid('company')->name('api.admin.companies.bookings.store');
    Route::put('companies/{company}/status', [CompanyController::class, 'updateStatus'])->whereUuid('company')->name('api.admin.companies.status.update');

    Route::get('routes/today', [RouteController::class, 'today'])->name('api.admin.routes.today');
    Route::post('routes', [RouteController::class, 'store'])->name('api.admin.routes.store');
    Route::get('routes', [RouteController::class, 'index'])->name('api.admin.routes.index');
    Route::get('routes/{route}', [RouteController::class, 'show'])->whereUuid('route')->name('api.admin.routes.show');
    Route::put('routes/{route}', [RouteController::class, 'update'])->whereUuid('route')->name('api.admin.routes.update');
    Route::post('routes/{route}/start', [RouteController::class, 'start'])->whereUuid('route')->name('api.admin.routes.start');
    Route::post('routes/{route}/complete', [RouteController::class, 'complete'])->whereUuid('route')->name('api.admin.routes.complete');
    Route::post('routes/{route}/stops', [RouteController::class, 'storeStop'])->whereUuid('route')->name('api.admin.routes.stops.store');
    Route::put('routes/{route}/reorder-stops', [RouteController::class, 'reorder'])->whereUuid('route')->name('api.admin.routes.stops.reorder');

    Route::get('route-stops/{stop}', [RouteStopController::class, 'show'])->whereUuid('stop')->name('api.admin.route_stops.show');
    Route::put('route-stops/{stop}', [RouteStopController::class, 'update'])->whereUuid('stop')->name('api.admin.route_stops.update');
    Route::post('route-stops/{stop}/mark-travelling', [RouteStopController::class, 'markTravelling'])->whereUuid('stop')->name('api.admin.route_stops.mark_travelling');
    Route::post('route-stops/{stop}/mark-arrived', [RouteStopController::class, 'markArrived'])->whereUuid('stop')->name('api.admin.route_stops.mark_arrived');
    Route::post('route-stops/{stop}/mark-collected', [RouteStopController::class, 'markCollected'])->whereUuid('stop')->name('api.admin.route_stops.mark_collected');
    Route::post('route-stops/{stop}/mark-returned', [RouteStopController::class, 'markReturned'])->whereUuid('stop')->name('api.admin.route_stops.mark_returned');
    Route::post('route-stops/{stop}/complete', [RouteStopController::class, 'complete'])->whereUuid('stop')->name('api.admin.route_stops.complete');

    Route::get('bookings', [BookingController::class, 'index'])->name('api.admin.bookings.index');
    Route::post('bookings', [BookingController::class, 'store'])->name('api.admin.bookings.store');
    Route::get('bookings/{booking}', [BookingController::class, 'show'])->whereUuid('booking')->name('api.admin.bookings.show');
    Route::put('bookings/{booking}', [BookingController::class, 'update'])->whereUuid('booking')->name('api.admin.bookings.update');
    Route::delete('bookings/{booking}', [BookingController::class, 'destroy'])->whereUuid('booking')->name('api.admin.bookings.destroy');
    Route::post('bookings/{booking}/confirm', [BookingController::class, 'confirm'])->whereUuid('booking')->name('api.admin.bookings.confirm');
    Route::post('bookings/{booking}/cancel', [BookingController::class, 'cancel'])->whereUuid('booking')->name('api.admin.bookings.cancel');
    Route::post('bookings/{booking}/assign-route', [BookingController::class, 'assignRoute'])->whereUuid('booking')->name('api.admin.bookings.assign_route');
    Route::post('bookings/{booking}/convert-to-order', [BookingController::class, 'convertToOrder'])->whereUuid('booking')->name('api.admin.bookings.convert_to_order');

    Route::get('orders', [OrderController::class, 'index'])->name('api.admin.orders.index');
    Route::post('orders', [OrderController::class, 'store'])->name('api.admin.orders.store');
    Route::get('orders/{order}', [OrderController::class, 'show'])->whereUuid('order')->name('api.admin.orders.show');
    Route::put('orders/{order}', [OrderController::class, 'update'])->whereUuid('order')->name('api.admin.orders.update');
    Route::post('orders/{order}/complete', [OrderController::class, 'complete'])->whereUuid('order')->name('api.admin.orders.complete');
    Route::post('orders/{order}/add-knife', [OrderController::class, 'addKnife'])->whereUuid('order')->name('api.admin.orders.add_knife');
    Route::post('orders/{order}/bulk-add-knives', [OrderController::class, 'bulkAddKnives'])->whereUuid('order')->name('api.admin.orders.bulk_add_knives');

    Route::get('knives', [KnifeController::class, 'index'])->name('api.admin.knives.index');
    Route::post('knives', [KnifeController::class, 'store'])->name('api.admin.knives.store');
    Route::get('knives/{knife}', [KnifeController::class, 'show'])->whereUuid('knife')->name('api.admin.knives.show');
    Route::put('knives/{knife}', [KnifeController::class, 'update'])->whereUuid('knife')->name('api.admin.knives.update');
    Route::post('knives/{knife}/mark-inspected', [KnifeController::class, 'markInspected'])->whereUuid('knife')->name('api.admin.knives.mark_inspected');
    Route::post('knives/{knife}/mark-sharpened', [KnifeController::class, 'markSharpened'])->whereUuid('knife')->name('api.admin.knives.mark_sharpened');
    Route::post('knives/{knife}/mark-quality-checked', [KnifeController::class, 'markQualityChecked'])->whereUuid('knife')->name('api.admin.knives.mark_quality_checked');
    Route::post('knives/{knife}/mark-returned', [KnifeController::class, 'markReturned'])->whereUuid('knife')->name('api.admin.knives.mark_returned');
    Route::post('knives/{knife}/report-issue', [KnifeController::class, 'reportIssue'])->whereUuid('knife')->name('api.admin.knives.report_issue');
});

Route::prefix('public')->group(function (): void {
    // Public API routes (pricing, catalogs, signup flows).
});

Route::prefix('webhooks')->group(function (): void {
    // Incoming webhooks (Stripe, integrations). Verify signatures per provider.
});
