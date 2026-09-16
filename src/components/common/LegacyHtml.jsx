import React from 'react';

/**
 * TEMPORARY — renders API-authored HTML (article bodies, FAQ answers, locality
 * and property descriptions) until prompt 32 ships `SafeHtml`, which sanitises
 * with the same allow-list the Tiptap editor writes with.
 *
 * The content comes from the CMS, so it is authored by signed-in editors rather
 * than by visitors; sanitising it is still the right thing to do and is the
 * whole reason this component is a single choke point instead of a
 * `dangerouslySetInnerHTML` sprinkled across a dozen files.
 *
 * Registered in `docs/PROJECT_STATE.md` → "Pending rewrites" (owner 32).
 */
const LegacyHtml = ({ html, as: Tag = 'div', ...rest }) => {
  if (!html) return null;
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default LegacyHtml;
