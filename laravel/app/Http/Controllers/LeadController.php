<?php

namespace App\Http\Controllers;

use App\Domain\Leads\LeadIntake;
use App\Domain\Leads\LeadPresenter;
use App\Support\Api\Envelope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * `POST /leads` — every lead form of the site (05_BUSINESS_RULES.md →
 * "Leads"). The honeypot and the ten-a-minute throttle sit in front of it
 * (routes/api/leads.php); the rules are App\Domain\Leads\LeadIntake's.
 *
 * Answers 201 with the lead — without `ipAddress` and `userAgent`, which are
 * for the CRM — and `access`, the token that opens the gated files of the
 * active listing the lead names, or null.
 */
class LeadController extends Controller
{
    /** The widest user agent the column keeps. */
    private const USER_AGENT_MAX = 500;

    public function store(Request $request, LeadIntake $intake, LeadPresenter $presenter): JsonResponse
    {
        $userAgent = $request->userAgent();
        [$lead, $access] = $intake->fromSite(
            $this->body($request),
            $request->ip(),
            $userAgent === null ? null : mb_substr($userAgent, 0, self::USER_AGENT_MAX),
        );

        return Envelope::created([...$presenter->public($lead), 'access' => $access]);
    }
}
