<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table): void {
            $table->json('public_highlights')->nullable()->after('description');
            $table->string('public_cta_label', 80)->nullable()->after('public_highlights');
            $table->boolean('recommended')->default(false)->after('public_cta_label');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table): void {
            $table->dropColumn(['public_highlights', 'public_cta_label', 'recommended']);
        });
    }
};
