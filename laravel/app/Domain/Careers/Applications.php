<?php

namespace App\Domain\Careers;

use App\Contract\Contract;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Time\Clock;
use App\Support\Validation\SchemaValidator;

/**
 * The careers form (09_MEDIA_AND_EMAIL.md → "The careers form").
 *
 * A résumé is a URL, never a file (D12): the form uploads to Cloudinary with
 * an unsigned preset when one is configured and otherwise asks for a link, so
 * no multipart body ever reaches the API. An application arrives `new`, with
 * no notes, and is then triaged in the panel (the CRUD engine's
 * `jobApplications` resource).
 */
final class Applications
{
    public function __construct(private DocumentStore $store) {}

    /**
     * `POST /jobs/{id}/apply` — 404 for an unknown opening, 404 "This opening
     * is closed." for one that is inactive or past its closing day, 422 for
     * the form, otherwise the stored application.
     */
    public function apply(string $jobId, array $body): array
    {
        $job = (new Openings($this->store))->find($jobId);
        if (! Openings::isOpen($job)) {
            ApiLog::info('careers', "Application refused: opening #{$job['id']} is closed");

            throw ApiException::notFound(Openings::CLOSED_MESSAGE);
        }

        SchemaValidator::validate(Contract::schema('jobApplication.create'), $body, ['fillDefaults' => true]);

        $now = Clock::nowIso();
        $stored = $this->store->insert('jobApplications', [
            'id' => null,
            'jobId' => $job['id'],
            'name' => $body['name'],
            'email' => $body['email'],
            'phone' => $body['phone'],
            'resumeUrl' => $body['resumeUrl'],
            'coverLetter' => $body['coverLetter'] ?? null,
            'linkedinUrl' => $body['linkedinUrl'] ?? null,
            'status' => 'new',
            'notes' => null,
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);
        ApiLog::info('careers', "Application #{$stored['id']} received for opening #{$job['id']}", ['opening' => $job['title'] ?? null]);

        return $stored;
    }
}
