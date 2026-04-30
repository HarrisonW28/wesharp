<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('route_stops', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('route_id')->constrained('routes')->cascadeOnDelete();
            $table->foreignUuid('booking_id')->nullable()->constrained('bookings')->nullOnDelete();
            $table->string('route_stop_status', 32)->index();
            $table->unsignedInteger('sequence')->default(0);
            $table->timestampTz('expected_arrival_at')->nullable();
            $table->timestampTz('arrived_at')->nullable();
            $table->timestampTz('departed_at')->nullable();
            $table->timestampsTz();
            $table->index(['route_id', 'sequence']);
            $table->index('booking_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('route_stops');
    }
};
