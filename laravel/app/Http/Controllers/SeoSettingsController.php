<?php

namespace App\Http\Controllers;

use App\Crud\CrudResource;
use App\Domain\Settings\SettingsMerge;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * SEO settings (05_BUSINESS_RULES.md → "Settings"; 06_SEO_SITEMAP_ROBOTS.md).
 *
 *   GET /seo/settings          what the public site renders — all of it
 *   GET /admin/seo/settings    the whole singleton
 *   PUT /admin/seo/settings    deep-merged like the site settings
 *
 * `seoSettings` is public in full: the site renders the verification tags,
 * `customHeadHtml` and the knowledge graph itself, `robotsTxt` and `llmsTxt`
 * are served as files anyway, and nothing in the model is a secret.
 *
 * The site's address is kept here and nowhere else (prompt 51): a save writes
 * `siteUrl` into Site settings' read-only copy (`general.siteUrl`), so both
 * reads — and the lead e-mails that link to a listing — agree.
 */
class SeoSettingsController extends Controller
{
    /**
     * The two fields only an administrator may write: §9.3 renders them into
     * the head verbatim, so they are a script tag on every page of the site.
     */
    private const CUSTOM_HTML_FIELDS = ['customHeadHtml', 'customBodyEndHtml'];

    public function show(): JsonResponse
    {
        return Envelope::ok(CrudResource::object($this->current()));
    }

    public function update(Request $request): JsonResponse
    {
        $body = $this->body($request);
        $this->assertMayWriteCustomHtml($this->user($request)?->role, $this->current(), $body);

        $saved = DB::transaction(function () use ($request) {
            $saved = $this->store->saveSingleton(
                'seoSettings',
                SettingsMerge::apply($this->store->singleton('seoSettings'), $this->rawBody($request), 'seoSettings.update', 'seoSettings'),
            );
            $this->copySiteUrl($saved['siteUrl'] ?? null);

            return $saved;
        });
        ApiLog::info('seo', 'SEO settings saved', ['fields' => array_keys($body)]);

        return Envelope::ok($saved);
    }

    /**
     * A manager edits every other field of the SEO screen; what these two hold
     * runs in every visitor's browser, which is an administrator's decision.
     * A `PUT` carrying the stored value unchanged — what saving another tab of
     * the same form does — is not a change and goes through (`null` and `''`
     * both render nothing).
     */
    private function assertMayWriteCustomHtml(?string $role, array $stored, array $body): void
    {
        if ($role === null || $role === 'admin') {
            return;
        }
        $html = fn (mixed $value) => $value === null ? '' : Js::string($value);
        foreach (self::CUSTOM_HTML_FIELDS as $field) {
            if (array_key_exists($field, $body) && $html($body[$field]) !== $html($stored[$field] ?? null)) {
                ApiLog::info('seo', "Refused: a {$role} may not change {$field}");

                throw ApiException::forbidden('Only an administrator can change the custom head or body HTML.');
            }
        }
    }

    /** `seoSettings.siteUrl` written into `siteSettings.general.siteUrl`, its read-only copy. */
    private function copySiteUrl(mixed $siteUrl): void
    {
        $site = $this->store->singleton('siteSettings');
        if ($site === null || ! Js::isPlainObject($site['general'] ?? null) || in_array($siteUrl, [null, ''], true)) {
            return;
        }
        $general = Js::entries($site['general']);
        if (($general['siteUrl'] ?? null) === $siteUrl) {
            return;
        }
        $general['siteUrl'] = $siteUrl;
        $this->store->saveSingleton('siteSettings', [...$site, 'general' => $general]);
        ApiLog::info('seo', 'Copied siteUrl into the site settings', ['siteUrl' => $siteUrl]);
    }

    private function current(): array
    {
        return $this->store->singleton('seoSettings') ?? [];
    }
}
