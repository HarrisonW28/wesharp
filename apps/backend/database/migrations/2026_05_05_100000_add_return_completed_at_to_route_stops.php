<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('route_stops', function (Blueprint $table): void {
            $table->timestampTz('return_completed_at')->nullable()->after('departed_at');
        });
    }

    public function down(): void
    {
        Schema::table('route_stops', function (Blueprint $table): void {
            $table->dropColumn('return_completed_at');
        });
    }
};
