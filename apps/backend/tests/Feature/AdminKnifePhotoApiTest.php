<?php

namespace Tests\Feature;

use App\Models\Knife;
use App\Models\KnifePhoto;
use App\Models\UploadedFile as StoredFile;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class AdminKnifePhotoApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_upload_store_private_file_and_metadata(): void
    {
        Storage::fake('local');
        $this->seed(WeSharpDemoSeeder::class);

        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        /** @phpstan-ignore-next-line */
        $knife = Knife::query()->firstOrFail();

        $file = UploadedFile::fake()->image('workshop.jpg', 320, 240);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->post('/api/admin/knives/'.$knife->id.'/photos', [
                'photo' => $file,
                'photo_kind' => 'damage',
                'caption' => 'Edge chip',
            ]);

        $res->assertCreated();
        /** @phpstan-ignore-next-line */
        $photos = $res->json('data.photos');
        self::assertIsArray($photos);
        /** @phpstan-ignore-next-line */
        $last = $photos[array_key_last($photos)];
        self::assertSame('damage', $last['photo_kind']);
        self::assertSame('Edge chip', $last['caption']);

        /** @phpstan-ignore-next-line */
        $photoId = (string) $last['id'];
        /** @phpstan-ignore-next-line */
        $row = KnifePhoto::query()->with('uploadedFile')->findOrFail($photoId);
        self::assertSame((string) $knife->id, (string) $row->knife_id);
        self::assertSame((int) $ops->id, (int) $row->uploaded_by_user_id);
        self::assertNotNull($row->uploadedFile);
        /** @phpstan-ignore-next-line */
        Storage::disk('local')->assertExists((string) $row->uploadedFile->path);
    }

    public function test_authenticated_staff_can_stream_photo_binary(): void
    {
        Storage::fake('local');
        $this->seed(WeSharpDemoSeeder::class);

        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        /** @phpstan-ignore-next-line */
        $knife = Knife::query()->firstOrFail();
        $file = UploadedFile::fake()->image('x.jpg');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->post('/api/admin/knives/'.$knife->id.'/photos', ['photo' => $file])
            ->assertCreated();

        /** @phpstan-ignore-next-line */
        $photoId = (string) KnifePhoto::query()->where('knife_id', $knife->id)->latest('id')->value('id');

        $dl = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->get('/api/admin/knife-photos/'.$photoId.'/file');

        $dl->assertOk();
        self::assertStringContainsString('image/', (string) $dl->headers->get('content-type'));
        $size = $dl->baseResponse->headers->get('Content-Length');
        self::assertNotNull($size);
        self::assertGreaterThan(100, (int) $size);
    }

    public function test_photo_file_requires_authentication(): void
    {
        Storage::fake('local');
        $this->seed(WeSharpDemoSeeder::class);

        /** @phpstan-ignore-next-line */
        $knife = Knife::query()->firstOrFail();
        $path = 'knife-photos/'.$knife->id.'/test.jpg';
        Storage::disk('local')->put($path, random_bytes(400));

        /** @phpstan-ignore-next-line */
        $fileRow = StoredFile::query()->create([
            'fileable_type' => Knife::class,
            'fileable_id' => $knife->id,
            'disk' => 'local',
            'path' => $path,
            'original_filename' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'byte_size' => 400,
        ]);

        /** @phpstan-ignore-next-line */
        $photo = KnifePhoto::query()->create([
            'knife_id' => $knife->id,
            'uploaded_file_id' => $fileRow->id,
            'sort_order' => 99,
            'photo_kind' => 'general',
        ]);

        $this->get('/api/admin/knife-photos/'.$photo->id.'/file')->assertUnauthorized();
    }

    public function test_destroy_removes_db_row_and_storage_object(): void
    {
        Storage::fake('local');
        $this->seed(WeSharpDemoSeeder::class);

        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        /** @phpstan-ignore-next-line */
        $knife = Knife::query()->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->post('/api/admin/knives/'.$knife->id.'/photos', ['photo' => UploadedFile::fake()->image('d.jpg')])
            ->assertCreated();

        /** @phpstan-ignore-next-line */
        $photoId = (string) KnifePhoto::query()->where('knife_id', $knife->id)->latest('id')->value('id');
        /** @phpstan-ignore-next-line */
        $path = (string) KnifePhoto::query()->with('uploadedFile')->findOrFail($photoId)->uploadedFile?->path;

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->delete('/api/admin/knives/'.$knife->id.'/photos/'.$photoId)
            ->assertOk();

        self::assertNull(KnifePhoto::query()->find($photoId));
        Storage::disk('local')->assertMissing($path);
    }
}
