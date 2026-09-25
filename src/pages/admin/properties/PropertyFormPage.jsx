import { useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';

import PATHS from '../../../routes/paths';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
// The kit is imported file by file, in the order `MasterDataPage` reaches for
// the same components: the barrel's own order disagrees with it, and webpack
// then cannot give the extracted CSS one order across the admin chunks.
import PageHeader from '../../../components/admin/PageHeader';
import { Button, EmptyState, ErrorState, Skeleton } from '../../../components/ui';
import PropertyFormShell from './property-form/PropertyFormShell';
import usePropertyForm from './property-form/usePropertyForm';

import styles from './PropertyFormPage.module.css';

/**
 * Admin → Properties → add / edit
 * (`/admin/properties/add`, `/admin/properties/edit/:id`).
 *
 * The screen owns the fetch and the four states of §8.2; everything the form
 * does with the record afterwards belongs to `usePropertyForm`, and everything
 * the record is made of belongs to the sixteen tabs of `property-form/tabs.js`.
 *
 * A sales user may open this URL (§7 gives them `properties.view`) and finds it
 * read-only: no autosave, no writes, every control disabled.
 */
export default function PropertyFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { can } = useAdminAuth();
  const readOnly = !can('properties', isEdit ? 'edit' : 'create');

  const {
    data: record,
    loading,
    error,
    refetch,
  } = useApi((signal) => propertyService.adminGet(id, { signal }), [id], { enabled: isEdit });

  const form = usePropertyForm({ propertyId: id ?? null, record, readOnly });

  const title = isEdit ? `Edit: ${record?.title ?? 'property'}` : 'Add property';
  const breadcrumbs = [
    { label: 'Properties', to: PATHS.adminProperties },
    { label: isEdit ? (record?.title ?? 'Edit property') : 'Add property' },
  ];

  if (isEdit && loading) {
    return (
      <>
        <PageHeader title="Edit property" breadcrumbs={breadcrumbs} />
        <div className={styles.loading} role="status" aria-busy="true" aria-live="polite">
          <span className={styles.srOnly}>Loading the property…</span>
          <Skeleton variant="rounded" height={48} />
          <div className={styles.layout}>
            <Skeleton variant="rounded" height={420} />
            <Skeleton variant="rounded" height={420} />
          </div>
        </div>
      </>
    );
  }

  if (isEdit && error?.status === 404) {
    return (
      <>
        <PageHeader title="Edit property" breadcrumbs={breadcrumbs} />
        <EmptyState
          icon={<Icon icon="mdi:home-search-outline" width="40" height="40" />}
          title="Property not found"
          text="This listing has been deleted, or the address is wrong."
          action={
            <Button variant="outline" to={PATHS.adminProperties}>
              Back to properties
            </Button>
          }
        />
      </>
    );
  }

  // A save found the listing deleted elsewhere while this page was open. The
  // work on screen is still here — "Not found" left it in a form that could
  // never be saved again (QA-62) — so it can become a new listing.
  if (isEdit && form.gone) {
    return (
      <>
        <PageHeader title="Edit property" breadcrumbs={breadcrumbs} />
        <EmptyState
          icon={<Icon icon="mdi:home-remove-outline" width="40" height="40" />}
          title="This listing no longer exists"
          text="It was deleted elsewhere while this page was open, so the changes had nowhere to go. They are still here: save them as a new listing, or leave them."
          action={
            <div className={styles.goneActions}>
              <Button loading={form.busy} onClick={form.saveAsNew}>
                Save as a new listing
              </Button>
              <Button variant="outline" to={PATHS.adminProperties}>
                Back to properties
              </Button>
            </div>
          }
        />
      </>
    );
  }

  if (isEdit && (error || !record)) {
    return (
      <>
        <PageHeader title="Edit property" breadcrumbs={breadcrumbs} />
        <ErrorState
          title="We could not load this property"
          text={error?.message}
          onRetry={refetch}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs}
        subtitle={
          isEdit
            ? 'Sixteen sections make up the public page; the status panel publishes it.'
            : 'Fill in the basics and save — the other sections can follow.'
        }
      />
      <PropertyFormShell form={form} />
    </>
  );
}
