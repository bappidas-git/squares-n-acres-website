<?php

namespace App\Http\Controllers;

use App\Http\Middleware\ParseJsonBody;
use App\Models\AdminUser;
use App\Store\DocumentStore;
use App\Support\Js;
use App\Support\Query\QueryParams;
use Illuminate\Http\Request;

/**
 * The base of every controller of the API: the request's JSON body as the
 * contract means it (`{}` kept apart from `[]`, App\Http\Middleware\ParseJsonBody),
 * its query string as a list-aware reader (App\Support\Query\QueryParams),
 * the signed-in user, and the document store.
 */
abstract class Controller
{
    public function __construct(protected DocumentStore $store) {}

    /** The JSON body as an object's entries; `[]` when there is none. */
    protected function body(Request $request): array
    {
        $body = $request->attributes->get(ParseJsonBody::ATTRIBUTE);

        return Js::isPlainObject($body) ? Js::entries($body) : [];
    }

    /** The decoded JSON body as sent: an object, a list, or null. */
    protected function rawBody(Request $request): mixed
    {
        return $request->attributes->get(ParseJsonBody::ATTRIBUTE);
    }

    protected function query(Request $request): QueryParams
    {
        return $request->attributes->get('queryParams')
            ?? tap(QueryParams::fromRequest($request), fn (QueryParams $query) => $request->attributes->set('queryParams', $query));
    }

    protected function user(Request $request): ?AdminUser
    {
        $user = $request->user();

        return $user instanceof AdminUser ? $user : null;
    }

    /** The signed-in user as the API describes one (`adminUsers` document). */
    protected function userDocument(Request $request): ?array
    {
        $user = $this->user($request);

        return $user === null ? null : $this->store->find('adminUsers', $user->getKey());
    }
}
