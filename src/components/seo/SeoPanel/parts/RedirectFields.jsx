import { SelectField, SwitchField, TextField } from '../../../ui/FormField';
import { REDIRECT_CODES } from '../../../../config/enums';
import { urls } from '../../../../seo';
import { fieldId } from '../SeoPanel';
import { homeRedirectRefusal } from '../../../../config/pages';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

/**
 * "This page has moved."
 *
 * The redirect is stored on the record (§9.6) and **written as a `redirects`
 * row when the host form saves** — `applySeoSideEffects` in
 * `components/seo/seoSideEffects.js` does that, after the entity save, because
 * the path being redirected is the record's own and a new record has no slug
 * until the API gives it one.
 *
 * `fromPath` is therefore never typed: it is where this page lives now.
 * Switching the rule off deactivates the row rather than deleting it — the
 * redirects screen is where a rule is removed for good.
 *
 * A record whose address is fixed (`fixedPath` — the home page's `/`) is not
 * redirected: the rule would send every visitor who reaches the site
 * elsewhere, and the API refuses it (QA-56). A switch already on can still be
 * turned off.
 */
export default function RedirectFields() {
  const { entityType, entity, seo, setField, errors, disabled, fixedPath } = useSeoPanel();
  const redirect = seo.redirect ?? {};
  const fromPath = urls.publicPathFor(entityType, entity);
  const locked = Boolean(fixedPath) && redirect.enabled !== true;

  return (
    <div className={styles.stack}>
      <SwitchField
        label="Redirect this page somewhere else"
        checked={redirect.enabled === true}
        disabled={disabled || !fromPath || locked}
        error={fixedPath && redirect.enabled === true ? homeRedirectRefusal() : undefined}
        hint={
          locked
            ? homeRedirectRefusal()
            : fromPath
              ? `Visitors asking for ${fromPath} are sent on. The rule is written when this record is saved.`
              : 'The page needs an address before it can be redirected — set the permalink first.'
        }
        onChange={(next) => setField('redirect.enabled', next)}
      />

      {redirect.enabled ? (
        <div className={styles.grid2}>
          <TextField
            id={fieldId('seo.redirect.toPath')}
            label="Send visitors to"
            required
            value={redirect.toPath ?? ''}
            error={errors['seo.redirect.toPath']}
            disabled={disabled}
            placeholder="/properties/lakeview-heights"
            hint="A path on this site, or a full https:// address somewhere else."
            onChange={(event) => setField('redirect.toPath', event.target.value)}
          />
          <SelectField
            label="Kind"
            options={REDIRECT_CODES.options}
            value={String(redirect.statusCode ?? 301)}
            disabled={disabled}
            hint="301 tells search engines the move is permanent and passes the page's standing on."
            onChange={(event) => setField('redirect.statusCode', Number(event.target.value))}
          />
        </div>
      ) : null}
    </div>
  );
}
