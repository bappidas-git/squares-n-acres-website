import { Icon } from '@iconify/react';

import { Button, IconButton, TextField } from '../../../../../components/ui';
import { formatPrice } from '../../../../../utils/format';
import NumberWithUnit from './NumberWithUnit';

import styles from './Repeaters.module.css';

/**
 * The charges beside the headline price — car parking, a club membership, a
 * corpus fund, brokerage (`pricing.otherCharges`, §6.1).
 *
 * Every row is money: its amount is printed as rupees and added into the
 * total under the list. The presets exist because every listing repeats the
 * same few charges word for word, and typing "Club membership" into thirty
 * listings is how thirty spellings of it end up on the site.
 *
 * @param {object} props
 * @param {Array<{id: string|number, label: string, amount: number|null, note: string}>} props.charges
 * @param {Record<string, string>} props.errors keyed `pricing.otherCharges.<i>.<field>`
 * @param {Array<{label: string, note?: string}>} [props.presets] one button each
 * @param {React.ReactNode} [props.note] a line under the buttons
 * @param {(patch?: object) => void} props.onAdd
 * @param {(id: string|number, patch: object) => void} props.onUpdate
 * @param {(id: string|number) => void} props.onRemove
 */
export default function OtherChargesRepeater({
  charges = [],
  errors = {},
  presets = [],
  note = null,
  disabled = false,
  onAdd,
  onUpdate,
  onRemove,
}) {
  const total = charges.reduce((carried, charge) => {
    const amount = Number(charge.amount);
    return Number.isFinite(amount) ? carried + amount : carried;
  }, 0);

  return (
    <div className={styles.charges}>
      {charges.length === 0 ? (
        <p className={styles.empty}>
          No other charges are listed. Anything a buyer pays on top of the headline price belongs
          here — it is printed under the price on the listing page.
        </p>
      ) : null}

      {charges.map((charge, index) => (
        <div className={styles.chargeRow} key={charge.id}>
          <TextField
            label="Charge"
            value={charge.label ?? ''}
            error={errors[`pricing.otherCharges.${index}.label`]}
            disabled={disabled}
            maxLength={120}
            placeholder="e.g. Maintenance deposit"
            onChange={(event) => onUpdate?.(charge.id, { label: event.target.value })}
          />
          <NumberWithUnit
            label="Amount"
            prefix="₹"
            min={0}
            value={charge.amount ?? ''}
            error={errors[`pricing.otherCharges.${index}.amount`]}
            disabled={disabled}
            readout={
              charge.amount === null || charge.amount === '' ? null : formatPrice(charge.amount)
            }
            onChange={(amount) => onUpdate?.(charge.id, { amount })}
          />
          <TextField
            label="Note"
            value={charge.note ?? ''}
            error={errors[`pricing.otherCharges.${index}.note`]}
            disabled={disabled}
            maxLength={200}
            placeholder="One-time, refundable…"
            onChange={(event) => onUpdate?.(charge.id, { note: event.target.value })}
          />
          <span className={styles.rowAction}>
            <IconButton
              label={`Remove ${charge.label || 'this charge'}`}
              size="sm"
              disabled={disabled}
              onClick={() => onRemove?.(charge.id)}
            >
              <Icon icon="mdi:close" width="18" height="18" />
            </IconButton>
          </span>
        </div>
      ))}

      {total > 0 ? (
        <p className={styles.total}>
          <span>Other charges, added up</span>
          <span className={styles.totalValue}>{formatPrice(total)}</span>
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onAdd?.()}
          icon={<Icon icon="mdi:plus" width="16" height="16" />}
        >
          Add a charge
        </Button>
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onAdd?.({ label: preset.label, note: preset.note ?? '' })}
            icon={<Icon icon="mdi:playlist-plus" width="16" height="16" />}
          >
            Add {preset.label.toLowerCase()}
          </Button>
        ))}
      </div>

      {note ? <p className={styles.empty}>{note}</p> : null}
    </div>
  );
}
