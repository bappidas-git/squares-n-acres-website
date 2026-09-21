import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import ChartFrame, { useAxisTick } from './ChartFrame';
import useCssVar from '../../../../hooks/useCssVar';
import { CHART_HEIGHT } from './LeadsByDayChart';
import { LEAD_SOURCES } from '../../../../config/enums';

/** Beyond this the labels stop fitting and the tail stops mattering. */
const MAX_BARS = 8;

/**
 * Where the leads came from (§6.16 `trends.leadsBySource`).
 *
 * Horizontal, because "Real Estate Awareness" and "Direct Lease & Retail" are
 * not labels that fit under a vertical bar, and truncating the name of a
 * campaign is how a chart stops answering the question it was drawn for.
 *
 * @param {object} props
 * @param {Array<{source: string, count: number}>} props.data
 */
export default function LeadsBySourceChart({ data = [] }) {
  const fill = useCssVar('--color-primary', 'currentColor');
  const grid = useCssVar('--color-border', 'currentColor');
  const tick = useAxisTick();

  const bars = data
    .slice(0, MAX_BARS)
    .map((entry) => ({ ...entry, label: LEAD_SOURCES.labelOfAny(entry.source) }));

  return (
    <ChartFrame
      title="Leads by source"
      description="A bar chart of how many enquiries each form on the site produced."
      columns={['Source', 'Leads']}
      rows={bars.map((entry) => ({ label: entry.label, value: entry.count }))}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={bars} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: grid }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={tick}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip formatter={(value) => [value, 'Leads']} />
          <Bar
            dataKey="count"
            name="Leads"
            fill={fill}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
