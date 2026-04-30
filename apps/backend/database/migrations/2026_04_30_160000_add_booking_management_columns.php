<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table): void {
            $table->foreignUuid('contact_id')->nullable()->after('company_location_id')->constrained('contacts')->nullOnDelete();
            $table->time('time_window_start')->nullable()->after('scheduled_date');
            $table->time('time_window_end')->nullable()->after('time_window_start');
            $table->unsignedSmallInteger('estimated_knife_count')->nullable()->after('service_type');
            $table->unsignedSmallInteger('actual_knife_count')->nullable()->after('estimated_knife_count');
            $table->text('customer_notes')->nullable()->after('actual_knife_count');
            $table->unsignedBigInteger('price_estimate_pence')->nullable()->after('customer_notes');
            $table->foreignUuid('assigned_route_id')->nullable()->after('internal_notes')->constrained('routes')->nullOnDelete();
        });

        Schema::table('bookings', function (Blueprint $table): void {
            $table->index(['booking_status', 'scheduled_date']);
            $table->index('assigned_route_id');
            $table->index('contact_id');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table): void {
            $table->dropForeign(['assigned_route_id']);
            $table->dropForeign(['contact_id']);
            $table->dropColumn([
                'contact_id',
                'time_window_start',
                'time_window_end',
                'estimated_knife_count',
                'actual_knife_count',
                'customer_notes',
                'price_estimate_pence',
                'assigned_route_id',
            ]);
        });
    }
};
