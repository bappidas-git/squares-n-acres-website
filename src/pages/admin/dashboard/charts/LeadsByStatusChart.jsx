import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import ChartFrame, { TONE_TOKENS } from './ChartFrame';
import { CHART_HEIGHT } from './LeadsByDayChart';
import { LEAD_STATUS } from '../../../../config/enums';
import { useCssVars } from '../../../../hooks/useCssVar';

/** One token per status, in the funnel's order — read once, painted seven times. */
const STATUS_TOKENS = LEAD_STATUS.values.map(
  (value) => TONE_TOKENS[LEAD_STATUS.meta[value]?.tone] ?? TONE_TOKENS.neutral
);

/**
 * How the pipeline is distributed (§6.16 `trends.leadsByStatus`).
 *
 * A donut rather than a funnel: the seven statuses are a partition of every
 * lead, and the question the dashboard asks of them is "how much of the
 * pipeline is where", not "how many survived each step".
 *
 * Every status is in the series, including the empty ones, so the legend is
 * the same seven entries whatever the desk has been doing this month.
 *
 * @param {object} props
 * @param {Array<{status: string, count: number}>} props.data
 */
export default function LeadsByStatusChart({ data = [] }) {
  const colours = useCssVars(STATUS_TOKENS);

  const slices = data.map((entry) => ({
    ...entry,
    label: LEAD_STATUS.labelOf(entry.status) || entry.status,
    colour: colours[LEAD_STATUS.values.indexOf(entry.status)] || 'currentColor',
  }));

  const total = slices.reduce((sum, slice) => sum + (slice.count ?? 0), 0);

  return (
    <ChartFrame
      title="Leads by status"
      description="A donut chart of how many leads stand at each stage of the pipeline."
      columns={['Status', 'Leads']}
      rows={slices.map((slice) => ({ label: slice.label, value: slice.count }))}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <PieChart>
          <Pie
            data={total === 0 ? [] : slices}
            dataKey="count"
            nameKey="label"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={1}
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.status} fill={slice.colour} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value, name]} />
          {/* Recharts paints a legend label in its series' colour, and the
              status tones are swatch colours: `--color-warning` is 2.68:1 on
              white and `--color-success` 4.14:1, neither of which may carry
              text (§2.4). The dot keeps the colour; the word is body text. */}
          <Legend
            verticalAlign="bottom"
            height={48}
            iconType="circle"
            formatter={(value) => <span style={{ color: 'var(--color-text)' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
