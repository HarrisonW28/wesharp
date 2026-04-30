<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('booking_id')->constrained()->cascadeOnDelete();
            $table->string('order_status', 32)->index();
            $table->unsignedBigInteger('subtotal_pence')->default(0);
            $table->unsignedBigInteger('tax_pence')->default(0);
            $table->unsignedBigInteger('total_pence')->default(0);
            $table->string('currency', 8)->default('GBP');
            $table->timestampsTz();
            $table->index(['booking_id', 'order_status']);
            $table->index('company_id');
            $table->index('booking_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
