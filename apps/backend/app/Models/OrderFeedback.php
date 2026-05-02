<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class OrderFeedback extends Model
{
    use HasUuids;

    protected $table = 'order_feedback';

    protected $fillable = [
        'order_id',
        'company_id',
        'invitation_sent_at',
        'submitted_at',
        'rating',
        'comment',
        'testimonial_interested',
        'staff_reviewed_at',
        'staff_reviewed_by_user_id',
        'testimonial_marketing_approved_at',
    ];

    protected function casts(): array
    {
        return [
            'invitation_sent_at' => 'datetime',
            'submitted_at' => 'datetime',
            'staff_reviewed_at' => 'datetime',
            'testimonial_marketing_approved_at' => 'datetime',
            'testimonial_interested' => 'boolean',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function staffReviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_reviewed_by_user_id');
    }
}
