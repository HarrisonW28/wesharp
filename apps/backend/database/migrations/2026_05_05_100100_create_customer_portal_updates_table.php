<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_portal_updates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignUuid('booking_id')->nullable()->constrained('bookings')->cascadeOnDelete();
            $table->foreignUuid('order_id')->nullable()->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('route_stop_id')->nullable()->constrained('route_stops')->nullOnDelete();
            $table->text('body');
            $table->string('visibility', 24);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('archived_at')->nullable()->index();
            $table->timestampsTz();

            $table->index(['company_id', 'visibility', 'archived_at']);
            $table->index(['booking_id', 'archived_at']);
            $table->index(['order_id', 'archived_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_portal_updates');
    }
};
