<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Note;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Note>
 */
class NoteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'noteable_type' => Company::class,
            'noteable_id' => Company::factory(),
            'author_id' => User::factory(),
            'body' => fake()->paragraphs(2, true),
        ];
    }
}
