<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cost_items', function (Blueprint $table): void {
            $table->date('renews_on')->nullable();
            $table->boolean('commitment_cancellable')->default(true);
            $table->text('payment_method_note')->nullable();
            $table->unsignedBigInteger('monthly_equivalent_pence')->nullable();
            $table->unsignedBigInteger('annual_equivalent_pence')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('cost_items', function (Blueprint $table): void {
            $table->dropColumn([
                'renews_on',
                'commitment_cancellable',
                'payment_method_note',
                'monthly_equivalent_pence',
                'annual_equivalent_pence',
            ]);
        });
    }
};
