<?php

namespace App\Http\Controllers;

use App\Domain\HeaderMenus\HeaderMenuRules;
use App\Support\Api\Envelope;
use App\Support\Query\Paginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * `GET /header-menus` — the header's active menus, left to right, with the
 * read-only `builtIn` flag. Unpaginated unless `page`/`perPage` ask: a header
 * is a whole header or it is wrong. The admin CRUD is the engine's
 * (App\Crud\Definitions\HeaderMenus).
 */
class HeaderMenuController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $this->query($request);
        [$rows, $meta] = Paginator::paginate(
            HeaderMenuRules::shown($this->store->all('headerMenus')),
            $query->first('page'),
            Paginator::positiveInt($query->first('perPage'), null),
        );

        return Envelope::list($rows, $meta);
    }
}
