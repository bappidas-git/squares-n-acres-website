import { useEffect, useState } from 'react';

import RecentlyViewed from '../../common/RecentlyViewed';
import SectionShell from './SectionShell';
import recentlyViewed from '../../../utils/recentlyViewed';

/**
 * "Recently viewed", at the foot of a property page.
 *
 * It is not one of the eighteen `sectionVisibility` keys and has no navigation
 * item: it belongs to the visitor rather than to the listing, so an editor has
 * nothing to switch and the sub-navigation has nothing to promise. The section
 * renders only once the browser has a history to show, and never includes the
 * listing being read.
 *
 * @param {object} props
 * @param {number|string|null} props.exclude the listing being read
 * @param {'bg'|'surface'} [props.background]
 */
export default function RecentlyViewedSection({ exclude, background = 'bg' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(recentlyViewed.list({ exclude }).length);
  }, [exclude]);

  if (count === 0) return null;

  return (
    <SectionShell
      id="recentlyViewed"
      title="Recently viewed"
      subtitle="The listings you have opened in this browser."
      background={background}
    >
      <RecentlyViewed exclude={exclude} />
    </SectionShell>
  );
}
