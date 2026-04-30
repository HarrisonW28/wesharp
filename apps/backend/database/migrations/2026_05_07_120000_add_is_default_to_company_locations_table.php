<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_locations', function (Blueprint $table): void {
            $table->boolean('is_default')->default(false)->after('company_id');
            $table->index(['company_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::table('company_locations', function (Blueprint $table): void {
            $table->dropIndex(['company_id', 'is_default']);
            $table->dropColumn('is_default');
        });
    }
};
