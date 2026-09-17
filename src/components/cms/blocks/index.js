/**
 * The four blocks whose stylesheets the rest of the site also loads lead the
 * imports, in the order the property page loads the same four in:
 *
 *   `LeadFormBlock` → `LeadForm.module.css`             (its enquiry section)
 *   `FaqBlock` → `FaqAccordion.module.css`              (its FAQ section)
 *   `BanksBlock` → `finance.module.css`                 (its finance section)
 *
 * `PropertiesBlock` stays where the alphabet put it: `PropertyCard.module.css`
 * already arrives after all three, and hoisting it moved it in front of the
 * home page's partners band, which is a conflict of its own.
 *
 * A route's stylesheets are extracted in the order its modules are pulled in,
 * and two routes that disagree about the order of one of them is the
 * `mini-css-extract-plugin` "Conflicting order" that stops `build:ci`, where a
 * warning is an error. Alphabetical order put `BanksBlock` before `FaqBlock`
 * and `LeadFormBlock` after both, which is the property page's order backwards;
 * it survived only while no third route pulled all four together. The blog
 * (prompt 34) is that route, and `components/sections/article/index.js` carries
 * the same note.
 */
import LeadFormBlock from './LeadFormBlock';
import FaqBlock from './FaqBlock';
import BanksBlock from './BanksBlock';

import ArticlesBlock from './ArticlesBlock';
import ChecklistBlock from './ChecklistBlock';
import ContactInfoBlock from './ContactInfoBlock';
import CtaBlock from './CtaBlock';
import ExpandableCardsBlock from './ExpandableCardsBlock';
import FactsBlock from './FactsBlock';
import FeaturesBlock from './FeaturesBlock';
import GalleryBlock from './GalleryBlock';
import HeroBlock from './HeroBlock';
import HtmlBlock from './HtmlBlock';
import ImageBlock from './ImageBlock';
import JobsBlock from './JobsBlock';
import MapBlock from './MapBlock';
import PackagesBlock from './PackagesBlock';
import PartnersBlock from './PartnersBlock';
import PropertiesBlock from './PropertiesBlock';
import QuizBlock from './QuizBlock';
import RichTextBlock from './RichTextBlock';
import StatsBlock from './StatsBlock';
import StepsBlock from './StepsBlock';
import TeamBlock from './TeamBlock';
import TestimonialsBlock from './TestimonialsBlock';

/**
 * Every `BLOCK_TYPES` value, mapped to the component that renders it
 * (00_MASTER_CONTEXT.md §6.10).
 *
 * `PageRenderer` looks a block's type up here and renders nothing at all when
 * the lookup misses — a page saved by a newer build must not take the whole
 * site down on an older one.
 *
 * Every component takes the same four props:
 *
 *   data        the block's own `data`
 *   page        the record being rendered, for `leadSource`, `slug`, `title`
 *   background  `'bg'` or `'surface'`, alternating down the page
 *   index       the block's position, for the labels that need one
 *
 * A component may also carry a static `isEmpty(data)`: `PageRenderer` asks it
 * before it decides the alternation, so a `stats` block with no figures neither
 * renders a band nor costs the next block its background (§7).
 */
export const BLOCK_COMPONENTS = {
  hero: HeroBlock,
  richText: RichTextBlock,
  features: FeaturesBlock,
  steps: StepsBlock,
  stats: StatsBlock,
  faq: FaqBlock,
  cta: CtaBlock,
  leadForm: LeadFormBlock,
  team: TeamBlock,
  testimonials: TestimonialsBlock,
  properties: PropertiesBlock,
  articles: ArticlesBlock,
  checklist: ChecklistBlock,
  quiz: QuizBlock,
  map: MapBlock,
  contactInfo: ContactInfoBlock,
  image: ImageBlock,
  banks: BanksBlock,
  partners: PartnersBlock,
  html: HtmlBlock,
  jobs: JobsBlock,
  facts: FactsBlock,
  expandableCards: ExpandableCardsBlock,
  packages: PackagesBlock,
  gallery: GalleryBlock,
};

export {
  ArticlesBlock,
  BanksBlock,
  ChecklistBlock,
  ContactInfoBlock,
  CtaBlock,
  ExpandableCardsBlock,
  FactsBlock,
  FaqBlock,
  FeaturesBlock,
  GalleryBlock,
  HeroBlock,
  HtmlBlock,
  ImageBlock,
  JobsBlock,
  LeadFormBlock,
  MapBlock,
  PackagesBlock,
  PartnersBlock,
  PropertiesBlock,
  QuizBlock,
  RichTextBlock,
  StatsBlock,
  StepsBlock,
  TeamBlock,
  TestimonialsBlock,
};

export default BLOCK_COMPONENTS;
