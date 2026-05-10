<?php

declare(strict_types=1);

namespace App\Support\SiteContent;

/**
 * Built-in marketing copy used when no overrides exist in the database.
 *
 * @phpstan-type FaqItem array{q: string, a: string}
 * @phpstan-type HowStep array{title: string, body: string}
 * @phpstan-type HomeHowStep array{step: int, title: string, body: string}
 * @phpstan-type TrustBadge array{label: string}
 * @phpstan-type BenefitRow array{title: string, body: string}
 */
final class SiteContentDefaults
{
    /**
     * @return array<string, mixed>
     */
    public static function all(): array
    {
        return [
            'homepage' => [
                'hero_badge' => 'Greater Manchester & Liverpool',
                'hero_title' => 'Professional knife sharpening, collected from your door.',
                'hero_subtitle' => 'Book a slot, hand over your blades, and get them back sharp and inspected — without leaving your kitchen off the pass for long.',
                'hero_supporting' => 'Most kitchens book in under a minute — choose a date, tell us roughly how many knives, and you\'re done.',
                'cta_book' => 'Book a collection',
                'cta_coverage' => 'Check your postcode',
                'cta_pricing' => 'See prices',
                'cta_how' => 'How it works',
                'cta_sign_in' => 'Sign in',
                'cta_register' => 'Create account',
                'cta_my_account' => 'My account',
                'trust_badges' => [
                    ['label' => 'Tracked orders — see status from collection to return'],
                    ['label' => 'Timestamped photos when your programme includes them'],
                    ['label' => 'Clear £ pricing on quotes and invoices'],
                    ['label' => 'Free customer portal for bookings and history'],
                ],
                'how_section_title' => 'How it works',
                'how_section_lead' => 'Four simple steps from booking to blades back on your rack.',
                'how_steps' => [
                    ['step' => 1, 'title' => 'Book your collection', 'body' => 'Pick a date and time window that suits your kitchen — online, in a few minutes.'],
                    ['step' => 2, 'title' => 'We collect your knives', 'body' => 'Our driver arrives, logs each blade, and takes them safely to our workshop.'],
                    ['step' => 3, 'title' => 'We sharpen and inspect them', 'body' => 'Professional edges, a careful quality check, and safe handling throughout.'],
                    ['step' => 4, 'title' => 'We return them ready to use', 'body' => 'Your knives come back sharp, ready for service — with clear updates in your account.'],
                ],
                'how_section_more_label' => 'More detail',
                'who_for_title' => 'Who it\'s for',
                'who_for_lead' => 'From brigades to home cooks — if you rely on sharp knives, we can help.',
                'who_for_labels' => ['Restaurants', 'Hotels', 'Butchers', 'Caterers', 'Chefs', 'Home kitchens'],
                'benefits_title' => 'Why kitchens choose WeSharp',
                'benefits' => [
                    ['title' => 'Doorstep collection', 'body' => 'We come to you — no need to parcel knives or lose a whole service day.'],
                    ['title' => 'Workshop-sharp edges', 'body' => 'Proper equipment and experienced sharpeners on every job.'],
                    ['title' => 'Tracked orders & updates', 'body' => 'See where things stand in your WeSharp account from collection to return — including photos when your programme includes them.'],
                    ['title' => 'Straightforward £ pricing', 'body' => 'Clear quotes and GBP invoices so you always know what you\'re paying.'],
                    ['title' => 'Regular visits & care plans', 'body' => 'Ideal for busy kitchens — rolling routes and subscription-style programmes tailored to you.'],
                ],
                'areas_section_title' => 'Areas we cover',
                'areas_section_lead' => 'Tell us your postcode when you book — we\'ll confirm you\'re in range.',
                'areas_see_coverage' => 'See coverage',
                'pricing_section_title' => 'Pricing preview',
                'pricing_section_lead' => 'Example figures — your quote depends on volume and how often we visit.',
                'pricing_section_payg_label' => 'Pay-as-you-go',
                'pricing_section_payg_hint' => 'From our standard per-knife guide rate (indicative).',
                'pricing_section_payg_footer' => 'Per knife · confirm on quote',
                'pricing_section_programme_label' => 'Regular programme',
                'pricing_section_programme_hint' => 'Example monthly bundle for scheduled visits (indicative).',
                'pricing_section_programme_footer' => 'per month · tailored when we speak',
                'pricing_cta_subscriptions' => 'Subscriptions & programmes',
                'pricing_cta_trade' => 'For business kitchens',
                'footer_cta_title' => 'Ready to sharpen your knives?',
                'footer_cta_lead' => 'Book a collection in a few minutes. We\'ll confirm timing and anything we need from you before we arrive.',
                'footer_cta_book' => 'Book a collection',
                'footer_cta_talk' => 'Talk to us first',
                'footer_cta_register' => 'Create free account',
            ],
            'services' => [
                'title' => 'Services',
                'lead' => 'Door-to-door knife sharpening for busy kitchens. You keep cooking — we handle collection, workshop sharpening, quality checks, and safe return.',
            ],
            'pricing_page' => [
                'title' => 'Pricing',
                'lead' => 'Every kitchen is different — we price by volume, how often we visit, and turnaround. Figures below are guide rates in GBP; we confirm a written quote before you commit.',
            ],
            'subscriptions_page' => [
                'title' => 'Subscriptions & regular programmes',
                'lead' => 'If you run knives through the pass every week, ad-hoc collections aren\'t always enough. We offer rolling routes and care-style programmes with included visits and knife allowances — so you know when we\'re coming and what\'s covered.',
            ],
            'how_it_works' => [
                'title' => 'How it works',
                'lead' => 'You book a collection. We collect, log, sharpen, and inspect your knives in our workshop, then return them — with plain updates in your account (and photos when your programme includes them).',
                'steps' => [
                    [
                        'title' => 'Book',
                        'body' => 'Send a collection enquiry with your postcode, a rough knife count, and when you need us — no account is required for the first message.',
                    ],
                    [
                        'title' => 'Collect',
                        'body' => 'We arrive in the agreed window, identify each blade against your booking, pack everything for transport, and hand over clearly to your on-site contact.',
                    ],
                    [
                        'title' => 'Sharpen & check',
                        'body' => 'Knives are sharpened and inspected in our workshop. Anything that doesn\'t meet our quality bar is flagged for discussion before it goes back on the van.',
                    ],
                    [
                        'title' => 'Return',
                        'body' => 'We return blades on a scheduled run, ready for service. With a free account you follow status end-to-end. If your programme includes customer-visible evidence, timestamped photos can appear in your portal — internal-only shots never show in your account.',
                    ],
                ],
                'subscriptions_prompt' => 'Interested in rolling visits? Read',
                'subscriptions_link_label' => 'subscriptions & programmes',
                'customer_signin_prompt' => 'Already a customer?',
                'customer_signin_link_label' => 'Sign in',
                'customer_signin_suffix' => 'to manage bookings, orders, and invoices.',
            ],
            'faq' => [
                ['q' => 'Do I need an account to book?', 'a' => 'No. Send a collection enquiry with your details and we’ll get back to you to confirm timing. Once you’re a regular customer, a free account helps you track bookings, orders, and invoices.'],
                ['q' => 'How long does sharpening take?', 'a' => 'It depends on how many knives you send and our route schedule. We’ll give you an expected return date when we confirm your collection — not a vague “soon”.'],
                ['q' => 'Can I track my knives?', 'a' => 'Yes. With a free account you can see bookings and orders in one place — from collection through the workshop to return.'],
                ['q' => 'Will I see photos of my knives?', 'a' => 'When your programme includes customer-visible evidence, timestamped photos can appear in your portal. Internal-only shots never show in your account.'],
                ['q' => 'Do you offer subscription-style plans?', 'a' => 'Yes. Busy kitchens often use rolling programmes with included visits and allowances. Read our subscriptions page for an overview, then we’ll quote properly for your volumes.'],
                ['q' => 'How do invoices and payment work?', 'a' => 'We raise invoices in GBP for the work we’ve done. In your account you can see what’s outstanding; our team will agree payment terms with you when you’re set up.'],
                ['q' => 'Where do you collect?', 'a' => 'We currently serve Greater Manchester and Liverpool. Add your postcode when you book — we’ll only confirm if you’re in an area we cover.'],
                ['q' => 'Do you work with restaurants only?', 'a' => 'We work with professional kitchens of all sizes — restaurants, hotels, butchers, caterers — and with serious home cooks who want the same service.'],
                ['q' => 'What if a knife is damaged in your care?', 'a' => 'We log condition at handover and again in the workshop. If anything doesn’t look right, we pause and contact you before sharpening. Specific terms can be agreed when you’re on-boarded as a regular customer — use Contact if you need paperwork in advance.'],
                ['q' => 'Can you follow our RAMS or site rules?', 'a' => 'Yes. Share access rules, inductions, or RAMS when you book or via Contact — we’ll work with your estates or H&S contact so collections fit your site policy.'],
                ['q' => 'What does the business portal dashboard show?', 'a' => 'After sign-in you get an overview of your next collection, orders still in progress, and invoices that need attention — plus full lists for bookings, orders, knives, and invoices. On subscription programmes, allowance summaries appear on Your plan. Internal WeSharp analytics are separate; customer views are scoped to your organisation.'],
                ['q' => 'Who gets logins on a trade account?', 'a' => 'During onboarding we agree billing contacts and site operators, then you invite users into the same tenant portal so everyone sees consistent status. Tell us if roles change and we can adjust access.'],
                ['q' => 'Can groups get consolidated invoicing?', 'a' => 'Yes for typical trade setups — we align invoice recipients and references with your finance team. Mention multi-site on Contact or when you book so we quote and onboard correctly.'],
            ],
            'faq_page' => [
                'title' => 'FAQ',
                'lead' => 'Straight answers before you book — including trade portal and billing. If something’s not here, use Contact and we’ll reply in working hours.',
            ],
            'safety_page' => [
                'title' => 'Safety & trust',
                'lead' => 'Kitchen teams hand over sharp tools every day — we match that seriousness with clear custody from collection through the workshop and back to your pass.',
                'points' => [
                    'Named access windows and on-site contacts for every collection — no surprise knock-on-the-door moments.',
                    'Each blade tied to your booking in our systems so nothing goes unaccounted for between your kitchen and return.',
                    'If something arrives in unexpected condition, we record it and speak with you before work continues.',
                    'Risk assessments or RAMS from your estates team? Mention them on enquiry or Contact and we’ll align with your process.',
                ],
            ],
            'contact' => [
                'title' => 'Contact',
                'lead' => 'Tell us what you need — new site, urgent collection, or a question about coverage and pricing. We reply during business hours.',
                'support_email' => 'hello@wesharp.uk',
                'support_phone' => '',
                'hint_paragraph' => 'For the fastest route to a slot, include your postcode, roughly how many knives need attention, and when you need us.',
                'cta_book' => 'Book a collection',
            ],
            'service_areas' => [
                'title' => 'Areas we cover',
                'lead' => 'We collect and deliver across Greater Manchester and Liverpool. Add your postcode when you book — we only confirm if you’re in range.',
                'footnote' => 'Not sure you’re covered? Put your address on the enquiry form — we’ll tell you straight away if we can reach you.',
            ],
            'booking' => [
                'page_kicker' => 'Book a collection',
                'page_title' => 'Book a collection or on-site visit',
                'page_lead' => 'Tell us about your kitchen and when you need us. We’ll reply to confirm a slot and anything we need before we arrive — you don’t need an account for this step.',
                'success_kicker' => 'Enquiry received',
                'success_title' => 'We’ll be in touch soon',
                'success_intro' => 'Our team will review your request and contact you using the email and phone you provided to confirm timing and any access details.',
                'success_bullets' => [
                    'Watch your inbox and phone for a confirmation from WeSharp.',
                    'Have knives gathered in a safe, accessible place ready for the technician.',
                    'If plans change, reply to our message and we will adjust the booking.',
                ],
            ],
            'business' => [
                'hours_line' => 'We reply during business hours.',
            ],
            'email' => [
                'footer_line' => '',
            ],
        ];
    }
}
