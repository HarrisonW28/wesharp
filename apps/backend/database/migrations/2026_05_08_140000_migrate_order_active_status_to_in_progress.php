<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('orders')->where('order_status', 'active')->update(['order_status' => 'in_progress']);
    }

    public function down(): void
    {
        DB::table('orders')->where('order_status', 'in_progress')->update(['order_status' => 'active']);
    }
};
