<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->boolean('is_complimentary')->default(false)->after('discount_pence');
            $table->unsignedBigInteger('manual_charge_subtotal_pence')->nullable()->after('is_complimentary');
            $table->text('manual_charge_reason')->nullable()->after('manual_charge_subtotal_pence');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn([
                'is_complimentary',
                'manual_charge_subtotal_pence',
                'manual_charge_reason',
            ]);
        });
    }
};
