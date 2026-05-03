<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceAreaWaitlistSignup extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'service_area_waitlist_signups';

    protected $fillable = [
        'name',
        'email',
        'postcode',
        'postcode_normalized',
        'customer_type',
        'estimated_knife_count',
        'notes',
        'source',
        'contact_consent',
    ];

    protected function casts(): array
    {
        return [
            'estimated_knife_count' => 'integer',
            'contact_consent' => 'boolean',
        ];
    }
}
