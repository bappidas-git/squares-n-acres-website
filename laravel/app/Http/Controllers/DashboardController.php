<?php

namespace App\Http\Controllers;

use App\Domain\Dashboard\DashboardBuilder;
use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * `GET /admin/dashboard` (05_BUSINESS_RULES.md → "Dashboard"): one read, one
 * shape, every role — `dashboard.view` is all three. The aggregation is
 * App\Domain\Dashboard\DashboardBuilder's; this only decides **whose** lead
 * figures it covers (a sales user's scope) and how many days of trend
 * (`?range=7|30|90`, 30 otherwise).
 */
class DashboardController extends Controller
{
    public function show(Request $request, DashboardBuilder $dashboard): JsonResponse
    {
        $user = $this->userDocument($request);
        $range = $this->query($request)->first('range');
        $data = ApiLog::measure('dashboard', fn () => $dashboard->build($user, $range));
        ApiLog::debug('dashboard', "Built for {$user['role']} #{$user['id']}", ['range' => $range, 'leads' => $data['stats']['leadsTotal']]);

        return Envelope::ok($data);
    }
}
