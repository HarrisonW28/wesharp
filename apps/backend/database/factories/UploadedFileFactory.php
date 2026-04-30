<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\UploadedFile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UploadedFile>
 */
class UploadedFileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'fileable_type' => Company::class,
            'fileable_id' => Company::factory(),
            'disk' => 'local',
            'path' => 'demo/'.fake()->uuid().'.pdf',
            'original_filename' => 'delivery-note.pdf',
            'mime_type' => 'application/pdf',
            'byte_size' => 2048,
        ];
    }
}
