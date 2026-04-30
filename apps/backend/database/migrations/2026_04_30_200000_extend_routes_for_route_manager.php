<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('routes', function (Blueprint $table): void {
            $table->text('notes')->nullable()->after('meta');
            $table->string('coverage_city', 96)->nullable()->after('scheduled_date')->index();
        });

        Schema::table('route_stops', function (Blueprint $table): void {
            $table->unsignedSmallInteger('actual_knife_count')->nullable()->after('booking_id');
            $table->text('damage_notes')->nullable()->after('actual_knife_count');
        });
    }

    public function down(): void
    {
        Schema::table('route_stops', function (Blueprint $table): void {
            $table->dropColumn(['actual_knife_count', 'damage_notes']);
        });

        Schema::table('routes', function (Blueprint $table): void {
            $table->dropColumn(['notes', 'coverage_city']);
        });
    }
};
