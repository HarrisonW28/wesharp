<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('knives', function (Blueprint $table) {
            $table->string('inspection_condition', 255)->nullable()->after('damage_notes');
            $table->text('inspection_notes')->nullable()->after('inspection_condition');
            $table->text('inspection_internal_notes')->nullable()->after('inspection_notes');
            $table->boolean('inspection_customer_visible')->default(false)->after('inspection_internal_notes');
            $table->foreignId('inspected_by_user_id')->nullable()->after('inspection_customer_visible')->constrained('users')->nullOnDelete();
            $table->timestampTz('inspected_at')->nullable()->after('inspected_by_user_id');
        });

        Schema::table('damage_reports', function (Blueprint $table) {
            $table->text('internal_notes')->nullable()->after('details');
            $table->boolean('customer_visible')->default(false)->after('internal_notes');
            $table->text('customer_description')->nullable()->after('customer_visible');
            $table->string('status', 32)->default('open')->after('customer_description');
            $table->timestampTz('resolved_at')->nullable()->after('status');
            $table->timestampTz('archived_at')->nullable()->after('resolved_at');
            $table->index(['status', 'archived_at']);
        });

        DB::table('damage_reports')->whereNull('severity')->update(['severity' => 'moderate']);

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            $rows = DB::table('damage_reports')->whereNull('order_id')->get(['id', 'knife_id']);
            foreach ($rows as $row) {
                $oid = DB::table('knives')->where('id', $row->knife_id)->value('order_id');
                if ($oid !== null) {
                    DB::table('damage_reports')->where('id', $row->id)->update(['order_id' => $oid]);
                }
            }
        } elseif ($driver === 'pgsql') {
            DB::statement('
                UPDATE damage_reports dr
                SET order_id = k.order_id
                FROM knives k
                WHERE dr.knife_id = k.id
                  AND dr.order_id IS NULL
                  AND k.order_id IS NOT NULL
            ');
        } else {
            DB::statement('
                UPDATE damage_reports dr
                INNER JOIN knives k ON k.id = dr.knife_id
                SET dr.order_id = k.order_id
                WHERE dr.order_id IS NULL AND k.order_id IS NOT NULL
            ');
        }
    }

    public function down(): void
    {
        Schema::table('damage_reports', function (Blueprint $table) {
            $table->dropIndex(['status', 'archived_at']);
        });

        Schema::table('damage_reports', function (Blueprint $table) {
            $table->dropColumn([
                'internal_notes',
                'customer_visible',
                'customer_description',
                'status',
                'resolved_at',
                'archived_at',
            ]);
        });

        Schema::table('knives', function (Blueprint $table) {
            $table->dropForeign(['inspected_by_user_id']);
            $table->dropColumn([
                'inspection_condition',
                'inspection_notes',
                'inspection_internal_notes',
                'inspection_customer_visible',
                'inspected_at',
            ]);
        });
    }
};
