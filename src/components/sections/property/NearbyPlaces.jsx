import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './NearbyPlaces.module.css';

const typeConfig = {
  education: { icon: 'mdi:school', label: 'Schools' },
  healthcare: { icon: 'mdi:hospital-box', label: 'Hospitals' },
  shopping: { icon: 'mdi:shopping', label: 'Shopping' },
  transport: { icon: 'mdi:train-car', label: 'Transportation' },
  workplace: { icon: 'mdi:office-building', label: 'Workplaces' },
  landmark: { icon: 'mdi:map-marker-star', label: 'Landmarks' },
  entertainment: { icon: 'mdi:theater', label: 'Entertainment' },
};

const isValidCoordinate = (lat, lng) => {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  return (
    !isNaN(latNum) &&
    !isNaN(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180 &&
    (latNum !== 0 || lngNum !== 0)
  );
};

const NearbyPlaces = ({ nearbyPlaces = [], location }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  const categories = [...new Set(nearbyPlaces.map((p) => p.type))];
  const [activeCategory, setActiveCategory] = useState(categories[0] || '');

  const hasValidCoords = useMemo(
    () => location && isValidCoordinate(location.lat, location.lng),
    [location]
  );

  if (nearbyPlaces.length === 0) return null;

  const filteredPlaces = activeCategory
    ? nearbyPlaces.filter((p) => p.type === activeCategory)
    : nearbyPlaces;

  const mapSrc = hasValidCoords
    ? `https://maps.google.com/maps?q=${encodeURIComponent(`${Number(location.lat)},${Number(location.lng)}`)}&z=15&output=embed`
    : null;

  return (
    <section className={styles.section} ref={ref} id="nearby">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.title}>Location & Neighbourhood</h2>

        <div className={styles.tabs}>
          {categories.map((cat) => {
            const config = typeConfig[cat] || { icon: 'mdi:map-marker', label: cat };
            return (
              <button
                key={cat}
                className={`${styles.tab} ${activeCategory === cat ? styles.tabActive : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <Icon icon={config.icon} className={styles.tabIcon} />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>

        {hasValidCoords ? (
          <div className={styles.mapContainer}>
            <iframe
              title="Property Location"
              src={mapSrc}
              className={styles.mapIframe}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <div className={styles.mapPlaceholder}>
            <Icon icon="mdi:map-outline" className={styles.mapIcon} />
            <span>Map view available on live version</span>
          </div>
        )}

        <div className={styles.placesList}>
          {filteredPlaces.map((place, idx) => {
            const config = typeConfig[place.type] || { icon: 'mdi:map-marker' };
            return (
              <motion.div
                key={idx}
                className={styles.placeItem}
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <div className={styles.placeIcon}>
                  <Icon icon={config.icon} />
                </div>
                <div className={styles.placeInfo}>
                  <span className={styles.placeName}>{place.name || 'Unknown Place'}</span>
                  <span className={styles.placeType}>{typeConfig[place.type]?.label || place.type || 'Other'}</span>
                </div>
                <span className={styles.placeDistance}>{place.distance || '—'}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};

export default NearbyPlaces;
