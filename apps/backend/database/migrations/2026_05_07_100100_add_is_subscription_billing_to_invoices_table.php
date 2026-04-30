<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table): void {
            $table->boolean('is_subscription_billing')->default(false)->after('currency');
            $table->index(['company_id', 'is_subscription_billing']);
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropIndex(['company_id', 'is_subscription_billing']);
            $table->dropColumn('is_subscription_billing');
        });
    }
};
