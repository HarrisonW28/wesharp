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
            $table->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('booking_id')->nullable()->constrained()->nullOnDelete()->index();
            $table->foreignUuid('order_id')->nullable()->constrained()->nullOnDelete()->index();
            $table->string('knife_status', 32)->index();
            $table->string('label')->nullable();
            $table->unsignedSmallInteger('position')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();
            $table->index(['company_id', 'knife_status']);
            $table->index('company_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knives');
    }
};
