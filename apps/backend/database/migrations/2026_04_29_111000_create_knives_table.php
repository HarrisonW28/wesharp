<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knives', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('company_id');
            $table->uuid('booking_id')->nullable();
            $table->uuid('order_id')->nullable();
            $table->string('knife_status', 32)->index();
            $table->string('label')->nullable();
            $table->unsignedSmallInteger('position')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();
            $table->index(['company_id', 'knife_status']);
            $table->index('created_at');

            $table->foreign('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->foreign('booking_id')->references('id')->on('bookings')->nullOnDelete();
            $table->foreign('order_id')->references('id')->on('orders')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knives');
    }
};
