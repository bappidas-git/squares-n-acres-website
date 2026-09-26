import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../../components/ui/Button';
import { MEDIA_LIMITS } from '../../media/useMediaUpload';
import {
  TEST_UPLOAD_FOLDER,
  describeUploadFailure,
  testCloudinaryUpload,
} from '../../../../utils/cloudinary';
import { useToast } from '../../../../components/common/ToastProvider';

import styles from '../SettingsPage.module.css';

/** Where a new account starts, and where the presets live. */
export const CLOUDINARY_SIGNUP_URL = 'https://cloudinary.com/users/register_free';
export const CLOUDINARY_CONSOLE_URL = 'https://console.cloudinary.com';

/** Every extension the library takes, for the preset's "Allowed formats". */
const FORMATS = Object.values(MEDIA_LIMITS)
  .flatMap((limit) => limit.extensions)
  .join(', ');

/**
 * "How do I upload to Cloudinary?" — answered where the two boxes are
 * (prompt 51).
 *
 * The integration needs a cloud name and an **unsigned** upload preset, and
 * nothing on the screen used to say where either comes from; a wrong preset
 * failed later, mid-upload, with Cloudinary's own sentence. So: the walkthrough
 * the client follows once, and "Test uploads", which sends a one-pixel picture
 * with the values in the boxes — saved or not, and it says which — to
 * `sna/_diagnostics`, and never files it in the media library.
 *
 * @param {object} props
 * @param {string} props.cloudName what the box holds now
 * @param {string} props.uploadPreset
 * @param {string} [props.savedCloudName] what the settings hold
 * @param {string} [props.savedUploadPreset]
 * @param {boolean} props.valid both boxes pass their format checks
 * @param {boolean} [props.disabled]
 */
export default function CloudinarySetup({
  cloudName = '',
  uploadPreset = '',
  savedCloudName = '',
  savedUploadPreset = '',
  valid = false,
  disabled = false,
}) {
  const toast = useToast();
  const configured = Boolean(savedCloudName && savedUploadPreset);
  const [open, setOpen] = useState(!configured);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef(null);

  useEffect(() => () => controller.current?.abort(), []);

  const name = String(cloudName ?? '').trim();
  const preset = String(uploadPreset ?? '').trim();
  const unsaved =
    name !== String(savedCloudName ?? '').trim() ||
    preset !== String(savedUploadPreset ?? '').trim();

  // A result speaks for the values it was run with; a change of either box
  // makes it history.
  const shown =
    result && result.cloudName === name && result.uploadPreset === preset ? result : null;

  const test = async () => {
    if (!valid || busy) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setResult(null);
    try {
      await testCloudinaryUpload({ cloudName: name, uploadPreset: preset, signal: current.signal });
      setResult({ ok: true, cloudName: name, uploadPreset: preset, unsaved });
      toast.success(
        unsaved
          ? 'Uploads work with these values — save the settings to use them.'
          : 'Uploads work.'
      );
    } catch (thrown) {
      if (thrown?.name === 'AbortError') return;
      const message = describeUploadFailure(thrown);
      setResult({ ok: false, cloudName: name, uploadPreset: preset, unsaved, message });
      toast.error(message);
    } finally {
      if (controller.current === current) controller.current = null;
      setBusy(false);
    }
  };

  return (
    <div className={styles.cloudinary}>
      <button
        type="button"
        className={styles.cloudinaryToggle}
        aria-expanded={open}
        aria-controls="cloudinary-walkthrough"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon
          icon={open ? 'mdi:chevron-down' : 'mdi:chevron-right'}
          width="20"
          height="20"
          aria-hidden="true"
        />
        How to set up Cloudinary uploads
      </button>

      {open ? (
        <ol className={styles.cloudinarySteps} id="cloudinary-walkthrough">
          <li>
            Create a free Cloudinary account at{' '}
            <a href={CLOUDINARY_SIGNUP_URL} target="_blank" rel="noopener noreferrer">
              cloudinary.com/users/register_free
            </a>
            . The <strong>cloud name</strong> is on the Console’s dashboard (
            <a href={CLOUDINARY_CONSOLE_URL} target="_blank" rel="noopener noreferrer">
              console.cloudinary.com
            </a>
            ), under the product environment’s name.
          </li>
          <li>
            In the Console, open <strong>Settings → Upload → Upload presets</strong> and choose{' '}
            <strong>Add upload preset</strong>.
          </li>
          <li>
            Set <strong>Signing mode</strong> to <strong>Unsigned</strong>. The browser uploads
            straight to Cloudinary and has no secret to sign with, so a signed preset refuses every
            file.
          </li>
          <li>
            Set the preset’s <strong>folder</strong> to <code>sna</code> — the library files each
            upload under <code>sna/&lt;folder&gt;</code>.
          </li>
          <li>
            Recommended: cap the file size at about 10 MB (100 MB if you upload videos) and limit
            the allowed formats to the ones this library takes: {FORMATS}.
          </li>
          <li>
            Save the preset, paste the cloud name and the preset’s name into the two boxes above,
            and save these settings.
          </li>
        </ol>
      ) : null}

      <div className={styles.cloudinaryTest}>
        <Button
          variant="outline"
          size="sm"
          loading={busy}
          disabled={disabled || !valid}
          icon={<Icon icon="mdi:cloud-check-outline" width="16" height="16" />}
          onClick={test}
        >
          Test uploads
        </Button>
        <p className={styles.hint}>
          {!valid
            ? 'Fill in both boxes to test them.'
            : unsaved
              ? 'Tests the values typed above, which are not saved yet.'
              : 'Tests the saved values.'}{' '}
          It sends a one-pixel picture to {TEST_UPLOAD_FOLDER} on your Cloudinary account and adds
          nothing to the media library.
        </p>
      </div>

      {shown?.ok ? (
        <p className={styles.cloudinaryOk} role="status">
          <Icon icon="mdi:check-circle-outline" width="18" height="18" aria-hidden="true" />
          Uploads work — tested just now with cloud “{shown.cloudName}” and preset “
          {shown.uploadPreset}”.
          {shown.unsaved ? ' Save the settings to turn uploads on across the admin.' : ''}
        </p>
      ) : shown ? (
        <p className={styles.cloudinaryFailed} role="alert">
          <Icon icon="mdi:alert-circle-outline" width="18" height="18" aria-hidden="true" />
          {shown.message}
        </p>
      ) : null}
    </div>
  );
}
