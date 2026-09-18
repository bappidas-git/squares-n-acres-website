import {
  Suspense,
  createContext,
  lazy,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import storage from '../utils/storage';
import { AUTH_STORAGE_KEYS } from '../services/http';
import { LEAD_CHANGE_EVENT, captureUtm, leadStorage } from '../utils/leadStorage';
import { entryPoint, leadFormProps } from '../utils/leadSources';

/**
 * One lead dialog for the whole site.
 *
 * Any component — the header CTA, the bottom bar, a price card, a CMS `cta`
 * block — calls `openLeadModal({ entry })` and the provider mounts the single
 * `LeadCaptureModal` with the source, the heading and the boxes that entry
 * point implies (`utils/leadSources.js`). Nothing else on the site keeps a
 * modal of its own, which is what makes "the header opened one while the price
 * card's was open" impossible: the second call replaces the first.
 *
 *   const { openLeadModal } = useLeadCapture();
 *   openLeadModal({ entry: 'site-visit-request', propertyId: 12 });
 *
 * The provider also owns the facts every click-tracking button needs: whether
 * this visit has identified itself, what it told us, and which listing the
 * visitor is currently reading — a page registers itself with
 * `setPageContext()` so the floating WhatsApp button can name the property in
 * its message instead of sending a bare "I would like to know more".
 *
 * The dialog itself is a chunk of its own (prompt 41 §4.2). It is reachable
 * from every page and opened on none of them until somebody asks for it, so
 * the form, its validation and its success states are not bytes a visitor
 * reading a listing has to download first. What makes that free rather than a
 * pause after the click is {@link leadTriggerProps}: a trigger spreads it and
 * the chunk is fetched while the pointer is still on its way.
 */

const LeadCaptureContext = createContext(null);

const LeadCaptureModal = lazy(() => import('../components/common/LeadCaptureModal'));

/** The in-flight (or finished) import, so warming twice costs one request. */
let modalChunk = null;

/**
 * Starts downloading the dialog's chunk, if it is not already on its way.
 *
 * `React.lazy` and this call name the same module, so webpack gives them one
 * chunk and whichever asks first is the one request that happens.
 */
export function prefetchLeadModal() {
  modalChunk = modalChunk ?? import('../components/common/LeadCaptureModal');
  return modalChunk;
}

/**
 * Spread onto anything that opens the dialog.
 *
 *   <Button {...leadTriggerProps} onClick={() => openLeadModal({ entry })}>
 *
 * Hover and focus cover a mouse and a keyboard; `pointerdown` covers a finger,
 * which never hovers and would otherwise be the one visitor who waits.
 */
export const leadTriggerProps = {
  onMouseEnter: prefetchLeadModal,
  onFocus: prefetchLeadModal,
  onPointerDown: prefetchLeadModal,
};

/** No listing in view — every page but a property's. */
const EMPTY_PAGE = { propertyId: null, title: '' };

/**
 * Whether an admin, manager or sales user is signed in on this browser.
 *
 * A staff member browsing the public site is not a visitor: their WhatsApp and
 * call clicks must not file leads against their own name, and the sales desk
 * must not find its own phone number in the pipeline.
 */
function isStaffSession() {
  return Boolean(storage.getItem(AUTH_STORAGE_KEYS.token, null));
}

/** The visitor `leadStorage` knows about, or `null` — staff are never one. */
function readVisitor() {
  if (isStaffSession()) return null;
  const visitor = leadStorage.getVisitor();
  return visitor?.name && visitor?.phone ? visitor : null;
}

export function LeadCaptureProvider({ children }) {
  const [modal, setModal] = useState(null);
  const [visitor, setVisitor] = useState(readVisitor);
  const [page, setPage] = useState(EMPTY_PAGE);

  // The campaign that brought this visit, kept for as long as it lasts, so a
  // lead filed four pages later still carries it (§6.7 `utm`).
  useEffect(() => {
    captureUtm();
  }, []);

  // A form filled in anywhere on the page — this modal, the enquiry section,
  // an eligibility check — changes who we are talking to.
  useEffect(() => {
    const read = () => setVisitor(readVisitor());
    window.addEventListener(LEAD_CHANGE_EVENT, read);
    return () => window.removeEventListener(LEAD_CHANGE_EVENT, read);
  }, []);

  const closeLeadModal = useCallback(() => setModal(null), []);

  /**
   * What the visitor is looking at, for the buttons that float over it.
   *
   * A details page calls this on mount and clears it on unmount; everything
   * else leaves it empty, which is exactly the "no property here" case.
   *
   * @param {{propertyId?: number|string|null, propertyTitle?: string}} next
   */
  const setPageContext = useCallback((next) => {
    setPage(
      next ? { propertyId: next.propertyId ?? null, title: next.propertyTitle ?? '' } : EMPTY_PAGE
    );
  }, []);

  /**
   * Open the dialog for one entry point.
   *
   * @param {object} options `{ entry, ...overrides }` — every `LeadCaptureModal`
   *   prop may be overridden, so a property CTA passes `propertyId` and a title
   *   while still taking the entry's source and fields.
   */
  const openLeadModal = useCallback((options = {}) => {
    const { entry = 'property-enquiry', ...overrides } = options;
    const config = entryPoint(entry);

    setModal({
      // A fresh key on every call remounts the dialog, which is what makes an
      // `openLeadModal` fired while another one is open *replace* it rather
      // than reuse the first one's half-typed state.
      key: `${entry}:${Date.now()}`,
      props: { unlockKind: config?.gated ?? null, ...leadFormProps(entry, overrides) },
    });
  }, []);

  const value = useMemo(
    () => ({
      openLeadModal,
      closeLeadModal,
      prefetchLeadModal,
      leadTriggerProps,
      setPageContext,
      page,
      isIdentified: Boolean(visitor),
      visitor,
    }),
    [openLeadModal, closeLeadModal, setPageContext, page, visitor]
  );

  return (
    <LeadCaptureContext.Provider value={value}>
      {children}
      {modal ? (
        <Suspense fallback={null}>
          <LeadCaptureModal key={modal.key} open onClose={closeLeadModal} {...modal.props} />
        </Suspense>
      ) : null}
    </LeadCaptureContext.Provider>
  );
}

/**
 * The lead dialog and what we know about this visitor.
 *
 * Safe outside a provider: `openLeadModal` becomes a no-op and the identity is
 * read straight from `sna_lead`, so a component under test renders without a
 * provider tree and a click-tracking button still behaves correctly.
 *
 * @returns {{openLeadModal: Function, closeLeadModal: Function,
 *   prefetchLeadModal: Function, leadTriggerProps: object, setPageContext: Function,
 *   page: {propertyId: number|string|null, title: string},
 *   isIdentified: boolean, visitor: object|null}}
 */
export function useLeadCapture() {
  const context = useContext(LeadCaptureContext);
  if (context) return context;

  const visitor = readVisitor();
  return {
    openLeadModal: () => {},
    closeLeadModal: () => {},
    prefetchLeadModal,
    leadTriggerProps,
    setPageContext: () => {},
    page: EMPTY_PAGE,
    isIdentified: Boolean(visitor),
    visitor,
  };
}

export { LeadCaptureContext };
export default LeadCaptureContext;
