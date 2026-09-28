<?php

use App\Http\Controllers\MediaFolderController;
use Illuminate\Support\Facades\Route;

/*
| The media library — 05_BUSINESS_RULES.md → "Media library". The list, CRUD
| and bulk (`delete`, `move`) are the CRUD engine's (App\Crud\Definitions\Media);
| a folder rename refiles records, so it is `media.edit`.
*/

Route::prefix('admin')->middleware('admin')->group(function () {
    Route::post('media/folders/rename', [MediaFolderController::class, 'rename']);
});
