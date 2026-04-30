<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KnifePhoto extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'knife_id',
        'uploaded_file_id',
        'sort_order',
        'caption',
    ];

    public function knife(): BelongsTo
    {
        return $this->belongsTo(Knife::class);
    }

    public function uploadedFile(): BelongsTo
    {
        return $this->belongsTo(UploadedFile::class);
    }
}
