import Button from '../../ui/Button';
import EntityPicker from '../../admin/EntityPicker';
import Modal from '../../ui/Modal';
import propertyService from '../../../services/propertyService';

/**
 * The dialog behind a listings block's "Edit listings".
 *
 * It is a file of its own so the node view can reach it with a dynamic import:
 * the search picker is panel furniture nobody needs until they press the
 * button, and keeping it out of the editor's chunk keeps the editor's
 * stylesheet order independent of the rest of the panel's.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {Array<string>} props.ids
 * @param {(ids: Array<string>) => void} props.onChange
 * @param {() => void} props.onClose
 */
export default function PropertyPickerDialog({ open, ids, onChange, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Listings in this block"
      description="They are looked up when the page is read, so prices and availability stay current."
      size="md"
      mobile="fullscreen"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <EntityPicker
        label="Listings"
        labelKey="title"
        fetcher={(params, options) => propertyService.adminList(params, options)}
        value={ids}
        max={6}
        orderable
        placeholder="Search listings by title or locality…"
        hint="Up to six, in the order they should appear."
        onChange={(next) => onChange(next.map(String))}
      />
    </Modal>
  );
}
