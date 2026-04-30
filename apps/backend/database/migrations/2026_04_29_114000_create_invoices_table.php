<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('order_id')->constrained()->cascadeOnDelete();
            $table->string('invoice_number')->unique();
            $table->string('invoice_status', 32)->index();
            $table->date('issued_on')->nullable()->index();
            $table->date('due_on')->nullable()->index();
            $table->unsignedBigInteger('subtotal_pence')->default(0);
            $table->unsignedBigInteger('tax_pence')->default(0);
            $table->unsignedBigInteger('total_pence')->default(0);
            $table->string('currency', 8)->default('GBP');
            $table->timestampsTz();
            $table->index(['company_id', 'invoice_status']);
            $table->index('company_id');
            $table->index('order_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
