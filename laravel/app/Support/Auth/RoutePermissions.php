<?php

namespace App\Support\Auth;

/**
 * From an admin path to a permission (02_AUTH_AND_RBAC.md → "Admin routes").
 *
 * The role matrix speaks in areas and actions (`properties.edit`), HTTP in
 * paths and methods; this is the translation, and it is what lets one
 * middleware guard every `/api/admin/*` route:
 *
 *   GET    /admin/properties        → properties.view
 *   POST   /admin/properties        → properties.create
 *   PUT    /admin/properties/1      → properties.edit
 *   DELETE /admin/properties/1      → properties.delete
 *   POST   /admin/properties/bulk   → properties.bulk
 *   GET    /admin/leads/export      → leads.export
 *   POST   /admin/leads/7/notes     → leads.edit
 *
 * A path it does not know resolves to null and is refused with 403: an admin
 * route without a declared permission is denied rather than served.
 */
final class RoutePermissions
{
    private const METHOD_ACTIONS = [
        'GET' => 'view',
        'HEAD' => 'view',
        'POST' => 'create',
        'PUT' => 'edit',
        'PATCH' => 'edit',
        'DELETE' => 'delete',
    ];

    /** Path segments that name the action themselves; the last one wins. */
    private const SEGMENT_ACTIONS = [
        'bulk' => 'bulk',
        'export' => 'export',
        'duplicate' => 'duplicate',
        'check-slug' => 'create',
        'notes' => 'edit',
        'claim' => 'edit',
        'rename' => 'edit',
        'preview-token' => 'edit',
    ];

    /** What an action falls back to when an area does not declare it. */
    private const ACTION_FALLBACKS = [
        'view' => ['view'],
        'create' => ['create', 'edit', 'view'],
        'edit' => ['edit', 'view'],
        'delete' => ['delete', 'edit', 'view'],
        'bulk' => ['bulk', 'edit', 'view'],
        'export' => ['export', 'view'],
        'duplicate' => ['duplicate', 'create', 'edit', 'view'],
    ];

    /** Areas whose GET is not the area's `view`: the staff directory is what naming an assignee needs. */
    private const READ_ACTIONS = ['users' => 'list'];

    /** The area each admin resource belongs to, by its first path segment. */
    public const RESOURCE_AREAS = [
        'dashboard' => 'dashboard',
        'properties' => 'properties',
        'localities' => 'masterData',
        'cities' => 'masterData',
        'segments' => 'masterData',
        'property-types' => 'masterData',
        'propertyTypes' => 'masterData',
        'amenities' => 'masterData',
        'badges' => 'masterData',
        'developers' => 'masterData',
        'banks' => 'masterData',
        'articles' => 'articles',
        'article-categories' => 'articles',
        'articleCategories' => 'articles',
        'article-tags' => 'articles',
        'articleTags' => 'articles',
        'authors' => 'articles',
        'pages' => 'content',
        'header-menus' => 'content',
        'headerMenus' => 'content',
        'faqs' => 'content',
        'testimonials' => 'content',
        'team' => 'content',
        'teamMembers' => 'content',
        'partners' => 'content',
        'jobs' => 'content',
        'jobOpenings' => 'content',
        'job-applications' => 'content',
        'jobApplications' => 'content',
        'newsletter-subscribers' => 'content',
        'newsletterSubscribers' => 'content',
        'seo' => 'seo',
        'seoSettings' => 'seo',
        'redirects' => 'seo',
        'media' => 'media',
        'settings' => 'settings',
        'siteSettings' => 'settings',
        'users' => 'users',
        'leads' => 'leads',
    ];

    /**
     * The permission an admin request needs.
     *
     * @param  string  $path  the path below `/api/admin`, e.g. `/properties/1`
     * @return array{area: string, action: string}|null
     */
    public static function resolve(string $path, string $method): ?array
    {
        $segments = array_values(array_filter(explode('/', $path), fn (string $segment) => $segment !== ''));
        if ($segments === []) {
            return null;
        }
        $area = self::RESOURCE_AREAS[$segments[0]] ?? null;
        if ($area === null) {
            return null;
        }

        $named = null;
        foreach (array_slice($segments, 1) as $segment) {
            $named = self::SEGMENT_ACTIONS[$segment] ?? $named;
        }

        $verb = strtoupper($method);
        $read = in_array($verb, ['GET', 'HEAD'], true) ? (self::READ_ACTIONS[$area] ?? null) : null;
        $action = $named ?? $read ?? self::METHOD_ACTIONS[$verb] ?? 'view';

        return ['area' => $area, 'action' => self::resolveAction($area, $action)];
    }

    private static function declares(string $area, string $action): bool
    {
        $permissions = Rbac::PERMISSIONS[$area] ?? null;

        return $permissions !== null && (isset($permissions[$action]) || isset($permissions['*']));
    }

    private static function resolveAction(string $area, string $action): string
    {
        foreach (self::ACTION_FALLBACKS[$action] ?? [$action, 'view'] as $candidate) {
            if (self::declares($area, $candidate)) {
                return $candidate;
            }
        }

        return $action;
    }
}
