import { useMemo } from 'react';
import { Icon } from '@iconify/react';

import Alert from '../../../ui/Alert';
import Button from '../../../ui/Button';
import { schema as schemaEngine } from '../../../../seo';
import { fieldId } from '../SeoPanel';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

/**
 * Whether a string of JSON-LD may be saved, and what is wrong with it if not.
 *
 * Empty is valid: the custom block is an addition to the generated graph, not a
 * replacement for it.
 *
 * @param {string} value
 * @returns {{valid: boolean, errors: Array<{path: string, message: string}>}}
 */
export function validateCustomSchema(value) {
  const { valid, errors } = schemaEngine.parseCustom(value);
  return { valid, errors };
}

/**
 * The custom JSON-LD block.
 *
 * Whatever is typed here is appended to the generated `@graph` — it is how a
 * page carries a node this application does not generate, an `Event` or a
 * `HowTo`. Two rules make that safe: it must parse, and it must survive the
 * structural validator (`schema/validate.js`), which is what stops a `@type`
 * with no required properties reaching a crawler. The host form refuses to save
 * a record whose custom schema fails either, because invalid JSON-LD in a page
 * is worse than none: it invalidates the whole script tag, generated nodes
 * included.
 */
export default function SchemaEditor() {
  const { seo, setField, errors, disabled } = useSeoPanel();
  const value = seo.schema?.custom ?? '';

  const state = useMemo(() => validateCustomSchema(value), [value]);
  const empty = String(value).trim() === '';

  /** "Format" — the same JSON, indented, so a mistake is visible. */
  const format = () => {
    try {
      setField('schema.custom', JSON.stringify(JSON.parse(value), null, 2));
    } catch {
      // Unformattable is exactly what the error list below already says.
    }
  };

  return (
    <div className={styles.stack}>
      <div className={styles.fieldHead}>
        <label className={styles.heading} htmlFor={fieldId('seo.schema.custom')}>
          Custom JSON-LD
        </label>
        <span className={styles.fieldActions}>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || empty}
            icon={<Icon icon="mdi:code-braces" width="16" height="16" />}
            onClick={format}
          >
            Format JSON
          </Button>
        </span>
      </div>

      <textarea
        id={fieldId('seo.schema.custom')}
        className={[styles.code, state.valid ? '' : styles.codeInvalid].filter(Boolean).join(' ')}
        value={value}
        disabled={disabled}
        spellCheck="false"
        aria-invalid={state.valid ? undefined : true}
        aria-describedby={state.valid ? undefined : `${fieldId('seo.schema.custom')}-errors`}
        placeholder={'{\n  "@type": "Event",\n  "name": "Site visit weekend"\n}'}
        onChange={(event) => setField('schema.custom', event.target.value)}
      />

      {empty ? (
        <p className={styles.note}>
          Optional. One object, or an array of them, or a whole document with its own
          <span className={styles.resolvedMono}> @graph</span>. It is added to the nodes above,
          never instead of them.
        </p>
      ) : state.valid ? (
        <Alert
          tone="success"
          icon={<Icon icon="mdi:check-circle-outline" width="20" height="20" />}
        >
          Valid JSON-LD — {countNodes(value)} node{countNodes(value) === 1 ? '' : 's'} will be added
          to this page&rsquo;s graph.
        </Alert>
      ) : (
        <Alert
          tone="error"
          title="This cannot be published"
          icon={<Icon icon="mdi:alert-circle-outline" width="20" height="20" />}
        >
          <ul className={styles.errorList} id={`${fieldId('seo.schema.custom')}-errors`}>
            {state.errors.map((error, index) => (
              <li key={`${error.path}-${index}`}>
                {error.path ? <strong>{error.path}: </strong> : null}
                {error.message}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {errors['seo.schema.custom'] ? (
        <p className={styles.summaryFail} role="alert">
          {errors['seo.schema.custom']}
        </p>
      ) : null}
    </div>
  );
}

/** How many nodes a valid custom block contributes. */
function countNodes(value) {
  const { nodes } = schemaEngine.parseCustom(value);
  return nodes.length;
}
