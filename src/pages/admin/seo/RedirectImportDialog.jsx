import { useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import redirectService from '../../../services/redirectService';
import { TextareaField } from '../../../components/ui/FormField';
import { firstFieldMessage } from '../../../services/apiError';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './RedirectsPage.module.css';

/** The columns the importer understands, in the order a header-less file uses. */
const COLUMNS = ['fromPath', 'toPath', 'statusCode', 'note'];

/** Header cells that mean each column, however the exporting tool spelled them. */
const HEADERS = {
  from: 'fromPath',
  frompath: 'fromPath',
  'from path': 'fromPath',
  source: 'fromPath',
  old: 'fromPath',
  to: 'toPath',
  topath: 'toPath',
  'to path': 'toPath',
  target: 'toPath',
  destination: 'toPath',
  new: 'toPath',
  status: 'statusCode',
  statuscode: 'statusCode',
  code: 'statusCode',
  type: 'statusCode',
  note: 'note',
  comment: 'note',
};

/**
 * One CSV document as records.
 *
 * Small on purpose: RFC 4180 quoting, `""` as an escaped quote, CRLF or LF, and
 * a first row that is a header only when it names columns this importer knows.
 * A migration file is a few hundred lines pasted out of a spreadsheet, not a
 * data feed, and a parser with its own dependency would be the larger risk.
 *
 * @param {string} input
 * @returns {Array<{fromPath: string, toPath: string, statusCode: number, note: string|null,
 *   line: number}>}
 */
export function parseRedirectCsv(input) {
  const rows = splitRows(String(input ?? ''));
  if (rows.length === 0) return [];

  const headerCells = rows[0].map((cell) => cell.trim().toLowerCase());
  const mapped = headerCells.map((cell) => HEADERS[cell]);
  const hasHeader = mapped.filter(Boolean).length >= 2;
  const order = hasHeader ? mapped : COLUMNS;

  return rows
    .slice(hasHeader ? 1 : 0)
    .map((cells, index) => {
      const record = {};
      order.forEach((key, column) => {
        if (key) record[key] = cells[column];
      });

      const statusCode = Number(String(record.statusCode ?? '').replace(/\D/g, ''));

      return {
        fromPath: String(record.fromPath ?? '').trim(),
        toPath: String(record.toPath ?? '').trim(),
        statusCode: statusCode === 302 ? 302 : 301,
        note: String(record.note ?? '').trim() || null,
        line: index + (hasHeader ? 2 : 1),
      };
    })
    .filter((record) => record.fromPath !== '' || record.toPath !== '');
}

/** The rows of a CSV document, as arrays of cells. */
function splitRows(input) {
  const rows = [];
  let cells = [];
  let value = '';
  let quoted = false;

  const endCell = () => {
    cells.push(value);
    value = '';
  };
  const endRow = () => {
    endCell();
    if (cells.some((cell) => cell.trim() !== '')) rows.push(cells);
    cells = [];
  };

  const text = input.replace(/^﻿/, '');

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          value += '"';
          index += 1;
        } else quoted = false;
      } else value += character;
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ',') endCell();
    else if (character === '\n') endRow();
    else if (character !== '\r') value += character;
  }

  if (value !== '' || cells.length > 0) endRow();
  return rows;
}

/**
 * Why a row cannot be stored, or `null` when it can.
 *
 * The API refuses the same four things and counts them as skipped (§4.12); the
 * dialog checks them first so an editor is told **which line** was wrong, which
 * a summary of three numbers cannot say.
 *
 * @param {{fromPath: string, toPath: string}} row
 * @returns {string|null}
 */
export function rejectionOf(row) {
  if (!row.fromPath.startsWith('/')) return 'The from path must start with “/”.';
  if (row.toPath === '') return 'There is nothing to redirect to.';
  if (!/^(\/|https?:\/\/)/.test(row.toPath)) {
    return 'The target must be a path on this site or an https:// address.';
  }
  if (row.fromPath.replace(/\/+$/, '') === row.toPath.replace(/\/+$/, '')) {
    return 'A redirect cannot point at itself.';
  }
  return null;
}

/**
 * Import (§4.7 of prompt 37).
 *
 * A migration arrives as a spreadsheet: two hundred old URLs and where each one
 * went. The dialog parses it in the browser so the editor sees what will be
 * written — and what will not, with the reason and the line number — before a
 * single record is created, then sends the accepted rows in one request.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} [props.onImported]
 */
export default function RedirectImportDialog({ open, onClose, onImported }) {
  const toast = useToast();
  const fileInput = useRef(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);

  const parsed = useMemo(() => parseRedirectCsv(text), [text]);
  const rejected = useMemo(
    () => parsed.map((row) => ({ row, reason: rejectionOf(row) })).filter((entry) => entry.reason),
    [parsed]
  );
  const accepted = useMemo(() => parsed.filter((row) => !rejectionOf(row)), [parsed]);

  const readFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.onerror = () => toast.error('That file could not be read.');
    reader.readAsText(file);
    event.target.value = '';
  };

  const submit = async () => {
    if (accepted.length === 0) return;
    setBusy(true);
    try {
      const { data } = await redirectService.import({
        rows: accepted.map(({ fromPath, toPath, statusCode, note }) => ({
          fromPath,
          toPath,
          statusCode,
          ...(note ? { note } : {}),
        })),
      });

      const stored = data ?? { created: 0, updated: 0, skipped: 0 };
      setSummary({ ...stored, rejected: rejected.length });
      toast.success(
        `${stored.created} created, ${stored.updated} updated, ${
          stored.skipped + rejected.length
        } skipped.`
      );
      onImported?.();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The import could not be saved.'));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setText('');
    setSummary(null);
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      mobile="fullscreen"
      title="Import redirects"
      description="Paste rows of fromPath, toPath, statusCode — or upload the CSV a migration produced."
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={busy}>
            {summary ? 'Close' : 'Cancel'}
          </Button>
          <Button onClick={submit} loading={busy} disabled={accepted.length === 0}>
            Import {accepted.length} {accepted.length === 1 ? 'row' : 'rows'}
          </Button>
        </>
      }
    >
      <div className={styles.importBody}>
        <div className={styles.importActions}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInput.current?.click()}
            icon={<Icon icon="mdi:file-upload-outline" width="18" height="18" />}
          >
            Upload a .csv
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className={styles.fileInput}
            onChange={readFile}
            aria-label="Choose a CSV file of redirects"
          />
        </div>

        <TextareaField
          label="Rows"
          rows={8}
          className={styles.mono}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={'/old-properties,/properties,301\n/blog,/insights/articles,301'}
          hint="A header row is optional. The status code defaults to 301."
        />

        <p className={styles.importCount}>
          {parsed.length === 0
            ? 'Nothing to import yet.'
            : `${accepted.length} of ${parsed.length} rows can be imported.`}
        </p>

        {rejected.length > 0 ? (
          <div className={styles.importRejected}>
            <p className={styles.importRejectedTitle}>
              {rejected.length} {rejected.length === 1 ? 'row is' : 'rows are'} skipped:
            </p>
            <ul>
              {rejected.slice(0, 12).map(({ row, reason }) => (
                <li key={`${row.line}:${row.fromPath}`}>
                  Line {row.line} — <code>{row.fromPath || '(empty)'}</code>: {reason}
                </li>
              ))}
            </ul>
            {rejected.length > 12 ? <p>…and {rejected.length - 12} more.</p> : null}
          </div>
        ) : null}

        {summary ? (
          <p className={styles.importSummary} role="status">
            {summary.created} created, {summary.updated} updated,{' '}
            {summary.skipped + summary.rejected} skipped.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
