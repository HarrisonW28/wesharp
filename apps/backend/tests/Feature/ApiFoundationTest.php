<?php

namespace Tests\Feature;

use Tests\TestCase;

final class ApiFoundationTest extends TestCase
{
    public function test_health_returns_standard_envelope_and_request_id_header(): void
    {
        $response = $this->get('/api/health');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.schema', 1)
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonStructure([
                'meta' => ['timestamp'],
            ]);

        self::assertNotEmpty($response->headers->get('X-Request-ID'));
    }
}
