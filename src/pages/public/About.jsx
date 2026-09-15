import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import styles from './About.module.css';

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

/* ── Animated Counter ──────────────────────────── */
const Counter = ({ end, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.5 });
  const counted = useRef(false);

  useEffect(() => {
    if (inView && !counted.current) {
      counted.current = true;
      const duration = 2000;
      const steps = 60;
      const increment = end / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [inView, end]);

  return <span ref={ref}>{count.toLocaleString('en-IN')}{suffix}</span>;
};

/* ── Static data ───────────────────────────────── */
const timeline = [
  { year: '2015', title: 'The Beginning', desc: 'H.O.M Advisory was founded with a vision to transform the real estate experience in Bangalore.' },
  { year: '2017', title: 'Growing Footprint', desc: 'Expanded operations across all major Bangalore neighborhoods, establishing key partnerships with top builders.' },
  { year: '2019', title: 'Digital Transformation', desc: 'Launched our digital platform, making property search and transaction management seamless for clients.' },
  { year: '2021', title: 'Regional Expansion', desc: 'Extended advisory services to other major cities in Karnataka and South India.' },
  { year: '2023', title: 'Industry Recognition', desc: 'Recognized as one of the top real estate advisory firms in South India with multiple industry awards.' },
  { year: '2024', title: 'Innovation & Growth', desc: 'Introduced AI-powered property matching and expanded our team to 100+ professionals.' },
];

const values = [
  { icon: 'mdi:handshake-outline', title: 'Integrity', desc: 'We maintain the highest ethical standards in every transaction, ensuring transparency and honesty in all our dealings.' },
  { icon: 'mdi:lightbulb-outline', title: 'Innovation', desc: 'We leverage cutting-edge technology and fresh approaches to deliver the best real estate solutions to our clients.' },
  { icon: 'mdi:heart-outline', title: 'Client First', desc: 'Every decision we make is guided by what\'s best for our clients. Your dream home is our ultimate mission.' },
];

const team = [
  { name: 'Rajesh Kumar', role: 'Founder & CEO', image: null },
  { name: 'Priya Sharma', role: 'Head of Operations', image: null },
  { name: 'Arjun Reddy', role: 'Chief Technology Officer', image: null },
  { name: 'Meera Patel', role: 'Head of Sales', image: null },
  { name: 'Vikram Singh', role: 'Legal Head', image: null },
  { name: 'Ananya Das', role: 'Marketing Director', image: null },
];

const stats = [
  { value: 2500, suffix: '+', label: 'Properties Listed' },
  { value: 1800, suffix: '+', label: 'Happy Clients' },
  { value: 12, suffix: '+', label: 'Cities' },
  { value: 9, suffix: '+', label: 'Years Experience' },
];

const testimonials = [
  { name: 'Suresh Menon', role: 'Home Buyer', text: 'H.O.M Advisory made our dream of owning a home in Bangalore a reality. Their team was incredibly supportive throughout the entire process.' },
  { name: 'Kavitha Nair', role: 'Property Investor', text: 'The best real estate advisory I\'ve worked with. Their market knowledge and professional approach helped me make smart investment decisions.' },
  { name: 'Deepak Gupta', role: 'First-time Buyer', text: 'As a first-time home buyer, I was overwhelmed. H.O.M\'s team guided me through every step — from loan to registration. Highly recommended!' },
  { name: 'Lakshmi Rao', role: 'NRI Investor', text: 'Managing property investments from abroad was challenging until I found H.O.M Advisory. They handle everything with utmost professionalism.' },
];

/* ── Component ─────────────────────────────────── */
const About = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Helmet>
        <title>About Us | H.O.M Advisory</title>
        <meta name="description" content="Learn about H.O.M Advisory — Bangalore's trusted real estate partner. Discover our story, mission, team, and commitment to helping you find your dream home." />
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
              <Icon icon="mdi:information-outline" /> About Us
            </span>
            <h1 className={styles.heroTitle}>Your Trusted Real Estate Partner</h1>
            <p className={styles.heroSubtitle}>
              At H.O.M Advisory, we believe everyone deserves a place they can truly call home.
              We're committed to making that journey seamless, transparent, and joyful.
            </p>
          </motion.div>
        </section>

        {/* ── Our Story / Timeline ─────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our Story</h2>
              <p className={styles.sectionSubtitle}>A journey of growth, trust, and transformation in real estate</p>
            </div>

            <div className={styles.timeline}>
              {timeline.map((item, i) => (
                <motion.div
                  key={i}
                  className={styles.timelineItem}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineYear}>{item.year}</span>
                    <h3 className={styles.timelineTitle}>{item.title}</h3>
                    <p className={styles.timelineDesc}>{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Mission, Vision, Values ──────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our Values</h2>
              <p className={styles.sectionSubtitle}>The principles that guide everything we do</p>
            </div>

            <div className={styles.valuesGrid}>
              {values.map((v, i) => (
                <motion.div
                  key={i}
                  className={styles.valueCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                >
                  <div className={styles.valueIcon}>
                    <Icon icon={v.icon} />
                  </div>
                  <h3 className={styles.valueTitle}>{v.title}</h3>
                  <p className={styles.valueDesc}>{v.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className={styles.mvGrid}>
              <div className={styles.mvCard}>
                <Icon icon="mdi:target" className={styles.mvIcon} />
                <h3 className={styles.mvTitle}>Our Mission</h3>
                <p className={styles.mvDesc}>
                  To simplify the real estate journey for every individual by providing expert
                  guidance, transparent processes, and unwavering support from search to settlement.
                </p>
              </div>
              <div className={styles.mvCard}>
                <Icon icon="mdi:eye-outline" className={styles.mvIcon} />
                <h3 className={styles.mvTitle}>Our Vision</h3>
                <p className={styles.mvDesc}>
                  To be India's most trusted real estate advisory firm, known for integrity,
                  innovation, and an unparalleled client experience that transforms how people
                  find their dream homes.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Our Numbers ──────────────────────────── */}
        <Section className={styles.statsSection}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our Numbers</h2>
              <p className={styles.sectionSubtitle}>Impact that speaks for itself</p>
            </div>

            <div className={styles.statsGrid}>
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  className={styles.statCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <span className={styles.statValue}>
                    <Counter end={stat.value} suffix={stat.suffix} />
                  </span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Team Section ─────────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Meet Our Team</h2>
              <p className={styles.sectionSubtitle}>The passionate professionals behind your real estate success</p>
            </div>

            <div className={styles.teamGrid}>
              {team.map((member, i) => (
                <motion.div
                  key={i}
                  className={styles.teamCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <div className={styles.teamPhoto}>
                    <Icon icon="mdi:account-circle" className={styles.teamPlaceholder} />
                  </div>
                  <h3 className={styles.teamName}>{member.name}</h3>
                  <span className={styles.teamRole}>{member.role}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Testimonials ─────────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>What Our Clients Say</h2>
              <p className={styles.sectionSubtitle}>Real stories from real people we've helped</p>
            </div>

            <div className={styles.testimonialWrapper}>
              <div className={styles.testimonialCard}>
                <Icon icon="mdi:format-quote-open" className={styles.quoteIcon} />
                <p className={styles.testimonialText}>
                  {testimonials[activeTestimonial].text}
                </p>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.authorAvatar}>
                    <Icon icon="mdi:account-circle" />
                  </div>
                  <div>
                    <span className={styles.authorName}>{testimonials[activeTestimonial].name}</span>
                    <span className={styles.authorRole}>{testimonials[activeTestimonial].role}</span>
                  </div>
                </div>
              </div>

              <div className={styles.testimonialDots}>
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.dot} ${i === activeTestimonial ? styles.dotActive : ''}`}
                    onClick={() => setActiveTestimonial(i)}
                    aria-label={`Testimonial ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── CTA ──────────────────────────────────── */}
        <Section className={styles.ctaSection}>
          <div className={styles.container}>
            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>Join Our Growing Family of Happy Homeowners</h2>
              <p className={styles.ctaSubtitle}>
                Whether you're buying your first home or investing in your future, we're here to make it happen.
              </p>
              <div className={styles.ctaButtons}>
                <Link to="/properties" className={styles.ctaBtnPrimary}>
                  Browse Properties <Icon icon="mdi:arrow-right" />
                </Link>
                <Link to="/contact" className={styles.ctaBtnSecondary}>
                  Get in Touch <Icon icon="mdi:message-text-outline" />
                </Link>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default About;
