<?php

namespace App\Support\Auth;

/**
 * The role matrix (02_AUTH_AND_RBAC.md → "The role matrix"), a port of
 * `PERMISSIONS` in the website's `src/config/rbac.js`: the admin panel asks
 * `can('leads', 'export')`, and the API must answer the same question for the
 * request it is serving. Routes name the permission they need with the
 * `permission:<area>,<action>` middleware.
 */
final class Rbac
{
    public const ADMIN = 'admin';

    public const MANAGER = 'manager';

    public const SALES = 'sales';

    public const ROLES = [self::ADMIN, self::MANAGER, self::SALES];

    private const ALL = [self::ADMIN, self::MANAGER, self::SALES];

    private const ADMIN_MANAGER = [self::ADMIN, self::MANAGER];

    private const ADMIN_ONLY = [self::ADMIN];

    /** `area → action → roles`; `*` is the fallback for every action of an area. */
    public const PERMISSIONS = [
        'dashboard' => ['view' => self::ALL],
        'properties' => [
            'view' => self::ALL,
            'create' => self::ADMIN_MANAGER,
            'edit' => self::ADMIN_MANAGER,
            'delete' => self::ADMIN_MANAGER,
            'bulk' => self::ADMIN_MANAGER,
            'duplicate' => self::ADMIN_MANAGER,
        ],
        'masterData' => [
            'view' => self::ADMIN_MANAGER,
            'create' => self::ADMIN_MANAGER,
            'edit' => self::ADMIN_MANAGER,
            'delete' => self::ADMIN_MANAGER,
        ],
        'leads' => [
            'view' => self::ALL,
            'edit' => self::ALL,
            'claim' => [self::SALES],
            'assign' => self::ADMIN_MANAGER,
            'delete' => self::ADMIN_MANAGER,
            'bulk' => self::ADMIN_MANAGER,
            'export' => self::ALL,
        ],
        'articles' => [
            'view' => self::ADMIN_MANAGER,
            'create' => self::ADMIN_MANAGER,
            'edit' => self::ADMIN_MANAGER,
            'delete' => self::ADMIN_MANAGER,
            'bulk' => self::ADMIN_MANAGER,
        ],
        'content' => [
            'view' => self::ADMIN_MANAGER,
            'create' => self::ADMIN_MANAGER,
            'edit' => self::ADMIN_MANAGER,
            'delete' => self::ADMIN_MANAGER,
            'bulk' => self::ADMIN_MANAGER,
        ],
        'seo' => [
            'view' => self::ADMIN_MANAGER,
            'create' => self::ADMIN_MANAGER,
            'edit' => self::ADMIN_MANAGER,
            'delete' => self::ADMIN_MANAGER,
            'bulk' => self::ADMIN_MANAGER,
        ],
        'media' => [
            'view' => self::ADMIN_MANAGER,
            'create' => self::ADMIN_MANAGER,
            'edit' => self::ADMIN_MANAGER,
            'delete' => self::ADMIN_MANAGER,
            'bulk' => self::ADMIN_MANAGER,
        ],
        'settings' => [
            'view' => self::ADMIN_MANAGER,
            'edit' => self::ADMIN_ONLY,
        ],
        'users' => [
            // Reading the directory is what naming an assignee needs.
            'list' => self::ADMIN_MANAGER,
            '*' => self::ADMIN_ONLY,
        ],
        'profile' => ['*' => self::ALL],
    ];

    public static function can(?string $role, string $area, string $action): bool
    {
        if ($role === null) {
            return false;
        }
        $permissions = self::PERMISSIONS[$area] ?? null;
        if ($permissions === null) {
            return false;
        }
        $allowed = $permissions[$action] ?? $permissions['*'] ?? [];

        return in_array($role, $allowed, true);
    }
}
