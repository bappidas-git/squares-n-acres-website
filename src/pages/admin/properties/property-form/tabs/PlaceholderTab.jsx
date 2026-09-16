import { Icon } from '@iconify/react';

import { Alert } from '../../../../../components/ui';

/**
 * A tab whose fields a later prompt writes.
 *
 * The shell, the reducer, the validators and the payload already cover every
 * field of §6.1 — what is missing is the controls. Rather than hide that, each
 * unfinished tab says which prompt fills it in, and the rail keeps saving what
 * the form already holds.
 *
 * @param {object} props
 * @param {number} props.prompt the prompt that writes this tab
 * @param {string} props.label the tab's own name, for the message
 * @param {React.ReactNode} [props.note] an extra sentence under the alert
 * @param {React.ReactNode} [props.children] fields the shell already owns
 */
export default function PlaceholderTab({ prompt, label, note, children }) {
  return (
    <>
      <Alert
        tone="info"
        title={`${label} arrives in prompt ${prompt}`}
        icon={<Icon icon="mdi:progress-wrench" width="20" height="20" />}
      >
        {note ??
          'The fields of this section are written in that prompt. Everything this listing already holds is kept and saved untouched in the meantime.'}
      </Alert>
      {children}
    </>
  );
}
