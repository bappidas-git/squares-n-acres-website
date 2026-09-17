/**
 * The questions under a listing or an article, as the `FAQPage` a result can
 * expand (§9.3).
 *
 * Answers are stored as HTML and published here as text: a rich result shows
 * words, and markup inside `acceptedAnswer.text` is what gets the whole block
 * rejected.
 */

const { compact } = require('./graph');
const { stripHtml } = require('../text');

/**
 * @param {{faqs?: Array<{question: string, answer: string}>, canonical?: string}} input
 *   — or a normalised record, whose `extras.faqs` are used
 * @param {object} [_context] unused; the questions come from the record
 * @returns {object|null} a `FAQPage` node, or `null` when there are no questions
 */
function faqPageNode(input = {}, _context = {}) {
  const faqs = (Array.isArray(input.faqs) ? input.faqs : (input.extras?.faqs ?? [])).filter(
    (faq) => faq?.question && faq?.answer
  );
  if (!faqs.length) return null;

  const canonical = input.canonical ?? '';

  return compact({
    '@type': 'FAQPage',
    '@id': canonical ? `${canonical}#faq` : undefined,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: stripHtml(faq.question),
      acceptedAnswer: { '@type': 'Answer', text: stripHtml(faq.answer) },
    })),
  });
}

module.exports = faqPageNode;
module.exports.faqPageNode = faqPageNode;
