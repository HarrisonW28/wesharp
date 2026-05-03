<?php

namespace Database\Seeders;

use App\Actions\Invoices\AllocateInvoiceNumber;
use App\Enums\BillingInterval;
use App\Enums\BookingStatus;
use App\Enums\CompanyStatus;
use App\Enums\InvoiceStatus;
use App\Enums\KnifeStatus;
use App\Enums\NoteVisibility;
use App\Enums\OperationalRouteStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\RouteStopStatus;
use App\Enums\ServiceType;
use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
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
use App\Models\SubscriptionPlan;
use App\Models\UploadedFile;
use App\Models\User;
use App\Services\Subscriptions\SubscriptionBillingPeriodService;
use Faker\Factory;
use Faker\Generator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class WeSharpDemoSeeder extends Seeder
{
    private Generator $faker;

    public function run(): void
    {
        $this->faker = Factory::create('en_GB');
        DB::transaction(fn () => $this->seedScenario());
    }

    private function seedScenario(): void
    {
        $operator = User::query()->firstOrCreate(
            ['email' => 'operations@demo.wesharp.test'],
            [
                'name' => 'Morgan Patel',
                'password' => Hash::make('password'),
                'role' => UserRole::SuperAdmin,
                'status' => UserStatus::Active,
            ],
        );

        $driver = User::query()->firstOrCreate(
            ['email' => 'driver@demo.wesharp.test'],
            [
                'name' => 'Alex Driver',
                'password' => Hash::make('password'),
                'role' => UserRole::RouteManager,
                'status' => UserStatus::Active,
            ],
        );

        User::query()->firstOrCreate(
            ['email' => 'finance@demo.wesharp.test'],
            [
                'name' => 'Riley Ledger',
                'password' => Hash::make('password'),
                'role' => UserRole::Finance,
                'status' => UserStatus::Active,
            ],
        );

        $manchesterArea = ServiceArea::query()->create([
            'name' => 'Manchester metropolitan',
            'city' => 'Manchester',
            'region' => 'Greater Manchester',
            'country' => 'GB',
            'postcode_prefix' => 'M',
            'centre_latitude' => 53.4808,
            'centre_longitude' => -2.2426,
            'radius_metres' => 15_000,
            'active' => true,
        ]);

        $liverpoolArea = ServiceArea::query()->create([
            'name' => 'Merseyside hospitality',
            'city' => 'Liverpool',
            'region' => 'Merseyside',
            'country' => 'GB',
            'postcode_prefix' => 'L',
            'centre_latitude' => 53.4084,
            'centre_longitude' => -2.9916,
            'radius_metres' => 12_000,
            'active' => true,
        ]);

        PricingRule::query()->create([
            'service_area_id' => $manchesterArea->id,
            'name' => 'Per blade collection baseline',
            'service_type' => ServiceType::Collection,
            'rule_kind' => 'per_knife',
            'priority' => 10,
            'amount_pence' => 850,
            'constraints' => ['minimum_units' => 5],
            'active' => true,
        ]);

        PricingRule::query()->create([
            'service_area_id' => $liverpoolArea->id,
            'name' => 'On-site bench hourly rate',
            'service_type' => ServiceType::Onsite,
            'rule_kind' => 'flat_visit',
            'priority' => 8,
            'amount_pence' => 9350,
            'constraints' => ['window' => 'weekdays_pm'],
            'active' => true,
        ]);

        $profiles = [];

        foreach ($this->manchesterVenues() as $row) {
            $profiles[] = $this->growCompanyFamily($operator->id, $row, 'MAN');
        }

        foreach ($this->liverpoolVenues() as $row) {
            $profiles[] = $this->growCompanyFamily($operator->id, $row, 'LIV');
        }

        foreach ($profiles as $entry) {
            AuditLog::query()->create([
                'actor_id' => $operator->id,
                'action' => 'seed.company.promoted',
                'auditable_type' => Company::class,
                'auditable_id' => $entry['company']->id,
                'payload' => ['code' => $entry['catalogue']],
                'ip_address' => '203.0.113.62',
                'created_at' => now()->subMinutes(45),
            ]);
        }

        if ($profiles !== []) {
            $portalCompany = $profiles[0]['company'];

            User::query()->updateOrCreate(
                ['email' => 'kitchen.portal@demo.wesharp.test'],
                [
                    'name' => 'Riley Portal',
                    'password' => Hash::make('password'),
                    'role' => UserRole::CustomerOwner,
                    'status' => UserStatus::Active,
                    'company_id' => $portalCompany->id,
                ],
            );

            $demoPlan = SubscriptionPlan::query()->updateOrCreate(
                ['name' => 'Demo Kitchen Care'],
                [
                    'description' => 'Non-production demo plan for the seeded tenant portal.',
                    'billing_interval' => BillingInterval::Monthly,
                    'price_amount_minor' => 9900,
                    'currency' => 'GBP',
                    'included_collections' => 4,
                    'included_knife_allowance' => 40,
                    'overage_price_amount_minor' => 800,
                    'is_active' => true,
                    'show_on_public_site' => true,
                    'sort_order' => 10,
                ],
            );

            if (! $portalCompany->operationalSubscription()->exists()) {
                $seededSub = CompanySubscription::query()->create([
                    'company_id' => $portalCompany->id,
                    'subscription_plan_id' => $demoPlan->id,
                    'status' => SubscriptionStatus::Active,
                    'starts_at' => now()->toDateString(),
                    'renews_at' => now()->addMonth()->toDateString(),
                    'price_amount_minor_snapshot' => $demoPlan->price_amount_minor,
                    'currency' => $demoPlan->currency,
                    'notes' => 'Seeded for local/demo environments only.',
                ]);
                app(SubscriptionBillingPeriodService::class)->createInitialPeriod($seededSub);
            }
        }

        $allBookings = [];

        foreach ($profiles as $entry) {
            foreach ($entry['bookings'] as $booking) {
                $allBookings[] = [
                    'company' => $entry['company'],
                    'booking' => $booking,
                ];
            }
        }

        $route = OperationalRoute::query()->create([
            'name' => 'Demo mixed Manchester / Liverpool sweep',
            'route_status' => OperationalRouteStatus::Scheduled,
            'scheduled_date' => now()->next('Thursday')->toDateString(),
            'driver_user_id' => $driver->id,
            'meta' => ['vehicle' => 'van-06'],
        ]);

        foreach ($allBookings as $index => $payload) {
            if ($index > 13) {
                break;
            }

            RouteStop::query()->create([
                'route_id' => $route->id,
                'booking_id' => $payload['booking']->id,
                'route_stop_status' => ($index % 4 === 0) ? RouteStopStatus::Collected : RouteStopStatus::NotStarted,
                'sequence' => $index + 1,
                'expected_arrival_at' => now()->setTimeFromTimeString(sprintf('%02d:15:00', 7 + (($index % 8) / 2))),
            ]);

            $payload['booking']->update(['booking_status' => BookingStatus::AssignedToRoute]);
        }

        foreach ($profiles as $entry) {
            $companyModel = $entry['company'];

            foreach ($entry['bookings']->take(2) as $scenario => $booking) {
                $bladeCount = (($scenario === 0) ? 9 : 6);
                $subtotal = $bladeCount * 850;
                $tax = (int) round($subtotal * 0.2);

                $booking->update(['booking_status' => BookingStatus::InSharpening]);

                $order = Order::query()->create([
                    'company_id' => $companyModel->id,
                    'booking_id' => $booking->id,
                    'route_id' => $booking->assigned_route_id,
                    'order_status' => ($scenario === 0 ? OrderStatus::InProgress : OrderStatus::Completed),
                    'knife_count' => $bladeCount,
                    'price_per_knife_pence' => 850,
                    'discount_pence' => 0,
                    'payment_status' => $scenario === 0 ? OrderPaymentStatus::PartialPaid : OrderPaymentStatus::Paid,
                    'subtotal_pence' => $subtotal,
                    'tax_pence' => $tax,
                    'total_pence' => $subtotal + $tax,
                    'currency' => 'GBP',
                ]);

                OrderItem::query()->create([
                    'order_id' => $order->id,
                    'sku' => 'EDGE-SH'.($scenario + 11),
                    'description' => 'Industrial sharpen batch ('.$bladeCount.' knives)',
                    'quantity' => 1,
                    'unit_amount_pence' => $subtotal,
                    'service_status' => KnifeStatus::QualityChecked,
                ]);

                foreach (range(1, min(10, max(6, $bladeCount))) as $spot) {
                    $knifeRow = Knife::query()->create([
                        'company_id' => $companyModel->id,
                        'booking_id' => $booking->id,
                        'order_id' => $order->id,
                        'tag_id' => 'WS-'.str_replace('-', '', (string) $order->id).'-'.$spot,
                        'knife_type' => 'chef',
                        'description' => 'Chef blade '.$spot,
                        'knife_status' => ($spot <= 4 ? KnifeStatus::QualityChecked : KnifeStatus::Sharpened),
                        'label' => 'Chef blade '.$spot,
                        'position' => $spot,
                        'notes' => ($spot === 7) ? 'Watch micro-serrations during polish.' : null,
                    ]);

                    if ($spot <= 2) {
                        $fileRow = UploadedFile::query()->create([
                            'fileable_type' => Knife::class,
                            'fileable_id' => $knifeRow->id,
                            'disk' => 'local',
                            'path' => sprintf('kitchen/%s/edge-%s.jpg', $companyModel->slug, $knifeRow->id),
                            'original_filename' => Str::slug($knifeRow->label).'.jpg',
                            'mime_type' => 'image/jpeg',
                            'byte_size' => 98640 + ($scenario * $spot),
                        ]);

                        KnifePhoto::query()->create([
                            'knife_id' => $knifeRow->id,
                            'order_id' => $order->id,
                            'uploaded_file_id' => $fileRow->id,
                            'uploaded_by_user_id' => $operator->id,
                            'sort_order' => $spot,
                            'caption' => 'Pre-service capture',
                            'photo_kind' => 'before',
                        ]);
                    }

                    if ($spot === 1 && $entry['catalogue'] === 'MAN') {
                        DamageReport::query()->create([
                            'knife_id' => $knifeRow->id,
                            'company_id' => $companyModel->id,
                            'order_id' => $order->id,
                            'details' => 'Minor chip resurfaced ahead of sharpening; logged for QA trace.',
                            'internal_notes' => 'Internal: touch-up documented for QA only.',
                            'customer_visible' => true,
                            'customer_description' => 'We noted a small edge chip before sharpening and smoothed it as part of service.',
                            'severity' => 'minor',
                            'reported_by_id' => $operator->id,
                        ]);
                    }
                }

                $invoiceRow = Invoice::query()->create([
                    'company_id' => $companyModel->id,
                    'order_id' => $order->id,
                    'invoice_number' => AllocateInvoiceNumber::generate(),
                    'invoice_status' => (($scenario === 0) ? InvoiceStatus::Sent : InvoiceStatus::Paid),
                    'issued_on' => now()->subDays(8 - ($scenario * 2))->toDateString(),
                    'due_on' => now()->addDays(9)->toDateString(),
                    'subtotal_pence' => $subtotal,
                    'tax_pence' => $tax,
                    'total_pence' => $subtotal + $tax,
                    'currency' => 'GBP',
                ]);

                InvoiceItem::query()->create([
                    'invoice_id' => $invoiceRow->id,
                    'description' => 'Sharpen services — '.$bladeCount.' pieces',
                    'quantity' => 1,
                    'unit_amount_pence' => $subtotal,
                    'line_total_pence' => $subtotal,
                ]);

                $paymentStatusFlag = (($scenario === 0) ? PaymentStatus::PartPaid : PaymentStatus::Paid);
                $plannedAmount = $paymentStatusFlag === PaymentStatus::PartPaid
                    ? (int) floor($invoiceRow->total_pence * 2 / 3)
                    : (int) $invoiceRow->total_pence;

                $paymentRow = Payment::query()->create([
                    'company_id' => $companyModel->id,
                    'invoice_id' => $invoiceRow->id,
                    'order_id' => $order->id,
                    'amount_pence' => max(250, $plannedAmount),
                    'payment_status' => $paymentStatusFlag,
                    'payment_method' => (($entry['catalogue'] === 'MAN') ? PaymentMethod::Stripe : PaymentMethod::BankTransfer),
                    'currency' => 'GBP',
                    'paid_at' => now()->subHours(9 - ($scenario * 3)),
                    'due_at' => (($paymentStatusFlag === PaymentStatus::PartPaid) ? now()->addDays(4) : null),
                    'reference' => (($scenario === 0) ? 'STRIPE-'.Str::upper(Str::random(7)) : 'FPS-'.Str::upper(Str::random(14))),
                ]);

                if ($paymentStatusFlag === PaymentStatus::PartPaid) {
                    Refund::query()->create([
                        'payment_id' => $paymentRow->id,
                        'amount_pence' => min(6200, (int) ceil($plannedAmount / 8)),
                        'reason' => 'Goodwill credit memo for sharpening queue overrun.',
                        'processed_at' => now()->subHours(2),
                    ]);
                }
            }
        }
    }

    /**
     * @return array{name:string, status:CompanyStatus, postcode:string, district:string}[]
     */
    private function manchesterVenues(): array
    {
        return [
            ['name' => 'Northern Edge Prep Collective', 'status' => CompanyStatus::Active, 'postcode' => 'M4 1HQ', 'district' => 'Northern Quarter'],
            ['name' => 'Spinningfields Bistro Supply Annex', 'status' => CompanyStatus::TrialCompleted, 'postcode' => 'M3 3AQ', 'district' => 'Spinningfields'],
            ['name' => 'Altrincham Trade Knife Vault', 'status' => CompanyStatus::AtRisk, 'postcode' => 'WA14 1RJ', 'district' => 'Altrincham'],
            ['name' => 'Didsbury Events Kitchen Shed', 'status' => CompanyStatus::Lead, 'postcode' => 'M20 3BY', 'district' => 'Didsbury'],
        ];
    }

    /**
     * @return array{name:string, status:CompanyStatus, postcode:string, district:string}[]
     */
    private function liverpoolVenues(): array
    {
        return [
            ['name' => 'Baltic Knife Studio North', 'status' => CompanyStatus::Active, 'postcode' => 'L1 0AB', 'district' => 'Baltic Triangle'],
            ['name' => 'Ropewalks Hospitality Supply Loft', 'status' => CompanyStatus::TrialBooked, 'postcode' => 'L1 4LN', 'district' => 'Ropewalks'],
            ['name' => 'Kirkdale Forge Kitchenworks', 'status' => CompanyStatus::Active, 'postcode' => 'L4 6QQ', 'district' => 'Kirkdale'],
            ['name' => 'Albert Dock Oyster Prep Lab', 'status' => CompanyStatus::Lost, 'postcode' => 'L3 4AD', 'district' => 'Waterfront'],
        ];
    }

    /**
     * @param  array{name:string, status:CompanyStatus, postcode:string, district:string}  $payload
     * @return array{company:Company, bookings:Collection<int,Booking>, catalogue:string}
     */
    private function growCompanyFamily(int $operatorId, array $payload, string $catalogueSymbol): array
    {
        $company = Company::query()->create([
            'name' => $payload['name'],
            'slug' => Str::slug($payload['name'].'-'.$catalogueSymbol.'-'.Str::lower(Str::random(5))),
            'company_status' => $payload['status'],
            'phone' => '+44 '.$this->faker->numerify('7700######'),
            'billing_email' => sprintf('%s@%s.kitchen-demo.test',
                strtolower(Str::limit(Str::slug($payload['district']), 18)),
                strtolower($catalogueSymbol)
            ),
            'city' => $catalogueSymbol === 'MAN' ? 'Manchester' : 'Liverpool',
        ]);

        foreach (range(1, 2) as $_) {
            Contact::query()->create([
                'company_id' => $company->id,
                'first_name' => $this->faker->firstName(),
                'last_name' => $this->faker->lastName(),
                'email' => $this->faker->unique()->safeEmail(),
                'phone' => '+44 '.$this->faker->numerify('7700######'),
                'billing_contact' => $this->faker->boolean(35),
            ]);
        }

        $primary = CompanyLocation::query()->create([
            'company_id' => $company->id,
            'label' => 'Primary kitchen rails',
            'line_one' => $payload['district'].' Production Row',
            'line_two' => 'Hall '.$this->faker->numerify('#'),
            'city' => $catalogueSymbol === 'MAN' ? $this->faker->randomElement(['Manchester', 'Salford', 'Stockport']) : $this->faker->randomElement(['Liverpool', 'Birkenhead']),
            'postcode' => $payload['postcode'],
            'country' => 'GB',
            'latitude' => $catalogueSymbol === 'MAN' ? 53.4808 + $this->faker->randomElement([-0.02, 0.02]) : 53.4084 + $this->faker->randomElement([-0.02, 0.02]),
            'longitude' => $catalogueSymbol === 'MAN' ? -2.2426 + $this->faker->randomElement([-0.02, 0.02]) : -2.9916 + $this->faker->randomElement([-0.02, 0.02]),
        ]);

        $secondary = CompanyLocation::query()->create([
            'company_id' => $company->id,
            'label' => 'Receiving dock lane',
            'line_one' => $payload['district'].' Logistics Corridor',
            'line_two' => null,
            'city' => $primary->city,
            'postcode' => $payload['postcode'],
            'country' => 'GB',
            'latitude' => $primary->latitude + 0.0015,
            'longitude' => $primary->longitude - 0.0015,
        ]);

        Note::query()->create([
            'noteable_type' => Company::class,
            'noteable_id' => $company->id,
            'author_id' => $operatorId,
            'body' => sprintf('Demo profile for %s: confirm stainless vs carbon knives before batch filing.', $company->name),
            'visibility' => NoteVisibility::Internal,
        ]);

        $bookings = collect([
            Booking::query()->create([
                'company_id' => $company->id,
                'company_location_id' => $primary->id,
                'booking_status' => BookingStatus::Requested,
                'service_type' => ServiceType::Collection,
                'scheduled_date' => now()->addDays(6)->toDateString(),
                'internal_notes' => 'Call head chef fifteen minutes ahead; goods in via Dock B.',
            ]),
            Booking::query()->create([
                'company_id' => $company->id,
                'company_location_id' => $secondary->id,
                'booking_status' => BookingStatus::Confirmed,
                'service_type' => ServiceType::Onsite,
                'scheduled_date' => now()->addDays(12)->toDateString(),
                'internal_notes' => 'Sharpen bay inside cold-chain corridor.',
            ]),
            Booking::query()->create([
                'company_id' => $company->id,
                'company_location_id' => $this->faker->boolean() ? $primary->id : $secondary->id,
                'booking_status' => $this->faker->randomElement([BookingStatus::Completed, BookingStatus::QualityChecked]),
                'service_type' => $this->faker->randomElement(ServiceType::cases()),
                'scheduled_date' => now()->subDays($this->faker->numberBetween(1, 12))->toDateString(),
                'internal_notes' => $this->faker->sentence(),
            ]),
        ]);

        return [
            'company' => $company,
            'bookings' => $bookings,
            'catalogue' => $catalogueSymbol,
        ];
    }
}
