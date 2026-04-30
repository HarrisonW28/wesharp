<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('knives', function (Blueprint $table): void {
            $table->string('brand', 120)->nullable()->after('knife_type');
        });

        Schema::table('bookings', function (Blueprint $table): void {
            $table->text('cancellation_reason')->nullable()->after('internal_notes');

            $table->date('requested_collection_date')->nullable()->after('scheduled_date');
            $table->time('requested_time_window_start')->nullable()->after('requested_collection_date');
            $table->time('requested_time_window_end')->nullable()->after('requested_time_window_start');

            $table->date('confirmed_collection_date')->nullable()->after('requested_time_window_end');
            $table->time('confirmed_time_window_start')->nullable()->after('confirmed_collection_date');
            $table->time('confirmed_time_window_end')->nullable()->after('confirmed_time_window_start');
        });

        // Back-fill requested_* from operational fields; duplicate into confirmed_* for already confirmed work.
        if (Schema::hasTable('bookings')) {
            $confirmedStatuses = [
                'confirmed',
                'assigned_to_route',
                'collected',
                'in_sharpening',
                'quality_checked',
                'returned',
                'completed',
            ];

            foreach (DB::table('bookings')->cursor() as $row) {
                $patch = [
                    'requested_collection_date' => $row->scheduled_date ?? null,
                    'requested_time_window_start' => $row->time_window_start ?? null,
                    'requested_time_window_end' => $row->time_window_end ?? null,
                ];

                if (in_array($row->booking_status ?? '', $confirmedStatuses, true)) {
                    $patch['confirmed_collection_date'] = $row->scheduled_date ?? null;
                    $patch['confirmed_time_window_start'] = $row->time_window_start ?? null;
                    $patch['confirmed_time_window_end'] = $row->time_window_end ?? null;
                }

                DB::table('bookings')->where('id', $row->id)->update($patch);
            }
        }
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table): void {
            $table->dropColumn([
                'cancellation_reason',
                'requested_collection_date',
                'requested_time_window_start',
                'requested_time_window_end',
                'confirmed_collection_date',
                'confirmed_time_window_start',
                'confirmed_time_window_end',
            ]);
        });

        Schema::table('knives', function (Blueprint $table): void {
            $table->dropColumn('brand');
        });
    }
};
