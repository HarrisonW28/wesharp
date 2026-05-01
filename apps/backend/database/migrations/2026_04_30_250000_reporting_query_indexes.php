<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Composite indexes for common reporting filters (company + time dimension).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->index(['company_id', 'updated_at'], 'orders_company_updated_report_idx');
        });

        Schema::table('knives', function (Blueprint $table): void {
            $table->index(['company_id', 'updated_at'], 'knives_company_updated_report_idx');
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->index(['company_id', 'issued_on'], 'invoices_company_issued_report_idx');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropIndex('orders_company_updated_report_idx');
        });

        Schema::table('knives', function (Blueprint $table): void {
            $table->dropIndex('knives_company_updated_report_idx');
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropIndex('invoices_company_issued_report_idx');
        });
    }
};
