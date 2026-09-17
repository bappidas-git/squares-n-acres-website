import { useMemo } from 'react';

import SchemaEditor from '../parts/SchemaEditor';
import { SelectField, SwitchField } from '../../../ui/FormField';
import { schema as schemaEngine } from '../../../../seo';
import { fieldId } from '../SeoPanel';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

/**
 * The structured data this record publishes (§9.3).
 *
 * Almost nobody should touch this tab, which is why it is the last one: the
 * generated graph is correct for every record the application knows about, and
 * the three controls here exist for the record it does not. The type select
 * forces the leading node's `@type`; the checklist removes a generated node
 * entirely; the editor adds one the application cannot generate.
 *
 * The preview underneath is the real answer — `schema.buildGraph` run over the
 * current form values, including whatever was typed a second ago.
 */
export default function SchemaTab() {
  const { entityType, entity, seo, setField, seoSettings, context, disabled } = useSeoPanel();
  const settings = seo.schema ?? {};
  const disabledTypes = Array.isArray(settings.disabledAutoTypes) ? settings.disabledAutoTypes : [];

  const options = useMemo(() => schemaEngine.schemaTypeOptions(entityType), [entityType]);

  const autoTypes = useMemo(
    () => schemaEngine.autoNodeTypes(entityType, entity, seoSettings, context),
    [entityType, entity, seoSettings, context]
  );

  const graph = useMemo(
    () => schemaEngine.buildGraph(entityType, entity, seoSettings, context),
    [entityType, entity, seoSettings, context]
  );

  const toggleType = (type, on) =>
    setField(
      'schema.disabledAutoTypes',
      on ? disabledTypes.filter((entry) => entry !== type) : [...disabledTypes, type]
    );

  return (
    <div className={styles.split}>
      <div className={styles.column}>
        <SelectField
          id={fieldId('seo.schema.type')}
          label="Schema type"
          options={options}
          value={settings.type || 'auto'}
          disabled={disabled}
          hint="Automatic is right for every record this application understands."
          onChange={(event) => setField('schema.type', event.target.value)}
        />

        {autoTypes.length > 0 ? (
          <fieldset className={styles.checklist}>
            <legend className={styles.heading}>Generated nodes</legend>
            <p className={styles.note}>
              Each of these is published with the page. Switch one off to leave it out.
            </p>
            {autoTypes.map((type) => (
              <SwitchField
                key={type}
                label={type}
                checked={!disabledTypes.includes(type)}
                disabled={disabled}
                onChange={(on) => toggleType(type, on)}
              />
            ))}
          </fieldset>
        ) : (
          <p className={styles.note}>
            This record does not publish structured data yet — it needs an address and a title
            first.
          </p>
        )}

        <SchemaEditor />
      </div>

      <div className={styles.column}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.heading}>Graph preview</h3>
            <span className={styles.note}>
              {graph['@graph'].length} node{graph['@graph'].length === 1 ? '' : 's'}
            </span>
          </div>
          <pre className={styles.graphPreview}>{JSON.stringify(graph, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
