/**
 * Careers (00_MASTER_CONTEXT.md §5.11, §5.14, §6.11; decision D12).
 *
 *   GET    /api/jobs                            open roles, newest first
 *   GET    /api/jobs/slug/:slug
 *   POST   /api/jobs/:id/apply                  throttled, honeypot, 201
 *   …plus the admin CRUD for openings and the triage of applications.
 *
 * "Open" is two conditions, not one: the opening is active **and** it has not
 * closed. A role whose `closesAt` has passed disappears from the list and
 * refuses applications with "This opening is closed." — which is the honest
 * answer to somebody who followed a link from a job board three weeks late.
 *
 * A résumé is a URL, never a file (D12): the form uploads to Cloudinary with
 * an unsigned preset when one is configured and otherwise asks for a link, so
 * no multipart body ever reaches the API — the mock's or Laravel's.
 */

const express = require('express');

const schemas = require('../../src/services/schemas');
const { embedJobApplication } = require('../lib/embed');
const { makeCrudRouter } = require('../lib/crud');
const { matchesQ } = require('../lib/filters');
const { nextId } = require('../lib/ids');
const { notFound } = require('../middleware/errors');
const { paginate, toPositiveInt, DEFAULT_PER_PAGE_PUBLIC } = require('../lib/paginate');
const { rateLimit } = require('../middleware/rateLimit');
const { sortItems } = require('../lib/sort');
const { validateBody } = require('../middleware/validate');

/** §5.11: ten submissions a minute per IP, on every public write. */
const SUBMISSIONS_PER_MINUTE = 10;

/** What a closed opening answers, whichever way it is reached (§7). */
const CLOSED_MESSAGE = 'This opening is closed.';

const first = (value) => (Array.isArray(value) ? value[0] : value);

const sameId = (left, right) => String(left) === String(right);

/**
 * Whether an opening still accepts applications.
 *
 * `closesAt` is a date, so the day it names is the last day the role is open.
 *
 * @param {object} job
 * @param {number} [now]
 * @returns {boolean}
 */
function isOpen(job, now = Date.now()) {
  if (!job || !job.isActive) return false;
  if (!job.closesAt) return true;

  const closes = Date.parse(`${String(job.closesAt).slice(0, 10)}T23:59:59.999Z`);
  return !Number.isFinite(closes) || closes >= now;
}

/**
 * The careers router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();

  const jobs = () => db.getCollection('jobOpenings');
  const applications = () => db.getCollection('jobApplications');

  /* ---------------------------------------------------------------- *
   * Public
   * ---------------------------------------------------------------- */

  router.get('/jobs', (req, res) => {
    const open = jobs().filter((job) => isOpen(job));
    const department = first(req.query.department);
    const q = first(req.query.q);

    const matching = open
      .filter((job) => (department ? job.department === department : true))
      .filter((job) => matchesQ(job, ['title', 'department', 'location'], q ?? ''));

    const sorted = sortItems(matching, 'postedAt', 'desc');
    const { data, meta } = paginate(sorted, {
      page: first(req.query.page),
      perPage: toPositiveInt(first(req.query.perPage), DEFAULT_PER_PAGE_PUBLIC),
    });

    res.ok(
      data.map((job) => ({ ...job })),
      meta
    );
  });

  router.get('/jobs/slug/:slug', (req, res, next) => {
    // An active opening stays readable after it closes, so a bookmarked link
    // shows the role and says it is closed rather than answering 404.
    const job = jobs().find((row) => row.slug === req.params.slug && row.isActive);
    if (!job) {
      next(notFound());
      return;
    }

    res.ok({ ...job, isOpen: isOpen(job) });
  });

  router.post('/jobs/:id/apply', rateLimit({ max: SUBMISSIONS_PER_MINUTE }), (req, res, next) => {
    try {
      const body = { ...(req.body ?? {}) };

      // The honeypot is invisible to a human, so anything in it is a robot
      // (§5.11); the answer is the same one a person gets.
      if (typeof body.website === 'string' && body.website.trim() !== '') {
        res.message('ok');
        return;
      }

      const job = jobs().find((row) => sameId(row.id, req.params.id));
      if (!job) throw notFound();
      if (!isOpen(job)) throw notFound(CLOSED_MESSAGE);

      validateBody(schemas.getSchema('jobApplication.create'), body, { fillDefaults: true });

      const now = new Date().toISOString();
      const record = {
        id: nextId(applications()),
        jobId: job.id,
        name: body.name,
        email: body.email,
        phone: body.phone,
        resumeUrl: body.resumeUrl,
        coverLetter: body.coverLetter ?? null,
        linkedinUrl: body.linkedinUrl ?? null,
        status: 'new',
        notes: null,
        createdAt: now,
        updatedAt: now,
      };

      applications().push(record);
      db.write();

      res.created(record);
    } catch (error) {
      next(error);
    }
  });

  /* ---------------------------------------------------------------- *
   * Admin
   * ---------------------------------------------------------------- */

  router.use(
    makeCrudRouter({
      db,
      model: getModel('jobOpenings'),
      basePath: 'jobs',
      schema: 'job',
      // The public list above applies the "open" rule the generic scope cannot.
      publicPath: false,
      collections: ['jobApplications'],
      afterRead: (job, { admin, collections }) =>
        admin
          ? {
              ...job,
              applicationCount: (collections.jobApplications ?? []).filter((application) =>
                sameId(application.jobId, job.id)
              ).length,
            }
          : { ...job },
      adminFilters: { department: { field: 'department' } },
      sorts: { postedAt: '-postedAt', title: 'title', department: 'department,title' },
      defaultSort: 'postedAt',
      deleteGuard: 'job',
      noun: { one: 'opening', many: 'openings' },
    })
  );

  router.use(
    makeCrudRouter({
      db,
      model: getModel('jobApplications'),
      basePath: 'job-applications',
      schema: 'jobApplication',
      // An application arrives from the public form and is then triaged: the
      // contract has a list, a `PATCH` and a `DELETE`, and nothing else.
      routes: ['adminList', 'patch', 'remove'],
      publicPath: false,
      slugged: false,
      collections: ['jobOpenings'],
      afterRead: (application, { collections }) => embedJobApplication(application, collections),
      adminFilters: {
        jobId: { field: 'jobId' },
        status: { field: 'status', type: 'csv' },
      },
      sorts: { createdAt: '-createdAt', status: 'status', name: 'name' },
      defaultSort: 'createdAt',
      noun: { one: 'application', many: 'applications' },
    })
  );

  return router;
};

module.exports.isOpen = isOpen;
module.exports.CLOSED_MESSAGE = CLOSED_MESSAGE;
