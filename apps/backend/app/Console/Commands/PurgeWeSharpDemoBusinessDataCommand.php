<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\CompanySubscription;
use App\Models\Contact;
use App\Models\DamageReport;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Knife;
use App\Models\KnifePhoto;
use App\Models\Note;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\PricingRule;
use App\Models\Refund;
use App\Models\RouteStop;
use App\Models\ServiceArea;
use App\Models\StripeCheckoutAttempt;
use App\Models\SubscriptionBillingPeriod;
use App\Models\SubscriptionPlan;
use App\Models\UploadedFile;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Removes rows created by {@see WeSharpDemoSeeder} (demo companies, AR, routes, etc.)
 * without deleting {@see User} accounts — staff and portal demo users remain.
 */
final class PurgeWeSharpDemoBusinessDataCommand extends Command
{
    private const DEMO_COMPANY_EMAIL_SUFFIX = '.kitchen-demo.test';

    private const DEMO_ROUTE_NAME = 'Demo mixed Manchester / Liverpool sweep';

    private const DEMO_SUBSCRIPTION_PLAN_NAME = 'Demo Kitchen Care';

    protected $signature = 'demo:purge-seeded-data {--force : Perform deletes (otherwise only print what would happen)}';

    protected $description = 'Delete WeSharpDemoSeeder business fixtures while keeping all users (clears company_id on portal users tied to demo tenants).';

    public function handle(): int
    {
        $companyIds = Company::query()
            ->where('billing_email', 'like', '%'.self::DEMO_COMPANY_EMAIL_SUFFIX)
            ->pluck('id');

        if ($companyIds->isEmpty()) {
            $this->info('No demo companies found (billing_email like %'.self::DEMO_COMPANY_EMAIL_SUFFIX.'). Nothing to do.');

            return self::SUCCESS;
        }

        $this->warn('Matched '.$companyIds->count().' demo compan(y|ies): '.$companyIds->implode(', '));

        if (! $this->option('force')) {
            $this->comment('Re-run with --force to delete this data (users table is never truncated).');

            return self::SUCCESS;
        }

        try {
            DB::transaction(function () use ($companyIds): void {
                $ids = $companyIds->all();

                User::query()->whereIn('company_id', $ids)->update(['company_id' => null]);

                $demoRoute = OperationalRoute::query()->where('name', self::DEMO_ROUTE_NAME)->first();
                if ($demoRoute !== null) {
                    RouteStop::query()->where('route_id', $demoRoute->id)->delete();
                    $demoRoute->delete();
                }

                $bookingIds = Booking::query()->whereIn('company_id', $ids)->pluck('id');
                RouteStop::query()->whereIn('booking_id', $bookingIds)->delete();

                $orderIds = Order::query()->whereIn('company_id', $ids)->pluck('id');
                $invoiceIds = Invoice::query()->whereIn('company_id', $ids)->pluck('id');
                $paymentIds = Payment::query()->whereIn('company_id', $ids)->pluck('id');

                AuditLog::query()->where('auditable_type', Company::class)->whereIn('auditable_id', $ids)->delete();
                if ($orderIds->isNotEmpty()) {
                    AuditLog::query()->where('auditable_type', Order::class)->whereIn('auditable_id', $orderIds)->delete();
                }
                if ($invoiceIds->isNotEmpty()) {
                    AuditLog::query()->where('auditable_type', Invoice::class)->whereIn('auditable_id', $invoiceIds)->delete();
                }
                if ($paymentIds->isNotEmpty()) {
                    AuditLog::query()->where('auditable_type', Payment::class)->whereIn('auditable_id', $paymentIds)->delete();
                }
                AuditLog::query()->where('action', 'seed.company.promoted')->delete();

                StripeCheckoutAttempt::query()
                    ->where(function ($q) use ($ids, $invoiceIds): void {
                        $q->whereIn('company_id', $ids);
                        if ($invoiceIds->isNotEmpty()) {
                            $q->orWhereIn('invoice_id', $invoiceIds);
                        }
                    })
                    ->delete();

                Refund::query()->whereIn('payment_id', $paymentIds)->delete();

                Payment::query()->whereIn('company_id', $ids)->delete();
                InvoiceItem::query()->whereIn('invoice_id', $invoiceIds)->delete();
                Invoice::query()->whereIn('company_id', $ids)->delete();

                $knifeIds = Knife::query()->whereIn('company_id', $ids)->pluck('id');
                KnifePhoto::query()->whereIn('knife_id', $knifeIds)->delete();
                DamageReport::query()->whereIn('knife_id', $knifeIds)->delete();
                UploadedFile::query()
                    ->where('fileable_type', Knife::class)
                    ->whereIn('fileable_id', $knifeIds)
                    ->delete();
                Knife::query()->whereIn('company_id', $ids)->delete();

                OrderItem::query()->whereIn('order_id', $orderIds)->delete();
                Order::query()->whereIn('company_id', $ids)->delete();

                Booking::query()->whereIn('company_id', $ids)->delete();

                $subscriptionIds = CompanySubscription::query()->whereIn('company_id', $ids)->pluck('id');
                SubscriptionBillingPeriod::query()->whereIn('company_subscription_id', $subscriptionIds)->delete();
                CompanySubscription::query()->whereIn('company_id', $ids)->forceDelete();

                Note::query()->where('noteable_type', Company::class)->whereIn('noteable_id', $ids)->delete();
                Contact::query()->whereIn('company_id', $ids)->delete();
                CompanyLocation::query()->whereIn('company_id', $ids)->delete();

                Company::query()->whereIn('id', $ids)->forceDelete();

                SubscriptionPlan::query()
                    ->where('name', self::DEMO_SUBSCRIPTION_PLAN_NAME)
                    ->whereDoesntHave('companySubscriptions')
                    ->get()
                    ->each(static fn (SubscriptionPlan $plan): bool => $plan->forceDelete());

                $demoAreaIds = ServiceArea::query()
                    ->where(function ($q): void {
                        $q->where(function ($q2): void {
                            $q2->where('name', 'Manchester metropolitan')
                                ->where('city', 'Manchester')
                                ->where('postcode_prefix', 'M');
                        })->orWhere(function ($q2): void {
                            $q2->where('name', 'Merseyside hospitality')
                                ->where('city', 'Liverpool')
                                ->where('postcode_prefix', 'L');
                        });
                    })
                    ->pluck('id');

                if ($demoAreaIds->isNotEmpty()) {
                    PricingRule::query()->whereIn('service_area_id', $demoAreaIds)->delete();
                    ServiceArea::query()->whereIn('id', $demoAreaIds)->delete();
                }
            });
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('Demo business data removed; users preserved.');

        return self::SUCCESS;
    }
}
