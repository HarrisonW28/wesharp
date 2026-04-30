<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_subscriptions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('plan_name');
            $table->string('status', 64)->default('active')->index();
            $table->date('current_period_end')->nullable()->index();
            $table->text('included_services')->nullable();
            $table->text('allowance_summary')->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_subscriptions');
    }
};
