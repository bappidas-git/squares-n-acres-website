import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../routes/paths';
import { track } from '../../utils/analytics';
import { useShortlist } from '../../contexts/ShortlistContext';
import { useToast } from './ToastProvider';

import styles from './ShortlistButton.module.css';

/**
 * The heart.
 *
 * It is a real toggle button — `aria-pressed` says whether the listing is
 * saved and the accessible name says what pressing it would do — so a screen
 * reader is never left guessing what a filled heart means. The confirmation
 * toast carries a link to the shortlist, because saving something a visitor
 * cannot then find is the boilerplate's heart all over again (ADD-10).
 *
 * @param {object} props
 * @param {number|string} props.propertyId
 * @param {string} [props.title] named in the accessible label and the toast
 * @param {'icon'|'button'} [props.variant] `button` adds a visible label
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.onImage] white-on-photograph treatment for a card
 */
export default function ShortlistButton({
  propertyId,
  title = '',
  variant = 'icon',
  size = 'md',
  onImage = false,
  className = '',
  ...rest
}) {
  const { has, toggle } = useShortlist();
  const toast = useToast();

  if (propertyId === null || propertyId === undefined) return null;

  const saved = has(propertyId);
  const named = title ? ` — ${title}` : '';

  const onClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const nowSaved = toggle(propertyId);
    track(nowSaved ? 'shortlist_add' : 'shortlist_remove', { propertyId });

    if (nowSaved) {
      toast.success(
        <span className={styles.toast}>
          Saved to shortlist
          <Link to={PATHS.shortlist} className={styles.toastLink}>
            View
          </Link>
        </span>
      );
    } else {
      toast.info('Removed from shortlist');
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove from shortlist${named}` : `Save to shortlist${named}`}
      title={saved ? 'Saved to shortlist' : 'Save to shortlist'}
      className={[
        styles.button,
        styles[size] || styles.md,
        variant === 'button' ? styles.labelled : '',
        onImage ? styles.onImage : '',
        saved ? styles.saved : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <Icon
        icon={saved ? 'mdi:heart' : 'mdi:heart-outline'}
        className={styles.icon}
        aria-hidden="true"
      />
      {variant === 'button' ? <span>{saved ? 'Saved' : 'Save'}</span> : null}
    </button>
  );
}
