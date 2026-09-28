<?php

namespace App\Http\Middleware;

use App\Support\Api\ApiException;
use App\Support\Auth\Rbac;
use App\Support\Auth\RoutePermissions;
use App\Support\Debug\ApiLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The role matrix, enforced on every `/api/admin/*` route
 * (02_AUTH_AND_RBAC.md → "The role matrix").
 *
 * The permission is derived from the path and the method
 * (App\Support\Auth\RoutePermissions), so a new admin route is covered before
 * anyone writes a rule for it — and a path with no rule is refused:
 *
 *   403 "You do not have permission to perform this action."
 *
 * A route may still name its permission explicitly with
 * `permission:<area>,<action>`, which is checked instead.
 */
final class AdminPermission
{
    public function handle(Request $request, Closure $next, ?string $area = null, ?string $action = null): Response
    {
        $user = $request->user();
        if ($user === null) {
            throw ApiException::unauthorized();
        }

        $permission = $area !== null && $action !== null
            ? ['area' => $area, 'action' => $action]
            : RoutePermissions::resolve((string) preg_replace('~^api/admin~', '', $request->path()), $request->method());

        if ($permission === null || ! Rbac::can($user->role, $permission['area'], $permission['action'])) {
            ApiLog::info('rbac', 'Refused', [
                'role' => $user->role,
                'permission' => $permission === null ? 'no rule for this path' : "{$permission['area']}.{$permission['action']}",
            ]);

            throw ApiException::forbidden();
        }

        $request->attributes->set('permission', $permission);

        return $next($request);
    }
}
