<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Support\Permissions;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateSiteContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && Permissions::userMay($user, Permissions::SETTINGS_MANAGE);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $s = 'content';
        $h = "{$s}.homepage";

        return [
            "{$s}" => ['required', 'array'],
            "{$h}" => ['required', 'array'],
            "{$h}.hero_badge" => ['required', 'string', 'max:300'],
            "{$h}.hero_title" => ['required', 'string', 'max:500'],
            "{$h}.hero_subtitle" => ['required', 'string', 'max:2000'],
            "{$h}.hero_supporting" => ['required', 'string', 'max:2000'],
            "{$h}.cta_book" => ['required', 'string', 'max:120'],
            "{$h}.cta_coverage" => ['required', 'string', 'max:120'],
            "{$h}.cta_pricing" => ['required', 'string', 'max:120'],
            "{$h}.cta_how" => ['required', 'string', 'max:120'],
            "{$h}.cta_sign_in" => ['required', 'string', 'max:120'],
            "{$h}.cta_register" => ['required', 'string', 'max:120'],
            "{$h}.cta_my_account" => ['required', 'string', 'max:120'],
            "{$h}.trust_badges" => ['required', 'array', 'max:20'],
            "{$h}.trust_badges.*.label" => ['required', 'string', 'max:400'],
            "{$h}.how_section_title" => ['required', 'string', 'max:300'],
            "{$h}.how_section_lead" => ['required', 'string', 'max:1000'],
            "{$h}.how_steps" => ['required', 'array', 'max:12'],
            "{$h}.how_steps.*.step" => ['required', 'integer', 'min:1', 'max:99'],
            "{$h}.how_steps.*.title" => ['required', 'string', 'max:400'],
            "{$h}.how_steps.*.body" => ['required', 'string', 'max:4000'],
            "{$h}.how_section_more_label" => ['required', 'string', 'max:120'],
            "{$h}.who_for_title" => ['required', 'string', 'max:300'],
            "{$h}.who_for_lead" => ['required', 'string', 'max:1000'],
            "{$h}.who_for_labels" => ['required', 'array', 'max:40'],
            "{$h}.who_for_labels.*" => ['required', 'string', 'max:120'],
            "{$h}.benefits_title" => ['required', 'string', 'max:300'],
            "{$h}.benefits" => ['required', 'array', 'max:20'],
            "{$h}.benefits.*.title" => ['required', 'string', 'max:300'],
            "{$h}.benefits.*.body" => ['required', 'string', 'max:4000'],
            "{$h}.areas_section_title" => ['required', 'string', 'max:300'],
            "{$h}.areas_section_lead" => ['required', 'string', 'max:2000'],
            "{$h}.areas_see_coverage" => ['required', 'string', 'max:120'],
            "{$h}.pricing_section_title" => ['required', 'string', 'max:300'],
            "{$h}.pricing_section_lead" => ['required', 'string', 'max:2000'],
            "{$h}.pricing_section_payg_label" => ['required', 'string', 'max:200'],
            "{$h}.pricing_section_payg_hint" => ['required', 'string', 'max:1000'],
            "{$h}.pricing_section_payg_footer" => ['required', 'string', 'max:500'],
            "{$h}.pricing_section_programme_label" => ['required', 'string', 'max:200'],
            "{$h}.pricing_section_programme_hint" => ['required', 'string', 'max:1000'],
            "{$h}.pricing_section_programme_footer" => ['required', 'string', 'max:500'],
            "{$h}.pricing_cta_subscriptions" => ['required', 'string', 'max:200'],
            "{$h}.pricing_cta_trade" => ['required', 'string', 'max:200'],
            "{$h}.footer_cta_title" => ['required', 'string', 'max:400'],
            "{$h}.footer_cta_lead" => ['required', 'string', 'max:2000'],
            "{$h}.footer_cta_book" => ['required', 'string', 'max:120'],
            "{$h}.footer_cta_talk" => ['required', 'string', 'max:120'],
            "{$h}.footer_cta_register" => ['required', 'string', 'max:120'],

            "{$s}.services" => ['required', 'array'],
            "{$s}.services.title" => ['required', 'string', 'max:200'],
            "{$s}.services.lead" => ['required', 'string', 'max:3000'],

            "{$s}.pricing_page" => ['required', 'array'],
            "{$s}.pricing_page.title" => ['required', 'string', 'max:200'],
            "{$s}.pricing_page.lead" => ['required', 'string', 'max:3000'],

            "{$s}.subscriptions_page" => ['required', 'array'],
            "{$s}.subscriptions_page.title" => ['required', 'string', 'max:200'],
            "{$s}.subscriptions_page.lead" => ['required', 'string', 'max:3000'],

            "{$s}.how_it_works" => ['required', 'array'],
            "{$s}.how_it_works.title" => ['required', 'string', 'max:200'],
            "{$s}.how_it_works.lead" => ['required', 'string', 'max:3000'],
            "{$s}.how_it_works.steps" => ['required', 'array', 'max:12'],
            "{$s}.how_it_works.steps.*.title" => ['required', 'string', 'max:200'],
            "{$s}.how_it_works.steps.*.body" => ['required', 'string', 'max:4000'],
            "{$s}.how_it_works.subscriptions_prompt" => ['required', 'string', 'max:500'],
            "{$s}.how_it_works.subscriptions_link_label" => ['required', 'string', 'max:200'],
            "{$s}.how_it_works.customer_signin_prompt" => ['required', 'string', 'max:200'],
            "{$s}.how_it_works.customer_signin_link_label" => ['required', 'string', 'max:120'],
            "{$s}.how_it_works.customer_signin_suffix" => ['required', 'string', 'max:500'],

            "{$s}.faq" => ['required', 'array', 'max:40'],
            "{$s}.faq.*.q" => ['required', 'string', 'max:500'],
            "{$s}.faq.*.a" => ['required', 'string', 'max:12000'],

            "{$s}.faq_page" => ['required', 'array'],
            "{$s}.faq_page.title" => ['required', 'string', 'max:200'],
            "{$s}.faq_page.lead" => ['required', 'string', 'max:2000'],

            "{$s}.safety_page" => ['required', 'array'],
            "{$s}.safety_page.title" => ['required', 'string', 'max:200'],
            "{$s}.safety_page.lead" => ['required', 'string', 'max:3000'],
            "{$s}.safety_page.points" => ['required', 'array', 'max:12'],
            "{$s}.safety_page.points.*" => ['required', 'string', 'max:800'],

            "{$s}.contact" => ['required', 'array'],
            "{$s}.contact.title" => ['required', 'string', 'max:200'],
            "{$s}.contact.lead" => ['required', 'string', 'max:3000'],
            "{$s}.contact.support_email" => ['required', 'string', 'email', 'max:190'],
            "{$s}.contact.support_phone" => ['nullable', 'string', 'max:60'],
            "{$s}.contact.hint_paragraph" => ['required', 'string', 'max:3000'],
            "{$s}.contact.cta_book" => ['required', 'string', 'max:120'],

            "{$s}.service_areas" => ['required', 'array'],
            "{$s}.service_areas.title" => ['required', 'string', 'max:200'],
            "{$s}.service_areas.lead" => ['required', 'string', 'max:3000'],
            "{$s}.service_areas.footnote" => ['required', 'string', 'max:3000'],

            "{$s}.booking" => ['required', 'array'],
            "{$s}.booking.page_kicker" => ['required', 'string', 'max:200'],
            "{$s}.booking.page_title" => ['required', 'string', 'max:300'],
            "{$s}.booking.page_lead" => ['required', 'string', 'max:3000'],
            "{$s}.booking.success_kicker" => ['required', 'string', 'max:200'],
            "{$s}.booking.success_title" => ['required', 'string', 'max:300'],
            "{$s}.booking.success_intro" => ['required', 'string', 'max:4000'],
            "{$s}.booking.success_bullets" => ['required', 'array', 'max:20'],
            "{$s}.booking.success_bullets.*" => ['required', 'string', 'max:800'],

            "{$s}.business" => ['required', 'array'],
            "{$s}.business.hours_line" => ['required', 'string', 'max:500'],

            "{$s}.email" => ['required', 'array'],
            "{$s}.email.footer_line" => ['nullable', 'string', 'max:2000'],
        ];
    }
}
