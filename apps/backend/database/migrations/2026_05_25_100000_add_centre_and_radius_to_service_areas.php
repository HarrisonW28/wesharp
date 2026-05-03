<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_areas', function (Blueprint $table): void {
            $table->decimal('centre_latitude', 10, 7)->nullable()->after('postcode_prefix');
            $table->decimal('centre_longitude', 10, 7)->nullable()->after('centre_latitude');
            $table->unsignedInteger('radius_metres')->nullable()->after('centre_longitude');
        });
    }

    public function down(): void
    {
        Schema::table('service_areas', function (Blueprint $table): void {
            $table->dropColumn(['centre_latitude', 'centre_longitude', 'radius_metres']);
        });
    }
};
