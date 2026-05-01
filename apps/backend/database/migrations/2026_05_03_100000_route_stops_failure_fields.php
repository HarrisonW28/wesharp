<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('route_stops', function (Blueprint $table): void {
            $table->string('failure_reason', 512)->nullable()->after('damage_notes');
            $table->text('failure_notes')->nullable()->after('failure_reason');
            $table->json('failure_meta')->nullable()->after('failure_notes');
        });
    }

    public function down(): void
    {
        Schema::table('route_stops', function (Blueprint $table): void {
            $table->dropColumn(['failure_reason', 'failure_notes', 'failure_meta']);
        });
    }
};
