<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table): void {
            $table->text('notes')->nullable()->after('billing_contact');
            $table->timestampTz('archived_at')->nullable()->after('notes')->index();
        });

        Schema::table('company_locations', function (Blueprint $table): void {
            $table->text('notes')->nullable()->after('longitude');
            $table->timestampTz('archived_at')->nullable()->after('notes')->index();
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table): void {
            $table->dropColumn(['notes', 'archived_at']);
        });

        Schema::table('company_locations', function (Blueprint $table): void {
            $table->dropColumn(['notes', 'archived_at']);
        });
    }
};
