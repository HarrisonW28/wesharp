<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stripe_settings', function (Blueprint $table): void {
            $table->id();
            $table->text('secret_key')->nullable();
            $table->text('public_key')->nullable();
            $table->text('webhook_secret')->nullable();
            $table->boolean('hosted_checkout_enabled')->nullable();
            $table->boolean('allow_live')->nullable();
            $table->string('checkout_success_url', 2048)->nullable();
            $table->string('checkout_cancel_url', 2048)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_settings');
    }
};
