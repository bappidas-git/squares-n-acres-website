<?php

namespace App\Http\Controllers;

use App\Domain\Media\MediaFolders;
use App\Support\Api\Envelope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * `POST /admin/media/folders/rename { from, to, merge? }` (05_BUSINESS_RULES.md
 * → "Media library", prompt 51): refiles every record of a folder and of the
 * folders inside it, and answers `{ from, to, moved, merged }` with the
 * sentence the library shows. The rest of the library is the CRUD engine's
 * (App\Crud\Definitions\Media).
 */
class MediaFolderController extends Controller
{
    public function rename(Request $request): JsonResponse
    {
        $result = MediaFolders::rename($this->store, $this->body($request));
        $noun = $result['moved'] === 1 ? 'file' : 'files';

        return Envelope::message(
            $result['merged']
                ? "Merged {$result['moved']} {$noun} from “{$result['from']}” into “{$result['to']}”."
                : "Moved {$result['moved']} {$noun} from “{$result['from']}” to “{$result['to']}”.",
            $result,
        );
    }
}
