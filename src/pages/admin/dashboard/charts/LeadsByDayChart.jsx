import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import ChartFrame, { useAxisTick } from './ChartFrame';
import useCssVar from '../../../../hooks/useCssVar';
import { formatDate } from '../../../../utils/format';

/** How tall every chart on the dashboard stands (§6 of prompt 29). */
export const CHART_HEIGHT = 280;

/**
 * Leads per day over the last 7, 30 or 90 days (§6.16 `trends.leadsByDay`;
 * the range since prompt 51).
 *
 * The series has a point for every day, zeroes included, because a line that
 * skips the quiet days makes a slow week look like a busy one.
 *
 * @param {object} props
 * @param {Array<{date: string, count: number}>} props.data
 * @param {number} [props.days] the range the series covers — 7, 30 or 90 (prompt 51)
 */
export default function LeadsByDayChart({ data = [], days = 30 }) {
  const line = useCssVar('--color-primary', 'currentColor');
  const grid = useCssVar('--color-border', 'currentColor');
  const tick = useAxisTick();

  const points = data.map((point) => ({ ...point, label: formatDate(point.date) }));

  return (
    <ChartFrame
      title={`Leads per day, last ${days} days`}
      description={`A line chart of how many enquiries arrived on each of the last ${days} days.`}
      columns={['Day', 'Leads']}
      rows={points.map((point) => ({ label: point.label, value: point.count }))}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: grid }}
            tickFormatter={(value) => String(value).slice(8)}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            labelFormatter={(value) => formatDate(value)}
            formatter={(value) => [value, 'Leads']}
          />
          <Line
            type="monotone"
            dataKey="count"
            name="Leads"
            stroke={line}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
