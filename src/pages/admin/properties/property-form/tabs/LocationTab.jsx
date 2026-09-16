import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import Autocomplete from '@mui/material/Autocomplete';
import MuiTextField from '@mui/material/TextField';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import {
  Button,
  Field,
  SelectField,
  SwitchField,
  TextField,
  TextareaField,
  UrlField,
} from '../../../../../components/ui';
import { useCities, useLocalities } from '../../../../../hooks/useMasterData';
import { useMasterData } from '../../../../../contexts/MasterDataContext';
import { useSiteSettings } from '../../../../../contexts/SiteSettingsContext';
import { useToast } from '../../../../../components/common/ToastProvider';
import { makeNearbyPlace } from '../initialState';
import LocalityQuickCreateDialog from '../components/LocalityQuickCreateDialog';
import MapPinPicker, { roundCoordinate } from '../components/MapPinPicker';
import NearbyPlacesRepeater from '../components/NearbyPlacesRepeater';
import NumberWithUnit from '../components/NumberWithUnit';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/** The build-time key; the runtime one in settings wins over it (§5 of prompt 19). */
const ENV_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || '';

/**
 * Tab 2 — Location.
 *
 * Where the property is, at three levels of precision: the locality, which is
 * what the site navigates by and what a visitor always sees; the address, which
 * is what a site visit needs; and the coordinates, which draw the map. The
 * switch at the bottom decides how much of the second one the public page is
 * allowed to print.
 */
export default function LocationTab() {
  const {
    values,
    errors,
    setField,
    setFields,
    addItem,
    removeItem,
    moveItem,
    updateItem,
    disabled,
  } = usePropertyFormContext();

  const localities = useLocalities();
  const cities = useCities();
  const { refresh } = useMasterData();
  const { settings } = useSiteSettings();
  const toast = useToast();

  const [creating, setCreating] = useState(false);

  const location = values.location ?? {};
  const mapsKey = settings?.integrations?.googleMapsApiKey || ENV_MAPS_KEY;

  const localityOptions = useMemo(
    () =>
      localities.map((locality) => ({
        id: locality.id,
        label: locality.name,
        cityId: locality.cityId,
        latitude: locality.latitude,
        longitude: locality.longitude,
      })),
    [localities]
  );

  const selectedLocality =
    localityOptions.find((option) => option.id === location.localityId) ?? null;

  /** The city follows the locality: one choice, never two (§6.2). */
  const chooseLocality = (option) => {
    setFields({
      'location.localityId': option?.id ?? null,
      'location.cityId': option?.cityId ?? null,
    });
  };

  const localityRecord = localities.find((entry) => entry.id === location.localityId) ?? null;
  const localityHasCentre =
    localityRecord?.latitude !== null &&
    localityRecord?.latitude !== undefined &&
    localityRecord?.longitude !== null &&
    localityRecord?.longitude !== undefined;

  const useLocalityCentre = () => {
    if (!localityHasCentre) return;
    setFields({
      'location.latitude': roundCoordinate(localityRecord.latitude),
      'location.longitude': roundCoordinate(localityRecord.longitude),
    });
  };

  const writeCoordinates = ({ latitude, longitude }) =>
    setFields({ 'location.latitude': latitude, 'location.longitude': longitude });

  return (
    <>
      <FormSection
        title="Address"
        description="The locality drives the URL, the breadcrumb and half the site's navigation, so it is the one part of an address a listing cannot go without."
      >
        <FormColumn half>
          <Field
            id="property-locality"
            label="Locality"
            required
            error={errors['location.localityId']}
            hint="Type to search. The city is filled in from the locality."
          >
            {({ hintId, errorId }) => (
              <Autocomplete
                id="property-locality"
                disabled={disabled}
                options={localityOptions}
                value={selectedLocality}
                onChange={(_event, option) => chooseLocality(option)}
                getOptionLabel={(option) => option?.label ?? ''}
                isOptionEqualToValue={(option, current) => option.id === current?.id}
                renderInput={(params) => (
                  <MuiTextField
                    {...params}
                    size="small"
                    placeholder="Search localities…"
                    error={Boolean(errors['location.localityId'])}
                    inputProps={{
                      ...params.inputProps,
                      'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined,
                    }}
                  />
                )}
              />
            )}
          </Field>
          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => setCreating(true)}
              icon={<Icon icon="mdi:map-marker-plus-outline" width="16" height="16" />}
            >
              Add a new locality
            </Button>
          </div>
        </FormColumn>

        <FormColumn half>
          <SelectField
            label="City"
            required
            placeholder="Select a city"
            options={cities.map((city) => ({ value: city.id, label: city.name }))}
            value={location.cityId ?? ''}
            error={errors['location.cityId']}
            disabled={disabled}
            hint="Filled in from the locality; change it only when the locality spans two cities."
            onChange={(event) =>
              setField(
                'location.cityId',
                event.target.value === '' ? null : Number(event.target.value)
              )
            }
          />
        </FormColumn>

        <FormColumn>
          <TextareaField
            label="Address"
            rows={2}
            value={location.address ?? ''}
            error={errors['location.address']}
            disabled={disabled}
            maxLength={300}
            hint="Street and building. Shown in full only when “Show the exact location” is on."
            onChange={(event) => setField('location.address', event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
          <TextField
            label="Pincode"
            inputMode="numeric"
            maxLength={6}
            value={location.pincode ?? ''}
            error={errors['location.pincode']}
            disabled={disabled}
            placeholder="560066"
            onChange={(event) =>
              setField('location.pincode', event.target.value.replace(/\D/g, '').slice(0, 6))
            }
          />
        </FormColumn>

        <FormColumn half>
          <TextField
            label="Landmark"
            value={location.landmark ?? ''}
            error={errors['location.landmark']}
            disabled={disabled}
            maxLength={150}
            placeholder="e.g. Opposite Phoenix Marketcity"
            hint="What somebody would tell a driver."
            onChange={(event) => setField('location.landmark', event.target.value)}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="On the map"
        description="Coordinates draw the map on the listing page and feed the Place structured data."
      >
        <FormColumn half>
          <NumberWithUnit
            label="Latitude"
            step={0.000001}
            min={-90}
            max={90}
            value={location.latitude ?? ''}
            error={errors['location.latitude']}
            disabled={disabled}
            hint="Between −90 and 90."
            onChange={(latitude) => setField('location.latitude', latitude)}
            onBlurValue={(latitude) => setField('location.latitude', roundCoordinate(latitude))}
          />
        </FormColumn>

        <FormColumn half>
          <NumberWithUnit
            label="Longitude"
            step={0.000001}
            min={-180}
            max={180}
            value={location.longitude ?? ''}
            error={errors['location.longitude']}
            disabled={disabled}
            hint="Between −180 and 180."
            onChange={(longitude) => setField('location.longitude', longitude)}
            onBlurValue={(longitude) => setField('location.longitude', roundCoordinate(longitude))}
          />
        </FormColumn>

        <FormColumn>
          <MapPinPicker
            apiKey={mapsKey}
            latitude={location.latitude}
            longitude={location.longitude}
            disabled={disabled}
            onChange={writeCoordinates}
            onScriptError={(message) => toast.warning(message)}
            onUseLocalityCentre={localityHasCentre ? useLocalityCentre : undefined}
            localityName={localityRecord?.name}
          />
        </FormColumn>

        <FormColumn>
          <UrlField
            label="Map embed URL"
            value={location.mapEmbedUrl ?? ''}
            error={errors['location.mapEmbedUrl']}
            disabled={disabled}
            hint="Optional. A custom embed — a shared Google My Maps, say — shown instead of the generated map."
            onChange={(event) => setField('location.mapEmbedUrl', event.target.value)}
          />
        </FormColumn>

        <FormColumn>
          <SwitchField
            label="Show the exact location"
            checked={location.showExactLocation === true}
            disabled={disabled}
            hint="When off, the public page shows the locality only."
            onChange={(checked) => setField('location.showExactLocation', checked)}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Nearby places"
        description="Schools, metro stations, hospitals and offices, grouped the way the listing page groups them."
      >
        <FormColumn>
          <NearbyPlacesRepeater
            places={values.nearbyPlaces ?? []}
            errors={errors}
            disabled={disabled}
            onAdd={(category) => addItem('nearbyPlaces', makeNearbyPlace({ category }))}
            onUpdate={(id, patch) => updateItem('nearbyPlaces', id, patch)}
            onRemove={(id) => removeItem('nearbyPlaces', id)}
            onMove={(from, to) => moveItem('nearbyPlaces', from, to)}
          />
        </FormColumn>
      </FormSection>

      <LocalityQuickCreateDialog
        open={creating}
        cities={cities}
        defaultCityId={location.cityId}
        onClose={() => setCreating(false)}
        onCreated={async (locality) => {
          setCreating(false);
          if (!locality) return;
          // The context is what every locality list in the app reads, so the new
          // record has to land there before it can be selected here.
          await refresh('localities');
          setFields({
            'location.localityId': locality.id,
            'location.cityId': locality.cityId ?? location.cityId ?? null,
          });
          toast.success(`${locality.name} was added.`);
        }}
      />
    </>
  );
}
