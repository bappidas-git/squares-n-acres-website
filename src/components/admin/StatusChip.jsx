import { Icon } from '@iconify/react';

import Chip from '../ui/Chip';

/**
 * A record's state as a chip — a role, a lead status, a publish state.
 *
 * The colour is always a tone name from `ui/tones.js`, never a hex literal:
 * the data stores `tone: 'success'` and the design system decides what that
 * looks like (§2.4, §6.4).
 *
 * @param {object} props
 * @param {'neutral'|'primary'|'success'|'warning'|'error'|'info'} [props.tone]
 * @param {React.ReactNode} props.label
 * @param {string} [props.icon] an Iconify id
 * @param {'soft'|'filled'|'outline'} [props.variant]
 */
export default function StatusChip({ tone = 'neutral', label, icon, variant = 'soft', ...rest }) {
  return (
    <Chip
      tone={tone}
      variant={variant}
      icon={icon ? <Icon icon={icon} width="14" height="14" /> : undefined}
      {...rest}
    >
      {label}
    </Chip>
  );
}
