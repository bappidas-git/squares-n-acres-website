import { useState } from 'react';
import { Link } from 'react-router-dom';

import useBreakpoint from '../../../../hooks/useBreakpoint';
import { useCssVar } from '../../../../hooks/useCssVar';

/**
 * What every chart on the dashboard is wrapped in.
 *
 * A chart is a picture of a table, and a picture is not readable by a screen
 * reader, a search of the page or anybody who turns images off — so each one
 * carries the table it was drawn from, visually hidden beside it (§8.3). The
 * SVG itself is labelled and described; the figure names it once for everyone.
 *
 * The hidden table is styled inline rather than through a CSS module: the four
 * charts are code-split, and a stylesheet they alone import would be a fifth
 * chunk to keep in order for eight lines of CSS.
 */

/** The clip-rect technique, which keeps the table in the accessibility tree. */
const SR_ONLY = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * The same table, shown while a keyboard is inside it: a row that links to the
 * leads it counts is a link a keyboard can reach, and a focused link must be
 * seen (§8.3).
 */
const SHOWN_TABLE = {
  marginTop: 'var(--space-3)',
  width: '100%',
  fontSize: 'var(--font-size-sm)',
  borderCollapse: 'collapse',
};

/**
 * The fill and size every axis label on the dashboard is drawn at.
 *
 * 11 px reads well enough on a desktop and is under §8.1's 13 px floor for a
 * phone — the same floor `ui/Avatar` honours for its initials, and the one
 * `npm run a11y:audit` reported 44 times on `/admin/dashboard` at 390 px.
 * Recharts drops ticks rather than overlapping them (`minTickGap`,
 * `interval="preserveStartEnd"`), so the wider labels cost density, not
 * legibility.
 */
export function useAxisTick() {
  const fill = useCssVar('--color-text-muted', 'currentColor');
  const { isMobile } = useBreakpoint();
  return { fill, fontSize: isMobile ? 13 : 11 };
}

/** The design-system token each tone of `ui/tones.js` paints with. */
export const TONE_TOKENS = {
  neutral: '--color-border-strong',
  primary: '--color-primary',
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
  info: '--color-info',
};

/**
 * @param {object} props
 * @param {string} props.title the chart's accessible name
 * @param {string} [props.description] what the shapes mean, for the SVG's
 *   `aria-describedby`
 * @param {Array<{label: string, value: React.ReactNode, to?: string}>} props.rows the
 *   data, as the hidden table renders it; a row with `to` links its value to the
 *   list behind it — what a click on the chart's shape opens (prompt 51)
 * @param {[string, string]} [props.columns] the hidden table's two headers
 * @param {React.ReactNode} props.children the chart itself
 */
export default function ChartFrame({
  title,
  description,
  rows = [],
  columns = ['Label', 'Value'],
  children,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={SR_ONLY}>{description ? `${title}. ${description}` : title}</figcaption>
      <div role="img" aria-label={title}>
        {children}
      </div>
      <table
        style={focused ? SHOWN_TABLE : SR_ONLY}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
      >
        <caption>{`${title} — the data behind the chart`}</caption>
        <thead>
          <tr>
            <th scope="col">{columns[0]}</th>
            <th scope="col">{columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" style={{ textAlign: 'left', fontWeight: 'inherit' }}>
                {row.label}
              </th>
              <td>{row.to ? <Link to={row.to}>{row.value}</Link> : row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
