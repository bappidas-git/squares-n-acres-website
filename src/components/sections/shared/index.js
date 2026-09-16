/**
 * Sections more than one page renders (prompt 17).
 *
 *   import { FaqAccordion, ContactMethods } from '../../components/sections/shared';
 *
 * The FAQ accordion is shared by the home section, `/insights/faqs`, the FAQ
 * block of a property page and the CMS `faq` block; the testimonial and team
 * sections by the home page, the About page and their CMS blocks; the contact
 * methods by the FAQ page and the contact page.
 */

export { default as ContactMethods } from './ContactMethods';
export { default as FaqAccordion } from './FaqAccordion';
export { default as TeamSection } from './TeamSection';
export { default as TestimonialsSection, isRenderable } from './TestimonialsSection';
