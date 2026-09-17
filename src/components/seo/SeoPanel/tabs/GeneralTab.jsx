import FocusKeywordField from '../parts/FocusKeywordField';
import GooglePreview from '../parts/GooglePreview';
import ScoreCard from '../parts/ScoreCard';
import SnippetEditor from '../parts/SnippetEditor';
import TestList from '../parts/TestList';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

/**
 * The tab an editor spends their time in: the phrase, the snippet, the preview
 * and the score.
 *
 * The order is the order of the work. Pick the phrase; write the title and the
 * description around it; look at what that produces; read what is still wrong.
 * On a desktop the last two sit beside the first two, because the score has to
 * move while the description is being typed for the connection between them to
 * be obvious.
 */
export default function GeneralTab() {
  const { variant } = useSeoPanel();

  return (
    <div className={styles.split}>
      <div className={styles.column}>
        <FocusKeywordField />
        <SnippetEditor />
        <GooglePreview />
      </div>

      <div className={styles.column}>
        <ScoreCard />
        {variant === 'compact' ? null : <TestList />}
      </div>

      {variant === 'compact' ? (
        <div className={styles.column}>
          <TestList />
        </div>
      ) : null}
    </div>
  );
}
