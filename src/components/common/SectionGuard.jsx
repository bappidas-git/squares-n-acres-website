import React from 'react';

/**
 * SectionGuard — Reusable wrapper for conditional section rendering.
 *
 * A section renders ONLY when ALL conditions are met:
 *   1. `sectionEnabled` is true (admin toggle from property.sections)
 *   2. `hasData` is true (the section has valid API data)
 *   3. `typeAllowed` is true (rent/sale type condition, defaults to true)
 *
 * Usage:
 *   <SectionGuard
 *     sectionEnabled={property.sections?.amenities}
 *     hasData={property.amenities?.length > 0}
 *   >
 *     <PropertyAmenities amenities={property.amenities} />
 *   </SectionGuard>
 */
const SectionGuard = ({ sectionEnabled = true, hasData = false, typeAllowed = true, children }) => {
  if (!sectionEnabled || !hasData || !typeAllowed) return null;
  return <>{children}</>;
};

export default SectionGuard;
