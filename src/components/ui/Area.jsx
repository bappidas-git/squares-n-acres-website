import { formatArea } from '../../utils/format';

/**
 * An area with its unit — `1,650 sq ft`.
 *
 * @param {object} props
 * @param {number|string|null} props.value
 * @param {string} [props.unit]
 * @param {string} [props.label] small prefix, e.g. "Carpet"
 */
export default function Area({ value, unit = 'sq ft', label, as: Tag = 'span', ...rest }) {
  return (
    <Tag {...rest}>
      {label ? `${label} ` : ''}
      {formatArea(value, unit)}
    </Tag>
  );
}
