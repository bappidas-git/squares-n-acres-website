import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import LeadForm from '../../components/common/LeadForm';
import styles from './InteriorDesigning.module.css';

/* ── Animated section wrapper ──────────────────── */
const Section = ({ children, className = '', delay = 0 }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <motion.section
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.section>
  );
};

/* ── Static data ───────────────────────────────── */
const roomCategories = [
  {
    title: 'Living Room',
    icon: 'mdi:sofa-outline',
    desc: 'Create a welcoming living space with elegant furniture, lighting, and decor that reflects your style.',
    color: '#E8D5B7',
  },
  {
    title: 'Bedroom',
    icon: 'mdi:bed-outline',
    desc: 'Design a serene retreat with premium bedding, wardrobes, and ambient lighting for restful nights.',
    color: '#C5D5E8',
  },
  {
    title: 'Kitchen',
    icon: 'mdi:stove',
    desc: 'Modular kitchens with smart storage solutions, premium countertops, and efficient layouts.',
    color: '#D5E8C5',
  },
  {
    title: 'Bathroom',
    icon: 'mdi:shower-head',
    desc: 'Spa-like bathrooms with modern fixtures, elegant tiles, and functional storage solutions.',
    color: '#D5D5E8',
  },
  {
    title: 'Balcony',
    icon: 'mdi:flower-outline',
    desc: 'Transform your balcony into a cozy outdoor oasis with planters, seating, and mood lighting.',
    color: '#E8E5C5',
  },
  {
    title: 'Study Room',
    icon: 'mdi:desk-lamp',
    desc: 'Productive workspaces with ergonomic furniture, built-in shelving, and focused lighting.',
    color: '#E8D5D5',
  },
];

const processSteps = [
  { icon: 'mdi:chat-processing-outline', title: 'Consultation', desc: 'Share your vision, budget, and preferences in a detailed consultation with our design experts.' },
  { icon: 'mdi:lightbulb-outline', title: 'Concept', desc: 'We create mood boards, 3D visualizations, and concept designs for your review and feedback.' },
  { icon: 'mdi:pencil-ruler', title: 'Design', desc: 'Detailed technical drawings, material selections, and a comprehensive design plan is finalized.' },
  { icon: 'mdi:hammer-wrench', title: 'Execution', desc: 'Our skilled team brings the design to life with quality craftsmanship and project management.' },
  { icon: 'mdi:key-variant', title: 'Handover', desc: 'Final quality checks, walkthrough, and handover of your beautifully designed space.' },
];

const galleryItems = [
  { label: 'Modern Living Room', aspect: 'landscape' },
  { label: 'Luxury Bedroom', aspect: 'portrait' },
  { label: 'Modular Kitchen', aspect: 'landscape' },
  { label: 'Elegant Bathroom', aspect: 'square' },
  { label: 'Cozy Balcony', aspect: 'portrait' },
  { label: 'Home Office', aspect: 'landscape' },
  { label: 'Dining Area', aspect: 'square' },
  { label: 'Kids Room', aspect: 'landscape' },
];

const packages = [
  {
    name: 'Essential',
    price: '₹4-6 Lakh',
    unit: 'per room',
    features: [
      'Space planning & layout',
      'Basic furniture selection',
      'Wall painting & textures',
      'Basic lighting design',
      'Standard materials',
      '45-day delivery',
    ],
    highlighted: false,
  },
  {
    name: 'Premium',
    price: '₹7-10 Lakh',
    unit: 'per room',
    features: [
      'Everything in Essential',
      '3D visualization',
      'Custom furniture design',
      'Designer lighting fixtures',
      'Premium materials & finishes',
      'Smart home integration',
      '60-day delivery',
    ],
    highlighted: true,
  },
  {
    name: 'Luxury',
    price: '₹12+ Lakh',
    unit: 'per room',
    features: [
      'Everything in Premium',
      'Imported materials & brands',
      'Bespoke furniture & decor',
      'Complete home automation',
      'Art curation & styling',
      'Dedicated project manager',
      '90-day delivery',
    ],
    highlighted: false,
  },
];

const leadFields = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Full Name *' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address *' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  {
    name: 'propertyType',
    label: 'Property Type',
    type: 'select',
    required: true,
    placeholder: 'Select Property Type *',
    options: [
      { value: '1bhk', label: '1 BHK' },
      { value: '2bhk', label: '2 BHK' },
      { value: '3bhk', label: '3 BHK' },
      { value: '4bhk+', label: '4 BHK+' },
      { value: 'villa', label: 'Villa / Independent House' },
      { value: 'commercial', label: 'Commercial Space' },
    ],
  },
  {
    name: 'budget',
    label: 'Budget Range',
    type: 'select',
    required: false,
    placeholder: 'Select Budget Range',
    options: [
      { value: 'below-5L', label: 'Below ₹5 Lakhs' },
      { value: '5L-10L', label: '₹5 - ₹10 Lakhs' },
      { value: '10L-20L', label: '₹10 - ₹20 Lakhs' },
      { value: '20L-50L', label: '₹20 - ₹50 Lakhs' },
      { value: 'above-50L', label: 'Above ₹50 Lakhs' },
    ],
  },
  { name: 'message', label: 'Message', type: 'textarea', required: false, placeholder: 'Tell us about your design vision...' },
];

/* ── Component ─────────────────────────────────── */
const InteriorDesigning = () => {
  const [activeRoom, setActiveRoom] = useState(0);
  const selectRoom = useCallback((i) => setActiveRoom(i), []);

  return (
    <>
      <Helmet>
        <title>Interior Designing Services | H.O.M Advisory</title>
        <meta name="description" content="Transform your home with professional interior design services. From concept to execution, we create beautiful, functional living spaces in Bangalore." />
      </Helmet>

      <div className={styles.page}>
        {/* ── Hero ────────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />
          <motion.div
            className={styles.heroContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className={styles.heroBadge}>
              <Icon icon="mdi:palette-outline" /> Buyer Assistance
            </span>
            <h1 className={styles.heroTitle}>Interior Designing</h1>
            <p className={styles.heroSubtitle}>
              Transform your house into a home. Our expert designers create beautiful, functional
              spaces that reflect your personality and lifestyle.
            </p>
          </motion.div>
        </section>

        {/* ── Room Categories ─────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our Design Services</h2>
              <p className={styles.sectionSubtitle}>Expertly designed spaces for every room in your home</p>
            </div>

            <div className={styles.roomsGrid}>
              {roomCategories.map((room, i) => (
                <motion.div
                  key={i}
                  className={`${styles.roomCard} ${activeRoom === i ? styles.roomActive : ''}`}
                  onClick={() => selectRoom(i)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <div className={styles.roomImage} style={{ backgroundColor: room.color }}>
                    <Icon icon={room.icon} className={styles.roomIcon} />
                  </div>
                  <div className={styles.roomInfo}>
                    <h3 className={styles.roomTitle}>{room.title}</h3>
                    <p className={styles.roomDesc}>{room.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Design Process ──────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our Design Process</h2>
              <p className={styles.sectionSubtitle}>A streamlined 5-step process from concept to completion</p>
            </div>

            <div className={styles.processTimeline}>
              {processSteps.map((step, i) => (
                <motion.div
                  key={i}
                  className={styles.processStep}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <div className={styles.processMarker}>
                    <div className={styles.processNumber}>{i + 1}</div>
                    {i < processSteps.length - 1 && <div className={styles.processLine} />}
                  </div>
                  <div className={styles.processContent}>
                    <div className={styles.processIcon}>
                      <Icon icon={step.icon} />
                    </div>
                    <h3 className={styles.processTitle}>{step.title}</h3>
                    <p className={styles.processDesc}>{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Portfolio Gallery ────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our Portfolio</h2>
              <p className={styles.sectionSubtitle}>A glimpse into our recent design projects</p>
            </div>

            <div className={styles.gallery}>
              {galleryItems.map((item, i) => (
                <motion.div
                  key={i}
                  className={`${styles.galleryItem} ${styles[`gallery_${item.aspect}`]}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                >
                  <div className={styles.galleryPlaceholder}>
                    <Icon icon="mdi:image-outline" className={styles.galleryIcon} />
                    <span className={styles.galleryLabel}>{item.label}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Packages ────────────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Design Packages</h2>
              <p className={styles.sectionSubtitle}>Choose a package that fits your needs and budget</p>
            </div>

            <div className={styles.packagesGrid}>
              {packages.map((pkg, i) => (
                <motion.div
                  key={i}
                  className={`${styles.packageCard} ${pkg.highlighted ? styles.packageHighlighted : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  {pkg.highlighted && <div className={styles.packageBadge}>Most Popular</div>}
                  <h3 className={styles.packageName}>{pkg.name}</h3>
                  <div className={styles.packagePrice}>
                    <span className={styles.priceAmount}>{pkg.price}</span>
                    <span className={styles.priceUnit}>{pkg.unit}</span>
                  </div>
                  <ul className={styles.packageFeatures}>
                    {pkg.features.map((feat, fi) => (
                      <li key={fi} className={styles.featureItem}>
                        <Icon icon="mdi:check" className={styles.featureCheck} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <button className={`${styles.packageBtn} ${pkg.highlighted ? styles.packageBtnPrimary : ''}`}>
                    Get Started
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Lead Form ──────────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.formSection}>
              <div className={styles.formInfo}>
                <h2 className={styles.sectionTitle}>Book a Free Consultation</h2>
                <p className={styles.formInfoText}>
                  Ready to transform your space? Share your requirements and our design experts
                  will create a personalized plan just for you.
                </p>
                <div className={styles.formBenefits}>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:currency-inr" className={styles.benefitIcon} />
                    <span>Free Design Consultation</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:cube-scan" className={styles.benefitIcon} />
                    <span>3D Visualizations</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:shield-check-outline" className={styles.benefitIcon} />
                    <span>10-Year Warranty</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:truck-fast-outline" className={styles.benefitIcon} />
                    <span>On-Time Delivery</span>
                  </div>
                </div>
              </div>
              <LeadForm
                title="Book a Free Consultation"
                subtitle="Tell us about your dream space"
                fields={leadFields}
                source="interior_design"
              />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default InteriorDesigning;
