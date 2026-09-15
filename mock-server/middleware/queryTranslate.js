/**
 * Query translation for the generic router (00_MASTER_CONTEXT.md §5.6, §10).
 *
 * The contract's vocabulary is `page` / `perPage` / `sort` / `order` / `q`;
 * JSON Server's is `_page` / `_limit` / `_sort` / `_order` / `q`. This is the
 * adapter between them — and the place where the rules that make the two
 * comparable live: `perPage` is capped at 100, `perPage=all` is admin-only,
 * a comma-separated value becomes repeated parameters, and a parameter the
 * collection has no field for is dropped rather than passed on (§5.6,
 * "unknown params are ignored").
 */

const { inCsv } = require('../lib/filters');
const {
  DEFAULT_PER_PAGE_ADMIN,
  DEFAULT_PER_PAGE_PUBLIC,
  MAX_PER_PAGE,
  toPositiveInt,
} = require('../lib/paginate');

/** Parameters this middleware owns; everything else must name a model field. */
const CONTROL_PARAMS = ['page', 'perPage', 'sort', 'order', 'q'];

/** JSON Server's comparison operators, which may follow a field name. */
const OPERATOR_RE = /(_lte|_gte|_ne|_like)$/;

/** The field a parameter filters on: `pricing.price_gte` → `pricing`. */
const baseField = (param) => param.replace(OPERATOR_RE, '').split('.')[0];

const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

/**
 * Builds the translation middleware.
 *
 * @param {{getModel: Function}} deps
 * @returns {import('express').RequestHandler}
 */
function queryTranslate({ getModel }) {
  return (req, res, next) => {
    const segments = req.path.split('/').filter(Boolean);
    const model = segments.length >= 1 ? getModel(segments[0]) : null;

    if (req.method !== 'GET' || segments.length !== 1 || !model || model.singleton) {
      next();
      return;
    }

    const isAdmin = Boolean(res.locals.admin);
    const query = req.query;
    const control = Object.fromEntries(
      CONTROL_PARAMS.map((param) => [param, firstValue(query[param])])
    );

    for (const param of Object.keys(query)) {
      if (CONTROL_PARAMS.includes(param)) delete query[param];
      else if (!model.fields[baseField(param)]) delete query[param];
      else if (String(query[param]).includes(',')) query[param] = inCsv(query[param]);
    }

    if (control.q !== undefined && String(control.q) !== '') query.q = String(control.q);

    // `perPage=all` returns the whole collection, and only on an admin route.
    if (String(control.perPage) === 'all' && isAdmin) {
      res.locals.query = { page: 1, perPage: null };
      next();
      return;
    }

    const perPage = Math.min(
      toPositiveInt(control.perPage, isAdmin ? DEFAULT_PER_PAGE_ADMIN : DEFAULT_PER_PAGE_PUBLIC),
      MAX_PER_PAGE
    );
    const page = toPositiveInt(control.page, 1);

    query._page = String(page);
    query._limit = String(perPage);

    if (control.sort && model.fields[baseField(String(control.sort))]) {
      query._sort = String(control.sort);
      query._order = String(control.order).toLowerCase() === 'desc' ? 'desc' : 'asc';
    }

    res.locals.query = { page, perPage };
    next();
  };
}

module.exports = { queryTranslate, CONTROL_PARAMS };
