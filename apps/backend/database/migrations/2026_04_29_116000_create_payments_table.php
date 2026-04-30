<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('order_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('amount_pence');
            $table->string('payment_status', 32)->index();
            $table->string('payment_method', 32)->index();
            $table->string('currency', 8)->default('GBP');
            $table->timestampTz('paid_at')->nullable()->index();
            $table->timestampTz('due_at')->nullable();
            $table->text('reference')->nullable();
            $table->timestampsTz();
            $table->index(['company_id', 'payment_status']);
            $table->index('company_id');
            $table->index('invoice_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
