import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import Slider from 'react-slick';
import { propertyService } from '../../../services/api';
import PropertyCard from '../../common/PropertyCard';
import styles from './SimilarProperties.module.css';

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const PrevArrow = ({ onClick }) => (
  <button className={`${styles.slickArrow} ${styles.slickPrev}`} onClick={onClick} aria-label="Previous">
    <Icon icon="mdi:chevron-left" />
  </button>
);

const NextArrow = ({ onClick }) => (
  <button className={`${styles.slickArrow} ${styles.slickNext}`} onClick={onClick} aria-label="Next">
    <Icon icon="mdi:chevron-right" />
  </button>
);

const SimilarProperties = ({ currentProperty }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (!currentProperty?.type) {
      setLoading(false);
      return;
    }
    const fetchSimilar = async () => {
      try {
        const data = await propertyService.getAll({
          type: currentProperty.type,
          is_active: true,
          per_page: 6,
        });
        const filtered = Array.isArray(data) ? data : [];
        setProperties(
          filtered
            .filter((p) => p.id !== currentProperty.id && !!p.isActive && p.publishStatus !== 'draft')
            .slice(0, 4)
        );
      } catch {
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSimilar();
  }, [currentProperty]);

  if (!currentProperty || loading || properties.length === 0) return null;

  const settings = {
    dots: true,
    infinite: properties.length > 3,
    speed: 500,
    slidesToShow: Math.min(3, properties.length),
    slidesToScroll: 1,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    responsive: [
      {
        breakpoint: 960,
        settings: { slidesToShow: 2, slidesToScroll: 1 },
      },
      {
        breakpoint: 600,
        settings: { slidesToShow: 1, slidesToScroll: 1, arrows: false },
      },
    ],
  };

  return (
    <section className={styles.section} ref={ref} id="similar">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Similar Properties Near You</h2>
          <Link to="/properties" className={styles.viewAll}>
            View All <Icon icon="mdi:arrow-right" />
          </Link>
        </div>

        <Slider {...settings} className={styles.slider}>
          {properties.map((property) => (
            <div key={property.id} className={styles.slideItem}>
              <PropertyCard property={property} />
            </div>
          ))}
        </Slider>
      </motion.div>
    </section>
  );
};

export default SimilarProperties;
