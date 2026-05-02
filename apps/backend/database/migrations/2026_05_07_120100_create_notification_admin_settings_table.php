<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_admin_settings', function (Blueprint $table): void {
            $table->id();
            $table->boolean('respect_booking_notification_opt_out')->default(true);
            $table->boolean('respect_order_notification_opt_out')->default(true);
            $table->boolean('respect_subscription_digest_opt_out')->default(true);
            $table->timestamps();
        });

        DB::table('notification_admin_settings')->insert([
            'respect_booking_notification_opt_out' => true,
            'respect_order_notification_opt_out' => true,
            'respect_subscription_digest_opt_out' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_admin_settings');
    }
};
