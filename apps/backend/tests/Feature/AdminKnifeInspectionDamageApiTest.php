<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\DamageReportSeverity;
use App\Models\AuditLog;
use App\Models\DamageReport;
use App\Models\Knife;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminKnifeInspectionDamageApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{ops: User, h: callable} */
    private function opsHeaders(): array
    {
        $this->seed(WeSharpDemoSeeder::class);
        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $h = static fn (): array => ['X-WeSharp-Test-User-Id' => (string) $ops->id];

        return ['ops' => $ops, 'h' => $h];
    }

    public function test_record_inspection_writes_audit(): void
    {
        ['h' => $h] = $this->opsHeaders();

        $order = Order::query()->whereHas('knives')->firstOrFail();
        $knife = $order->knives->firstOrFail();

        $this->withHeaders($h())
            ->postJson('/api/admin/knives/'.$knife->id.'/inspection', [
                'inspection_condition' => 'Light patina, edges true.',
                'inspection_notes' => 'Customer informed chips are cosmetic.',
                'inspection_internal_notes' => 'Staff only: discuss tip micro-chip.',
                'inspection_customer_visible' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.inspection.customer_visible', true);

        self::assertTrue(
            AuditLog::query()
                ->where('auditable_type', Knife::class)
                ->where('auditable_id', $knife->id)
                ->where('action', 'knife.inspection_updated')
                ->exists()
        );

        self::assertTrue(
            AuditLog::query()
                ->where('auditable_type', Knife::class)
                ->where('auditable_id', $knife->id)
                ->where('action', 'knife.inspection_visibility_changed')
                ->exists()
        );
    }

    public function test_damage_report_crud_audits_and_portal_filters_visibility(): void
    {
        ['h' => $h] = $this->opsHeaders();

        $portal = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $order = Order::query()
            ->where('company_id', $portal->company_id)
            ->whereHas('knives')
            ->firstOrFail();
        $knife = $order->knives->firstOrFail();

        $create = $this->withHeaders($h())
            ->postJson('/api/admin/knives/'.$knife->id.'/damage-reports', [
                'order_id' => (string) $order->id,
                'description' => 'Internal-only scratch pattern near bolster.',
                'severity' => DamageReportSeverity::Moderate->value,
                'internal_notes' => 'Never show: supplier batch mark',
                'customer_visible' => false,
            ]);
        $create->assertCreated();

        /** @var list<mixed>|null $reports */
        $reports = $create->json('data.damage_reports');
        self::assertIsArray($reports);
        $createdRow = collect($reports)->firstWhere('description', 'Internal-only scratch pattern near bolster.');
        self::assertIsArray($createdRow);
        /** @var string $reportId */
        $reportId = $createdRow['id'];
        self::assertIsString($reportId);
        self::assertNotSame('', $reportId);

        self::assertTrue(
            AuditLog::query()
                ->where('auditable_type', DamageReport::class)
                ->where('auditable_id', $reportId)
                ->where('action', 'damage_report.created')
                ->exists()
        );

        $tH = ['X-WeSharp-Test-User-Id' => (string) $portal->id];
        $portalPayload = $this->withHeaders($tH)
            ->getJson('/api/account/orders/'.$order->id)
            ->assertOk()
            ->json('data');
        self::assertIsArray($portalPayload);
        /** @phpstan-ignore-next-line */
        $knifeRows = $portalPayload['knives'] ?? [];
        self::assertIsArray($knifeRows);
        $match = collect($knifeRows)->firstWhere('tag_id', $knife->tag_id);
        self::assertIsArray($match);
        $visibleToCustomer = collect($match['damage_reports'] ?? [])->contains(
            static fn (mixed $row): bool => is_array($row)
                && isset($row['description'])
                && str_contains((string) $row['description'], 'Internal-only')
        );
        self::assertFalse($visibleToCustomer);

        $this->withHeaders($h())
            ->putJson('/api/admin/damage-reports/'.$reportId, [
                'customer_visible' => true,
                'customer_description' => 'We noted moderate wear near the bolster; sharpening proceeds as planned.',
            ])
            ->assertOk();

        self::assertTrue(
            AuditLog::query()
                ->where('auditable_type', DamageReport::class)
                ->where('auditable_id', $reportId)
                ->where('action', 'damage_report.visibility_changed')
                ->exists()
        );

        $portalPayload2 = $this->withHeaders($tH)
            ->getJson('/api/account/orders/'.$order->id)
            ->assertOk()
            ->json('data');
        /** @phpstan-ignore-next-line */
        $knifeRows2 = $portalPayload2['knives'] ?? [];
        $match2 = collect($knifeRows2)->firstWhere('tag_id', $knife->tag_id);
        self::assertIsArray($match2);
        $descs = collect($match2['damage_reports'] ?? [])->pluck('description')->all();
        self::assertTrue(
            collect($descs)->contains(static fn (mixed $d): bool => str_contains((string) $d, 'sharpening proceeds'))
        );

        $raw = json_encode($portalPayload2);
        self::assertIsString($raw);
        self::assertStringNotContainsString('Internal-only', $raw);
        self::assertStringNotContainsString('Never show', $raw);

        $this->withHeaders($h())
            ->putJson('/api/admin/damage-reports/'.$reportId, [
                'status' => 'resolved',
            ])
            ->assertOk();

        self::assertTrue(
            AuditLog::query()
                ->where('auditable_type', DamageReport::class)
                ->where('auditable_id', $reportId)
                ->where('action', 'damage_report.resolved')
                ->exists()
        );

        $this->withHeaders($h())
            ->postJson('/api/admin/damage-reports/'.$reportId.'/archive')
            ->assertOk();

        self::assertTrue(
            AuditLog::query()
                ->where('auditable_type', DamageReport::class)
                ->where('auditable_id', $reportId)
                ->where('action', 'damage_report.archived')
                ->exists()
        );
    }
}
