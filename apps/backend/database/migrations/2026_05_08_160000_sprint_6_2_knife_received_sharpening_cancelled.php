<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('knives')->where('knife_status', 'collected')->update(['knife_status' => 'received']);

        Schema::table('order_items', function (Blueprint $table): void {
            $table->string('service_status', 32)->nullable()->after('unit_amount_pence')->index();
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table): void {
            $table->dropIndex(['service_status']);
            $table->dropColumn('service_status');
        });

        DB::table('knives')->where('knife_status', 'received')->update(['knife_status' => 'collected']);
    }
};
