<?php

namespace App\Http\Controllers;

use App\Contract\Contract;
use App\Crud\CrudResource;
use App\Domain\Settings\SettingsMerge;
use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Site settings (05_BUSINESS_RULES.md → "Settings").
 *
 *   GET /settings          the public subset: everything but `leads`
 *   GET /admin/settings    the whole singleton (admin and manager)
 *   PUT /admin/settings    a deep merge of the keys the model knows (admin only)
 *
 * `leads` holds the notification addresses, the assignment policy and the
 * WhatsApp template — internal; everything else is needed by the browser to
 * render the site. Who may write is the role matrix's call (`settings.edit`),
 * answered by the `admin` middleware before this runs.
 */
class SiteSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $public = array_diff_key($this->current(), array_flip(Contract::model('siteSettings')['publicOmit']));

        return Envelope::ok(CrudResource::object($public));
    }

    public function adminShow(): JsonResponse
    {
        return Envelope::ok(CrudResource::object($this->current()));
    }

    public function update(Request $request): JsonResponse
    {
        $saved = DB::transaction(fn () => $this->store->saveSingleton(
            'siteSettings',
            SettingsMerge::apply($this->store->singleton('siteSettings'), $this->rawBody($request), 'settings.update', 'siteSettings'),
        ));
        ApiLog::info('settings', 'Site settings saved', ['panels' => array_keys($this->body($request))]);

        return Envelope::ok($saved);
    }

    private function current(): array
    {
        return $this->store->singleton('siteSettings') ?? [];
    }
}
