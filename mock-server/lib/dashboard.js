/**
 * The admin dashboard (00_MASTER_CONTEXT.md §6.16).
 *
 * One request answers the whole landing page: the counters, four trend series,
 * the ten newest leads, the five best-performing listings, the site's SEO
 * health and the follow-ups that are due. Computing it in one place means the
 * dashboard cannot disagree with itself — the "leads this month" tile and the
 * last bar of the `leadsByDay` chart are the same arithmetic.
 *
 * **Scope (D15).** For a sales user every lead figure — the counters, the
 * trends, the recent list, the follow-ups — covers the leads assigned to them
 * and the ones nobody has taken. Property, article and SEO figures are the
 * whole site's: they are not somebody's to own.
 *
 * Dates are compared as **UTC calendar days**, the same rule the lead list's
 * `from`/`to` filters use (D96), so a tile and a filtered list agree.
 */

const { LEAD_STATUS } = require('./enums');
const { isLive } = require('./articleFilters');
const { scopeLeads } = require('./scope');

/** How many days the `leadsByDay` and `viewsByDay` series cover (§6.16). */
const TREND_DAYS = 30;

/** How many rows each list of the dashboard carries (§6.16). */
const RECENT_LEADS = 10;
const TOP_PROPERTIES = 5;
const FOLLOW_UPS = 10;

/** How far ahead `upcomingFollowUps` looks (§4.9 of this prompt). */
const FOLLOW_UP_DAYS = 14;

/** An enquiry is worth five views when ranking a listing (§4.9). */
const ENQUIRY_WEIGHT = 5;

/** The collections holding a `seo` object the health summary reads (§4.9). */
const SEO_COLLECTIONS = ['properties', 'articles', 'pages', 'localities', 'developers'];

/** The lead statuses a follow-up reminder is pointless for. */
const CLOSED_STATUSES = new Set(['lost', 'converted']);

const rows = (state, name) => (Array.isArray(state?.[name]) ? state[name] : []);

/** The UTC calendar day of a timestamp, `yyyy-mm-dd`. */
const dayOf = (value) => {
  const moment = value ? new Date(value) : null;
  return moment && !Number.isNaN(moment.getTime()) ? moment.toISOString().slice(0, 10) : null;
};

/** The UTC month of a timestamp, `yyyy-mm`. */
const monthOf = (value) => dayOf(value)?.slice(0, 7) ?? null;

/** The `yyyy-mm` that is `offset` months before `reference`. */
function shiftMonth(reference, offset) {
  const moment = new Date(reference);
  moment.setUTCDate(1);
  moment.setUTCMonth(moment.getUTCMonth() + offset);
  return moment.toISOString().slice(0, 7);
}

/** The last `days` UTC calendar days, oldest first, ending on `now`. */
function dayRange(now, days = TREND_DAYS) {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - (days - 1 - index));
    return day.toISOString().slice(0, 10);
  });
}

/** `[{ date, count }]` over `dayRange`, counting `records` by `field`'s day. */
function seriesByDay(records, field, now) {
  const counts = new Map();
  for (const record of records) {
    const day = dayOf(record?.[field]);
    if (day) counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return dayRange(now).map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

/** `[{ <key>, count }]` — one entry per value of `field`, biggest first. */
function countBy(records, field, key) {
  const counts = new Map();
  for (const record of records) {
    const value = record?.[field] ?? null;
    if (value === null) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts]
    .map(([value, count]) => ({ [key]: value, count }))
    .sort((left, right) => right.count - left.count);
}

/** A percentage with one decimal, and 0 rather than NaN for an empty set. */
const percentage = (part, whole) => (whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10);

/**
 * The SEO health summary: how much of the site has been analysed, and how the
 * analysed part scored (§6.16).
 */
function seoHealth(state) {
  const records = SEO_COLLECTIONS.flatMap((name) => rows(state, name));
  const scores = records
    .map((record) => record?.seo?.score)
    .filter((score) => typeof score === 'number' && Number.isFinite(score));

  const band = (name) =>
    records.filter((record) => (record?.seo?.scoreBand ?? 'none') === name).length;

  const missing = (field) =>
    records.filter((record) => {
      const value = record?.seo?.[field];
      return typeof value !== 'string' || value.trim() === '';
    }).length;

  return {
    averageScore:
      scores.length === 0
        ? 0
        : Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10,
    good: band('good'),
    ok: band('ok'),
    poor: band('poor'),
    missingFocusKeyword: missing('focusKeyword'),
    missingMetaDescription: missing('description'),
  };
}

/**
 * The whole `GET /admin/dashboard` payload.
 *
 * @param {object} state the collections (`{ properties: [...], leads: [...] }`)
 * @param {{user?: object, now?: number}} [options]
 * @returns {object} the §6.16 shape
 */
function buildDashboard(state, { user = null, now = Date.now() } = {}) {
  const properties = rows(state, 'properties');
  const articles = rows(state, 'articles');
  const views = rows(state, 'propertyViews');
  const subscribers = rows(state, 'newsletterSubscribers');
  const users = rows(state, 'adminUsers');

  // Everything below this line that says "lead" means "lead this user may see".
  const leads = scopeLeads(rows(state, 'leads'), user);

  const today = dayOf(now);
  const thisMonth = monthOf(now);
  const lastMonth = shiftMonth(now, -1);

  const inMonth = (records, field, month) =>
    records.filter((record) => monthOf(record?.[field]) === month);

  const converted = leads.filter((lead) => lead.status === 'converted').length;

  const stats = {
    propertiesTotal: properties.length,
    propertiesActive: properties.filter((property) => property.isActive).length,
    propertiesFeatured: properties.filter((property) => property.isFeatured).length,
    propertiesInactive: properties.filter((property) => !property.isActive).length,
    leadsTotal: leads.length,
    leadsNew: leads.filter((lead) => lead.status === 'new').length,
    leadsToday: leads.filter((lead) => dayOf(lead.createdAt) === today).length,
    leadsThisMonth: inMonth(leads, 'createdAt', thisMonth).length,
    leadsLastMonth: inMonth(leads, 'createdAt', lastMonth).length,
    conversionRate: percentage(converted, leads.length),
    articlesPublished: articles.filter((article) => isLive(article, now)).length,
    articlesDraft: articles.filter((article) => article.status === 'draft').length,
    viewsThisMonth: inMonth(views, 'viewedAt', thisMonth).length,
    // An enquiry is a lead that names a listing: the other sources are
    // assistance requests, which belong to the funnel but not to a property.
    enquiriesThisMonth: inMonth(leads, 'createdAt', thisMonth).filter(
      (lead) => lead.propertyId !== null && lead.propertyId !== undefined
    ).length,
    subscribers: subscribers.filter((row) => row.status === 'subscribed').length,
  };

  const trends = {
    leadsByDay: seriesByDay(leads, 'createdAt', now),
    leadsBySource: countBy(leads, 'source', 'source'),
    // Every status of the pipeline appears, including the ones nobody is in:
    // a funnel chart with a missing rung is a chart that lies.
    leadsByStatus: LEAD_STATUS.values.map((status) => ({
      status,
      count: leads.filter((lead) => lead.status === status).length,
    })),
    viewsByDay: seriesByDay(views, 'viewedAt', now),
  };

  const titleOf = (id) => properties.find((property) => property.id === id) ?? null;
  const nameOf = (id) => users.find((row) => row.id === id)?.name ?? null;

  const recentLeads = leads
    .slice()
    .sort((left, right) => Date.parse(right.createdAt ?? 0) - Date.parse(left.createdAt ?? 0))
    .slice(0, RECENT_LEADS)
    .map((lead) => {
      const property = titleOf(lead.propertyId);
      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        propertyId: lead.propertyId ?? null,
        property: property ? { id: property.id, title: property.title, slug: property.slug } : null,
        createdAt: lead.createdAt,
        assignedTo: lead.assignedTo ?? null,
      };
    });

  const topProperties = properties
    .slice()
    .sort(
      (left, right) =>
        (right.viewCount ?? 0) +
        (right.enquiryCount ?? 0) * ENQUIRY_WEIGHT -
        ((left.viewCount ?? 0) + (left.enquiryCount ?? 0) * ENQUIRY_WEIGHT)
    )
    .slice(0, TOP_PROPERTIES)
    .map((property) => ({
      id: property.id,
      title: property.title,
      slug: property.slug,
      viewCount: property.viewCount ?? 0,
      enquiryCount: property.enquiryCount ?? 0,
    }));

  const horizon = now + FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000;
  const upcomingFollowUps = leads
    .filter((lead) => {
      if (CLOSED_STATUSES.has(lead.status)) return false;
      const due = lead.followUpAt ? Date.parse(lead.followUpAt) : NaN;
      return Number.isFinite(due) && due >= now && due <= horizon;
    })
    .sort((left, right) => Date.parse(left.followUpAt) - Date.parse(right.followUpAt))
    .slice(0, FOLLOW_UPS)
    .map((lead) => ({
      id: lead.id,
      name: lead.name,
      followUpAt: lead.followUpAt,
      status: lead.status,
      assignedTo: lead.assignedTo ?? null,
      assignedUser: lead.assignedTo === null ? null : nameOf(lead.assignedTo),
    }));

  return {
    stats,
    trends,
    recentLeads,
    topProperties,
    seoHealth: seoHealth(state),
    upcomingFollowUps,
  };
}

module.exports = {
  buildDashboard,
  seoHealth,
  dayRange,
  seriesByDay,
  countBy,
  TREND_DAYS,
  SEO_COLLECTIONS,
};
