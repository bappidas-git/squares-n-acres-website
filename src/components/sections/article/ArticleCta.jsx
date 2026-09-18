import LeadForm from '../../common/LeadForm';
import { leadFormProps } from '../../../utils/leadSources';

import styles from './ArticleCta.module.css';
import { BLOG } from '../../../config/copy';

/**
 * The enquiry band under an article.
 *
 * It is the one `LeadForm` of prompt 28 with the `article` entry point, so the
 * lead lands with `source: 'article'` and — because the band knows which
 * article it is under — `articleId`, which is what makes "which guides bring
 * enquiries" answerable in the CRM (§6.7).
 *
 * @param {object} props
 * @param {number|string} [props.articleId]
 * @param {string} [props.title]
 * @param {string} [props.text]
 */
export default function ArticleCta({
  articleId = null,
  title = BLOG.cta,
  text = 'Tell us what you are looking for and an advisor will come back with a shortlist and the trade-offs of each option.',
  className = '',
}) {
  return (
    <section className={[styles.cta, className].filter(Boolean).join(' ')}>
      <div className={styles.copy}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.text}>{text}</p>
      </div>

      <LeadForm
        {...leadFormProps('article', { title: null, subtitle: null })}
        articleId={articleId}
        className={styles.form}
      />
    </section>
  );
}
