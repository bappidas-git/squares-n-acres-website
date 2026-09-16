import { useCallback, useEffect, useState } from 'react';

import { leadStorage } from '../utils/leadStorage';

/**
 * Whether this visitor may already see one kind of gated content on one
 * listing, and the call that records it when they earn the right.
 *
 * The answer lives in `sna_lead` (sessionStorage), so it survives a move to the
 * amenities section and back but not a new visit — which is the point: the
 * gate exists to collect a lead, and a new session is a new conversation.
 *
 *   const { unlocked, unlock } = useGatedContent(property.id, 'floorPlans');
 *
 * @param {number|string|null} propertyId
 * @param {string} kind a member of `UNLOCK_KINDS` (`floorPlans`, `documents`)
 * @returns {{ unlocked: boolean, unlock: () => void }}
 */
export default function useGatedContent(propertyId, kind) {
  const [unlocked, setUnlocked] = useState(() => leadStorage.isUnlocked(propertyId, kind));

  // Moving between two listings in the same visit must not carry one's unlock
  // over to the other.
  useEffect(() => {
    setUnlocked(leadStorage.isUnlocked(propertyId, kind));
  }, [propertyId, kind]);

  const unlock = useCallback(() => {
    leadStorage.unlock(propertyId, kind);
    setUnlocked(leadStorage.isUnlocked(propertyId, kind));
  }, [propertyId, kind]);

  return { unlocked, unlock };
}
