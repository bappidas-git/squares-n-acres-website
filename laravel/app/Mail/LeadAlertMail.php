<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * The lead notification e-mail (09_MEDIA_AND_EMAIL.md → "Lead notification
 * e-mail", "The test alert").
 *
 * Queued, three tries a minute apart; after the third failure it is left to
 * `failed_jobs` and the log, because the enquiry itself was stored long
 * before. Its content is computed when the lead is stored
 * (App\Domain\Leads\LeadAlerts), so the alert names the colleague the lead
 * went to and a retry an hour later still says what it said then. Plain text
 * and HTML; the HTML view escapes everything the visitor typed.
 */
class LeadAlertMail extends Mailable implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 60;

    /**
     * @param  array{subject: string, intro: string, rows: array<int, array{0: string, 1: string, 2?: ?string}>,
     *   adminUrl: ?string, replyTo: ?string, replyName: ?string}  $alert
     */
    public function __construct(public array $alert) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->alert['subject'],
            // "Reply" answers the enquirer.
            replyTo: $this->alert['replyTo'] !== null ? [new Address($this->alert['replyTo'], $this->alert['replyName'])] : [],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.lead-alert',
            text: 'mail.lead-alert-text',
            with: ['alert' => $this->alert],
        );
    }
}
