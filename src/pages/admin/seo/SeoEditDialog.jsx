import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import SeoPanel from '../../../components/seo/SeoPanel';
import Skeleton from '../../../components/ui/Skeleton';
import ErrorState from '../../../components/ui/ErrorState';
import {
  applySeoSideEffects,
  redirectWarning,
  validateSeoBranch,
} from '../../../components/seo/seoSideEffects';
import { entityLabel, serviceFor } from './seoEntityServices';
import { firstFieldMessage } from '../../../services/apiError';
import { toSeoPayload, withSeoDefaults } from '../../../components/seo/seoValues';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './SeoDashboardPage.module.css';
import { SEO } from '../../../config/adminCopy';

/**
 * The SEO panel over one record, without leaving the desk (§4.3 of prompt 37).
 *
 * The desk's rows carry `seo` and nothing else, and half the analysis is about
 * what the rest of the record says — whether the keyword is in the body, how
 * many images the listing has, whether the article has a category. So the
 * dialog loads the **whole** record through `seoEntityServices` before it
 * mounts the panel, and saves the branch back with a `PATCH { seo }`, which is
 * the one write §9.6 specifies.
 *
 * Saving does two more things, in this order: `applySeoSideEffects` writes the
 * redirect a record may have asked for and tells the rest of the admin the SEO
 * index is stale (§9.6), and `onSaved` hands the row back so the table behind
 * the dialog shows the new score without re-reading the page.
 *
 * @param {object} props
 * @param {{id: number|string, type: string, title?: string}|null} props.row
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(row: {id: number|string, type: string, seo: object}) => void} [props.onSaved]
 * @param {Array<object>} [props.siteIndex] the desk's rows — what the panel's
 *   three uniqueness tests compare this record against (§13.1)
 * @param {string} [props.initialField] a dotted path to open on (the Issues tab's "Fix")
 * @param {boolean} [props.readOnly]
 */
export default function SeoEditDialog({
  row,
  open,
  onClose,
  onSaved,
  siteIndex,
  initialField,
  readOnly = false,
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const service = serviceFor(row?.type);

  const [entity, setEntity] = useState(null);
  const [seo, setSeo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const rowId = row?.id ?? null;
  const rowType = row?.type ?? null;
  const alive = useRef(true);

  const load = useCallback(() => {
    if (!open || rowId === null || !service) return;
    setLoading(true);
    setError(null);

    service
      .get(rowId)
      .then(({ data }) => {
        if (!alive.current) return;
        setEntity(data ?? null);
        setSeo(withSeoDefaults(data?.seo));
        setDirty(false);
        setErrors({});
        setLoading(false);
      })
      .catch((thrown) => {
        if (!alive.current) return;
        setError(thrown);
        setLoading(false);
      });
  }, [open, rowId, service]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  // A dialog that is closed holds nothing: the next record it opens must not
  // flash the previous one's title while its own request is in flight.
  useEffect(() => {
    if (open) return;
    setEntity(null);
    setSeo(null);
    setConfirmingClose(false);
  }, [open]);

  const handleChange = useCallback((patch) => {
    setSeo((current) => {
      const next = { ...(current ?? {}), ...patch };
      // The analysis writes itself back through the same channel as an
      // editor's keystroke; only the second kind is an unsaved change.
      if (Object.keys(patch).some((key) => !ANALYSIS_KEYS.has(key))) setDirty(true);
      return next;
    });
  }, []);

  const context = useMemo(() => (siteIndex ? { siteIndex } : undefined), [siteIndex]);

  const close = () => {
    if (dirty && !confirmingClose) {
      setConfirmingClose(true);
      return;
    }
    setConfirmingClose(false);
    onClose?.();
  };

  const save = async () => {
    if (!entity || !service) return;

    const found = validateSeoBranch(seo);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error('Fix the highlighted fields before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload = toSeoPayload(seo, entity.slug ?? seo?.slug ?? '');
      const { data } = await service.patch(entity.id, { seo: payload });
      const saved = data ?? { ...entity, seo: payload };

      const effects = await applySeoSideEffects(rowType, saved);

      if (alive.current) {
        setEntity(saved);
        setSeo(withSeoDefaults(saved.seo));
        setDirty(false);
      }
      onSaved?.({ id: saved.id, type: rowType, seo: saved.seo ?? payload });
      if (effects.ok) toast.success(SEO.saved);
      else toast.warning(redirectWarning(effects.error));
      onClose?.();
    } catch (thrown) {
      const fields = thrown?.errors ?? {};
      setErrors(
        Object.fromEntries(
          Object.entries(fields).map(([key, messages]) => [
            key,
            Array.isArray(messages) ? String(messages[0]) : String(messages),
          ])
        )
      );
      toast.error(firstFieldMessage(thrown, SEO.saveFailed));
    } finally {
      if (alive.current) setSaving(false);
    }
  };

  const title = row ? `SEO — ${row.title || entityLabel(row.type)}` : 'SEO';

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      mobile="fullscreen"
      title={title}
      description={row ? `${entityLabel(row.type)} · ${row.slug ? `/${row.slug}` : 'no slug'}` : ''}
      footer={
        <div className={styles.dialogFooter}>
          {entity && service ? (
            <Button
              variant="ghost"
              to={service.adminPath(entity.id)}
              icon={<Icon icon="mdi:pencil-outline" width="18" height="18" />}
            >
              Open the full form
            </Button>
          ) : null}
          <span className={styles.dialogSpacer} />
          {confirmingClose ? (
            <span className={styles.dialogWarning} role="alert">
              Close without saving?
            </span>
          ) : null}
          <Button variant="outline" onClick={close} disabled={saving}>
            {confirmingClose ? 'Discard' : 'Close'}
          </Button>
          {readOnly ? null : (
            <Button onClick={save} loading={saving} disabled={!entity || loading}>
              Save SEO
            </Button>
          )}
        </div>
      }
    >
      {loading ? (
        <div className={styles.dialogLoading} role="status" aria-label="Loading the record">
          <Skeleton variant="rounded" height={44} />
          <Skeleton variant="rounded" height={320} />
        </div>
      ) : null}

      {error ? (
        <ErrorState
          title="This record could not be loaded."
          text={firstFieldMessage(error, 'Try again in a moment.')}
          onRetry={load}
        />
      ) : null}

      {!loading && !error && entity && seo ? (
        <SeoPanel
          entityType={rowType}
          entity={entity}
          seo={seo}
          onChange={handleChange}
          onFocusField={() => {
            // The body, the images, the FAQs: the dialog edits the `seo` branch
            // only, so a hint about the rest of the record opens the record's
            // own form — unless that would drop SEO changes not saved yet.
            if (dirty) {
              toast.info(
                'That field is edited in the record’s own form. Save or discard the SEO changes here first.'
              );
              return;
            }
            if (!service || !entity) return;
            onClose?.();
            navigate(service.adminPath(entity.id));
          }}
          variant="full"
          context={context}
          errors={errors}
          disabled={readOnly || saving}
          initialField={initialField}
        />
      ) : null}
    </Modal>
  );
}

/** The keys the analysis writes back; an editor never types one (§9.6). */
const ANALYSIS_KEYS = new Set([
  'score',
  'scoreBand',
  'testsPassed',
  'testsTotal',
  'analysis',
  'lastAnalyzedAt',
]);
