<?php

namespace App\Crud\Definitions;

use App\Contract\Contract;
use App\Domain\Careers\Openings;
use App\Domain\Embed;

/**
 * Careers in the panel (01_API_CONTRACT.md §5.14; the mock's `routes/jobs.js`):
 * the admin CRUD of the openings, and the triage of the applications the
 * public form files. The public side — the open roles, a role by slug, the
 * application form — is App\Http\Controllers\JobController, because "open"
 * is a rule the generic public scope cannot state.
 */
final class Jobs
{
    /** @return array<string, array> resource key → CrudResource options */
    public static function definitions(): array
    {
        return [
            'jobOpenings' => [
                'collection' => 'jobOpenings',
                'basePath' => 'jobs',
                'schema' => 'job',
                'publicPath' => false,
                'noun' => ['one' => 'opening', 'many' => 'openings'],
                // An opening with applications keeps them: the delete is refused while any names it.
                'deleteGuard' => 'job',
                // The panel's Applications column.
                'afterRead' => fn (array $job, array $ctx) => $ctx['admin']
                    ? [...$job, 'applicationCount' => (new Openings($ctx['store']))->applicationCount($job['id'])]
                    : $job,
                // The list's "Type" select sends `employmentType`, several at once.
                'adminFilters' => [
                    'department' => ['field' => 'department'],
                    'employmentType' => ['field' => 'employmentType', 'type' => 'csv'],
                ],
                'sorts' => ['postedAt' => '-postedAt', 'title' => 'title', 'department' => 'department,title'],
                'defaultSort' => 'postedAt',
                // "Sales " was stored beside "Sales", and the department filter offered both (QA-61).
                'trimStrings' => true,
                'beforeSave' => [Openings::class, 'check'](...),
                // A form opened before somebody else's save is refused, not replayed over it.
                'staleGuard' => 'job opening',
            ],

            'jobApplications' => [
                'collection' => 'jobApplications',
                'basePath' => 'job-applications',
                'schema' => 'jobApplication',
                // Filed by the public form, then triaged: a list, a PATCH and a DELETE, nothing else.
                'routes' => ['adminList', 'patch', 'remove'],
                'publicPath' => false,
                'slugged' => false,
                'noun' => ['one' => 'application', 'many' => 'applications'],
                'afterRead' => fn (array $application, array $ctx) => (new Embed($ctx['store']))->jobApplication($application),
                'adminFilters' => [
                    'jobId' => ['field' => 'jobId'],
                    'status' => ['field' => 'status', 'type' => 'csv'],
                ],
                'sorts' => [
                    'createdAt' => '-createdAt',
                    // Where somebody stands, in the order the desk moves them — new,
                    // shortlisted, interview, rejected, hired — newest first within
                    // a status; by spelling it read Hired, Interview, New… (QA-61).
                    'status' => [
                        'spec' => 'status,-createdAt',
                        'rank' => ['status' => Contract::enumValues('JOB_APPLICATION_STATUS')],
                    ],
                    'name' => 'name',
                ],
                'defaultSort' => 'createdAt',
            ],
        ];
    }
}
