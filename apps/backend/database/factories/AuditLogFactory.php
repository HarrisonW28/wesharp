<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'actor_id' => User::factory(),
            'action' => 'demo.audit.event',
            'auditable_type' => Company::class,
            'auditable_id' => Company::factory(),
            'payload' => ['fixture' => true],
            'ip_address' => fake()->ipv4(),
            'created_at' => now(),
        ];
    }
}
