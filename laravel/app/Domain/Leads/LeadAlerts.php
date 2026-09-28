<?php

namespace App\Domain\Leads;

use App\Contract\Contract;
use App\Mail\LeadAlertMail;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Time\Clock;
use App\Support\Time\Ist;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * The lead alerts (09_MEDIA_AND_EMAIL.md → "Lead notification e-mail", "The
 * test alert"), sent to `settings.leads.notificationEmails`.
 *
 * The mock stores the lead and sends nothing; this API e-mails the desk about
 * every lead stored by the site's forms or entered by the desk. **The e-mail
 * never fails the lead**: it is queued, and whatever the mailer or the queue
 * throws is logged, never answered. The test alert is the opposite — the
 * admin is waiting to learn whether the relay accepts the message, so it is
 * sent synchronously and a refusal is the 502 it answers.
 */
final class LeadAlerts
{
    public function __construct(private DocumentStore $store) {}

    /** Queues the alert of a stored lead; an empty list sends nothing. */
    public function queue(array $lead): void
    {
        try {
            $recipients = array_values(array_filter($this->savedAddresses(), [self::class, 'isAddress']));
            if ($recipients === []) {
                ApiLog::info('leads', "Lead #{$lead['id']}: no notification e-mail is saved, so no alert was sent");

                return;
            }
            Mail::to($recipients)->queue(new LeadAlertMail($this->alertOf($lead)));
            ApiLog::info('leads', "Lead #{$lead['id']}: alert queued to ".count($recipients).' notification address(es)');
        } catch (Throwable $exception) {
            ApiLog::error('leads', "Lead #{$lead['id']}: the alert could not be sent — the lead is stored all the same", [
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * Sends the test alert to the **saved** addresses — not what the form
     * holds unsaved, which is why the button asks for a save first.
     *
     * @return array{sentTo: array, sentAt: string}
     */
    public function sendTest(): array
    {
        $emails = $this->savedAddresses();
        if ($emails === []) {
            throw ApiException::validation(['leads.notificationEmails' => 'Add at least one notification e-mail and save the settings first.']);
        }
        $invalid = array_filter($emails, fn (mixed $email) => ! self::isAddress($email));
        if ($invalid !== []) {
            $listed = implode(', ', array_map(fn (mixed $email) => $email === null ? '' : Js::string($email), $invalid));

            throw ApiException::validation(['leads.notificationEmails' => "Not an e-mail address: {$listed}."]);
        }

        $sentAt = Clock::nowIso();
        try {
            Mail::to($emails)->sendNow(new LeadAlertMail($this->testAlert()));
        } catch (Throwable $exception) {
            ApiLog::error('leads', 'Test lead alert refused by the mailer', ['message' => $exception->getMessage()]);

            throw ApiException::badGateway($exception->getMessage());
        }
        ApiLog::info('leads', 'Test lead alert sent to '.count($emails).' notification address(es)');

        return ['sentTo' => $emails, 'sentAt' => $sentAt];
    }

    /** An address a lead alert could be sent to. */
    public static function isAddress(mixed $email): bool
    {
        return preg_match('/^[^'.Js::SPACE.'@]+@[^'.Js::SPACE.'@]+\.[^'.Js::SPACE.'@]+$/uD', Js::string($email)) === 1;
    }

    /** `settings.leads.notificationEmails`, as saved. */
    private function savedAddresses(): array
    {
        $emails = Js::get(Js::get($this->store->singleton('siteSettings'), 'leads'), 'notificationEmails');

        return Js::isList($emails) ? $emails : [];
    }

    /**
     * What a real alert says: who enquired and how to reach them, about
     * what, what they are looking for, who has the lead now, where the form
     * was, and a link to the lead in the admin.
     */
    private function alertOf(array $lead): array
    {
        [$siteName, $siteUrl] = $this->site();
        $property = ($lead['propertyId'] ?? null) === null ? null : $this->store->find('properties', $lead['propertyId']);
        $source = Contract::enumLabel('LEAD_SOURCES', $lead['source'] ?? null) ?: Js::string($lead['source'] ?? '');
        $email = is_string($lead['email'] ?? null) && $lead['email'] !== '' ? $lead['email'] : null;
        $assignee = ($lead['assignedTo'] ?? null) === null ? null : ($this->store->find('adminUsers', $lead['assignedTo'])['name'] ?? null);
        $requirement = (new RequirementText($this->store))->describe($lead['requirement'] ?? null);
        $utm = [];
        foreach (['source', 'medium', 'campaign', 'term', 'content'] as $key) {
            $value = Js::get($lead['utm'] ?? null, $key);
            if (is_string($value) && $value !== '') {
                $utm[] = "{$key}: {$value}";
            }
        }
        $listingUrl = $property !== null && ($property['isActive'] ?? false) && ! empty($property['slug']) ? "{$siteUrl}/properties/{$property['slug']}" : null;

        $rows = array_values(array_filter([
            ['Name', (string) $lead['name']],
            ['Phone', (string) $lead['phone'], 'tel:'.$lead['phone']],
            $email === null ? null : ['E-mail', $email, "mailto:{$email}"],
            ['Source', $source],
            $property === null ? null : ['Listing', (string) ($property['title'] ?? ''), $listingUrl],
            empty($lead['message']) ? null : ['Message', (string) $lead['message']],
            $requirement === '' ? null : ['Requirement', $requirement],
            ['Assigned to', $assignee ?? 'Nobody yet — the lead is unassigned'],
            empty($lead['pageUrl']) ? null : ['Page', (string) $lead['pageUrl'], (string) $lead['pageUrl']],
            $utm === [] ? null : ['UTM', implode(' · ', $utm)],
            ['Received', Ist::formatDateTime($lead['createdAt'] ?? null).' IST'],
        ]));

        return [
            'subject' => 'New enquiry — '.($property['title'] ?? $source)." — {$lead['name']}",
            'intro' => "A new enquiry has arrived on {$siteName}.",
            'rows' => $rows,
            'adminUrl' => "{$siteUrl}/admin/leads/{$lead['id']}",
            'replyTo' => $email,
            'replyName' => $email === null ? null : (string) $lead['name'],
        ];
    }

    /** The test alert: says it is one, and lists what a real alert carries. */
    private function testAlert(): array
    {
        [$siteName] = $this->site();

        return [
            'subject' => "Test lead alert — {$siteName}",
            'intro' => "This is a test lead alert from {$siteName}, sent from Settings → Lead notifications to check that the alerts reach this address. Nobody has enquired. A real alert is sent for every new enquiry and carries:",
            'rows' => [
                ['Name', 'The enquirer’s name'],
                ['Phone', 'Their number, as a link that calls it'],
                ['E-mail', 'Their address — “Reply” answers them'],
                ['Source', 'The form the enquiry came from'],
                ['Listing', 'The listing they asked about, with its address on the site'],
                ['Message', 'What they wrote'],
                ['Requirement', 'What they are looking for: type, budget, timeline'],
                ['Assigned to', 'The colleague the lead went to'],
                ['Page', 'The page the form was sent from, with its UTM tags'],
                ['Received', 'When it arrived, in IST — and a link to the lead in the admin'],
            ],
            'adminUrl' => null,
            'replyTo' => null,
            'replyName' => null,
        ];
    }

    /** @return array{0: string, 1: string} the site's name and its address, without a trailing slash */
    private function site(): array
    {
        $general = Js::get($this->store->singleton('siteSettings'), 'general');
        $name = Js::get($general, 'siteName');
        $url = Js::get($general, 'siteUrl');

        return [
            is_string($name) && $name !== '' ? $name : (string) config('mail.from.name'),
            rtrim(is_string($url) && $url !== '' ? $url : (string) config('sna.site_url'), '/'),
        ];
    }
}
