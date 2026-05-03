<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_area_waitlist_signups', function (Blueprint $table) {
            $table->string('source', 64)->nullable()->after('notes');
            $table->boolean('contact_consent')->nullable()->after('source');
        });

        DB::table('service_area_waitlist_signups')->update([
            'source' => 'service_areas_page',
            'contact_consent' => true,
        ]);
    }

    public function down(): void
    {
        Schema::table('service_area_waitlist_signups', function (Blueprint $table) {
            $table->dropColumn(['source', 'contact_consent']);
        });
    }
};
