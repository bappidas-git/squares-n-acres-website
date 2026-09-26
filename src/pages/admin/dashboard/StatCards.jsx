import { Icon } from '@iconify/react';

import PATHS from '../../../routes/paths';
import StatCard from '../../../components/ui/StatCard';
import { formatNumber, istToday } from '../../../utils/format';

import styles from './DashboardPage.module.css';

/**
 * The counters at the top of the dashboard (§6.16 `stats`).
 *
 * Every number here is one the API computed over the whole collection — the
 * old dashboard fetched three collections and recomputed them in the browser
 * (NEW-24) and printed "+12 %" beside them whatever they said (BUG-11). The
 * one comparison on the screen is arithmetic on two figures the response
 * actually carries: this month against last.
 *
 * A sales user's lead figures are their own and the unassigned ones (D15) —
 * the server scopes them, and the subtitle says so rather than pretending the
 * desk is the company.
 *
 * @param {object} props
 * @param {object} props.stats
 * @param {boolean} [props.scoped] true for the sales role
 * @param {boolean} [props.showContent] articles and subscribers (§7)
 * @param {boolean} [props.showProperties] whether the role may open the property list
 */
export default function StatCards({
  stats = {},
  scoped = false,
  showContent = true,
  showProperties = true,
}) {
  const leadHint = scoped ? 'Your leads' : undefined;
  // Every lead number opens the leads it counts (prompt 51); the days are IST's.
  const today = istToday();
  const leads = (query) => `${PATHS.adminLeads}${query ? `?${query}` : ''}`;

  const cards = [
    {
      key: 'properties',
      label: 'Properties',
      value: formatNumber(stats.propertiesTotal),
      icon: 'mdi:home-city-outline',
      hint: `${formatNumber(stats.propertiesActive)} live · ${formatNumber(stats.propertiesFeatured)} featured · ${formatNumber(stats.propertiesInactive)} inactive`,
      to: showProperties ? PATHS.adminProperties : undefined,
    },
    {
      key: 'leadsTotal',
      label: 'Leads',
      value: formatNumber(stats.leadsTotal),
      icon: 'mdi:account-multiple-outline',
      hint: leadHint,
      to: leads(),
    },
    {
      key: 'leadsNew',
      label: 'New leads',
      value: formatNumber(stats.leadsNew),
      icon: 'mdi:new-box',
      hint: leadHint ?? 'Not yet contacted',
      to: leads('status=new'),
    },
    {
      key: 'leadsToday',
      label: 'Leads today',
      value: formatNumber(stats.leadsToday),
      icon: 'mdi:calendar-today-outline',
      hint: leadHint,
      to: leads(`from=${today}&to=${today}`),
    },
    {
      key: 'leadsThisMonth',
      label: 'Leads this month',
      value: formatNumber(stats.leadsThisMonth),
      icon: 'mdi:calendar-month-outline',
      hint: `${formatNumber(stats.leadsLastMonth)} last month`,
      trend: deltaOf(stats.leadsThisMonth, stats.leadsLastMonth),
      to: leads(`from=${today.slice(0, 8)}01`),
    },
    {
      key: 'conversionRate',
      label: 'Conversion rate',
      value: `${formatNumber(stats.conversionRate, { maximumFractionDigits: 1 })}%`,
      icon: 'mdi:trending-up',
      hint: leadHint ?? 'Converted out of every lead',
    },
    {
      key: 'enquiriesThisMonth',
      label: 'Enquiries this month',
      value: formatNumber(stats.enquiriesThisMonth),
      icon: 'mdi:message-question-outline',
      hint: leadHint ?? 'Leads that name a listing',
    },
    {
      key: 'viewsThisMonth',
      label: 'Views this month',
      value: formatNumber(stats.viewsThisMonth),
      icon: 'mdi:eye-outline',
      hint: 'Listing pages opened',
    },
  ];

  if (showContent) {
    cards.push(
      {
        key: 'articles',
        label: 'Articles published',
        value: formatNumber(stats.articlesPublished),
        icon: 'mdi:post-outline',
        hint: `${formatNumber(stats.articlesDraft)} in draft`,
      },
      {
        key: 'subscribers',
        label: 'Subscribers',
        value: formatNumber(stats.subscribers),
        icon: 'mdi:email-newsletter',
        hint: 'Newsletter, confirmed',
      }
    );
  }

  return (
    <div className={styles.statGrid}>
      {cards.map((card) => (
        <StatCard
          key={card.key}
          role="group"
          aria-label={card.label}
          label={card.label}
          value={card.value}
          hint={card.hint}
          trend={card.trend}
          to={card.to}
          icon={<Icon icon={card.icon} width="22" height="22" />}
        />
      ))}
    </div>
  );
}

/**
 * This month against last, as a percentage — or nothing.
 *
 * A month that follows an empty one has no percentage to report: "+100 %" off
 * a base of zero is a decoration, and the whole point of this rewrite is that
 * the dashboard stops decorating (BUG-11).
 *
 * @param {number} current
 * @param {number} previous
 * @returns {{direction: 'up'|'down', label: string}|undefined}
 */
export function deltaOf(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return undefined;
  if (current === previous) return undefined;

  const change = ((current - previous) / previous) * 100;
  return {
    direction: change >= 0 ? 'up' : 'down',
    label: `${Math.abs(Math.round(change * 10) / 10)}% vs last month`,
  };
}
