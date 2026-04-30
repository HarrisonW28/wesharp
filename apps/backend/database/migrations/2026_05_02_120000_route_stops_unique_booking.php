<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('route_stops')) {
            return;
        }

        $dupBookingIds = DB::table('route_stops')
            ->whereNotNull('booking_id')
            ->select('booking_id')
            ->groupBy('booking_id')
            ->havingRaw('COUNT(*) > 1')
            /** @phpstan-ignore-next-line */
            ->pluck('booking_id');

        foreach ($dupBookingIds as $bookingIdStr) {
            /** @phpstan-ignore-next-line */
            $ids = DB::table('route_stops')
                ->where('booking_id', $bookingIdStr)
                ->orderBy('created_at')
                ->orderBy('id')
                /** @phpstan-ignore-next-line */
                ->pluck('id')
                ->values();

            $ids->shift();

            foreach ($ids as $deleteId) {
                DB::table('route_stops')->where('id', $deleteId)->delete();
            }
        }

        Schema::table('route_stops', function (Blueprint $table): void {
            $table->unique('booking_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('route_stops')) {
            return;
        }

        Schema::table('route_stops', function (Blueprint $table): void {
            $table->dropUnique(['booking_id']);
        });
    }
};
