<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_items', function (Blueprint $table): void {
            $table->string('line_item_type', 32)->default('one_off_service')->after('invoice_id');
            $table->index('line_item_type');
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropForeign(['order_id']);
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->uuid('order_id')->nullable()->change();
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->string('source_type', 64)->nullable()->after('order_id');
            $table->uuid('source_id')->nullable()->after('source_type');
            $table->date('billing_period_start')->nullable()->after('source_id');
            $table->date('billing_period_end')->nullable()->after('billing_period_start');
            $table->index(['source_type', 'source_id']);
            $table->index(['billing_period_start', 'billing_period_end']);
        });

        DB::table('invoices')->whereNull('source_type')->update([
            'source_type' => 'order',
        ]);
        DB::statement('UPDATE invoices SET source_id = order_id WHERE source_id IS NULL AND order_id IS NOT NULL');

        $driver = Schema::getConnection()->getDriverName();
        if (in_array($driver, ['sqlite', 'pgsql'], true)) {
            DB::statement("CREATE UNIQUE INDEX invoices_company_subscription_bill_unique ON invoices (source_type, source_id, billing_period_start, billing_period_end) WHERE source_type = 'company_subscription' AND source_id IS NOT NULL AND billing_period_start IS NOT NULL AND billing_period_end IS NOT NULL AND invoice_status != 'void'");
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if (in_array($driver, ['sqlite', 'pgsql'], true)) {
            DB::statement('DROP INDEX IF EXISTS invoices_company_subscription_bill_unique');
        }

        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropIndex(['billing_period_start', 'billing_period_end']);
            $table->dropIndex(['source_type', 'source_id']);
            $table->dropColumn(['source_type', 'source_id', 'billing_period_start', 'billing_period_end']);
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropForeign(['order_id']);
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->uuid('order_id')->nullable(false)->change();
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        Schema::table('invoice_items', function (Blueprint $table): void {
            $table->dropIndex(['line_item_type']);
            $table->dropColumn('line_item_type');
        });
    }
};
