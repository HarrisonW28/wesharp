<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class UploadedFile extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'fileable_type',
        'fileable_id',
        'disk',
        'path',
        'original_filename',
        'mime_type',
        'byte_size',
    ];

    public function fileable(): MorphTo
    {
        return $this->morphTo(__FUNCTION__);
    }
}
