<?php

namespace App\Http\Controllers;

use App\Domain\Newsletter\Subscriptions;
use App\Support\Api\Envelope;
use App\Support\Csv;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * The newsletter (05_BUSINESS_RULES.md → "Newsletter and spam"):
 *
 *   POST  /newsletter/subscribe                   201 new · 200 "Already subscribed" · 200 "Subscribed" (back again)
 *   PATCH /admin/newsletter-subscribers/{id}      `{ status }` only
 *   GET   /admin/newsletter-subscribers/export    CSV, UTF-8 with a BOM — `status`, `q`
 *
 * The admin list and delete are the CRUD engine's (App\Crud\Definitions\Newsletter).
 */
class NewsletterController extends Controller
{
    public function subscribe(Request $request, Subscriptions $subscriptions): JsonResponse
    {
        ['outcome' => $outcome, 'record' => $record] = $subscriptions->subscribe($this->body($request));

        return match ($outcome) {
            'created' => Envelope::created($record),
            'resubscribed' => Envelope::message('Subscribed', $record),
            default => Envelope::message('Already subscribed'),
        };
    }

    public function updateStatus(Request $request, string $id, Subscriptions $subscriptions): JsonResponse
    {
        return Envelope::ok($subscriptions->setStatus($id, $this->body($request)));
    }

    public function export(Request $request, Subscriptions $subscriptions): Response
    {
        [$csv, $filename] = $subscriptions->export($this->query($request));

        return Csv::download($csv, $filename);
    }
}
