<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('company_location_id')->constrained()->cascadeOnDelete();
            $table->string('booking_status', 32)->index();
            $table->string('service_type', 32)->index();
            $table->date('scheduled_date')->index();
            $table->text('internal_notes')->nullable();
            $table->timestampsTz();
            $table->index(['company_id', 'scheduled_date']);
            $table->index(['company_location_id']);
            $table->index('company_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
