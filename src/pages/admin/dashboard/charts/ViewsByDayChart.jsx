import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import ChartFrame, { useAxisTick } from './ChartFrame';
import useCssVar from '../../../../hooks/useCssVar';
import { CHART_HEIGHT } from './LeadsByDayChart';
import { formatDate } from '../../../../utils/format';

/**
 * Property views per day over the last thirty (§6.16 `trends.viewsByDay`).
 *
 * The same thirty days as the leads line, so the two can be read against each
 * other: traffic that rises without enquiries rising is a story about the
 * listings, not about the marketing.
 *
 * @param {object} props
 * @param {Array<{date: string, count: number}>} props.data
 */
export default function ViewsByDayChart({ data = [] }) {
  const stroke = useCssVar('--color-info', 'currentColor');
  const grid = useCssVar('--color-border', 'currentColor');
  const tick = useAxisTick();

  const points = data.map((point) => ({ ...point, label: formatDate(point.date) }));

  return (
    <ChartFrame
      title="Property views per day, last 30 days"
      description="An area chart of how many listing pages were viewed on each of the last thirty days."
      columns={['Day', 'Views']}
      rows={points.map((point) => ({ label: point.label, value: point.count }))}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
            formatter={(value) => [value, 'Views']}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Views"
            stroke={stroke}
            fill={stroke}
            fillOpacity={0.15}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
