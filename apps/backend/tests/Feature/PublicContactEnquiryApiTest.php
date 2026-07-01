<?php

namespace Tests\Feature;

use App\Enums\CompanyStatus;
use App\Models\Company;
use App\Models\Contact;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PublicContactEnquiryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_creates_lead_and_contact(): void
    {
        $response = $this->postJson('/api/public/contact-enquiries', [
            'contact_name' => 'Alex Chen',
            'email' => 'alex@example.com',
            'phone' => '+441234567890',
            'business_name' => 'Chen Prep',
            'message' => 'Interested in trade pricing for two sites.',
            'topic' => 'trade',
            'terms_accepted' => true,
        ]);

        $response->assertCreated()->assertJsonPath('success', true);

        $company = Company::query()->where('billing_email', 'alex@example.com')->first();
        $this->assertInstanceOf(Company::class, $company);
        /** @phpstan-ignore-next-line */
        $this->assertSame(CompanyStatus::Lead, $company->company_status);

        /** @phpstan-ignore-next-line */
        $this->assertTrue(
            Contact::query()->where('company_id', $company->id)->where('email', 'alex@example.com')->exists()
        );
    }
}
