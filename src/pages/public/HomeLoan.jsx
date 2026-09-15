import React, { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import LeadForm from '../../components/common/LeadForm';
import styles from './HomeLoan.module.css';

/* ── EMI helpers ────────────────────────────────── */
const calcEMI = (principal, rate, years) => {
  const r = rate / 12 / 100;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

const formatCurrency = (val) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const formatCurrencyFull = (val) => `₹${Math.round(val).toLocaleString('en-IN')}`;

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

/* ── Donut chart via SVG ───────────────────────── */
const DonutChart = ({ principal, interest }) => {
  const total = principal + interest;
  if (total === 0) return null;
  const principalPct = principal / total;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const principalDash = principalPct * circumference;

  return (
    <div className={styles.donutWrapper}>
      <svg viewBox="0 0 200 200" className={styles.donut}>
        {/* Interest (background) */}
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#1B2A4A" strokeWidth="24" />
        {/* Principal (foreground) */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#C9A86C"
          strokeWidth="24"
          strokeDasharray={`${principalDash} ${circumference - principalDash}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
      </svg>
      <div className={styles.donutCenter}>
        <span className={styles.donutLabel}>Total</span>
        <span className={styles.donutValue}>{formatCurrency(total)}</span>
      </div>
      <div className={styles.donutLegend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#C9A86C' }} />
          Principal: {formatCurrency(principal)}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#1B2A4A' }} />
          Interest: {formatCurrency(interest)}
        </span>
      </div>
    </div>
  );
};

/* ── Slider + Input combo ──────────────────────── */
const RangeInput = ({ label, value, min, max, step, unit, displayValue, onChange }) => (
  <div className={styles.rangeGroup}>
    <div className={styles.rangeHeader}>
      <span className={styles.rangeLabel}>{label}</span>
      <span className={styles.rangeValue}>{displayValue}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={styles.rangeSlider}
    />
    <div className={styles.rangeMinMax}>
      <span>{unit === '₹' ? formatCurrency(min) : `${min}${unit}`}</span>
      <span>{unit === '₹' ? formatCurrency(max) : `${max}${unit}`}</span>
    </div>
  </div>
);

/* ── Static data ───────────────────────────────── */
const steps = [
  { icon: 'mdi:file-document-check-outline', title: 'Check Eligibility', desc: 'Use our calculator and check your loan eligibility based on income and credit score.' },
  { icon: 'mdi:folder-upload-outline', title: 'Submit Documents', desc: 'Upload required documents including ID proof, income proof, and property papers.' },
  { icon: 'mdi:bank-check', title: 'Bank Processing', desc: 'The bank verifies your documents, conducts property valuation, and processes the application.' },
  { icon: 'mdi:cash-check', title: 'Loan Disbursement', desc: 'Once approved, the loan amount is disbursed to the seller or builder account.' },
];

const documents = [
  'PAN Card & Aadhaar Card',
  'Last 6 months bank statements',
  'Last 3 years IT returns / Form 16',
  'Salary slips (last 3 months)',
  'Property agreement / allotment letter',
  'Property tax receipts',
  'Employer identity card',
  'Passport-size photographs',
];

const banks = [
  { name: 'SBI', icon: 'mdi:bank' },
  { name: 'HDFC', icon: 'mdi:bank' },
  { name: 'ICICI', icon: 'mdi:bank' },
  { name: 'Axis Bank', icon: 'mdi:bank' },
  { name: 'Kotak', icon: 'mdi:bank' },
  { name: 'PNB', icon: 'mdi:bank' },
  { name: 'Bank of Baroda', icon: 'mdi:bank' },
  { name: 'LIC Housing', icon: 'mdi:bank' },
];

const faqs = [
  { q: 'What is the minimum credit score required for a home loan?', a: 'Most banks require a minimum CIBIL score of 700 or above. However, some lenders may consider scores from 650 with higher interest rates.' },
  { q: 'Can I get a home loan for a property under construction?', a: 'Yes, banks offer home loans for under-construction properties. The loan amount is disbursed in stages based on the construction progress.' },
  { q: 'What is the maximum tenure for a home loan?', a: 'Most banks offer home loans for up to 30 years. The maximum tenure depends on your age at the time of loan maturity — typically up to 60-65 years of age.' },
  { q: 'Can I prepay my home loan without penalties?', a: 'For floating-rate home loans, RBI guidelines prohibit banks from charging prepayment or foreclosure penalties. Fixed-rate loans may have a prepayment charge.' },
  { q: 'How much home loan can I get based on my salary?', a: 'Generally, banks offer up to 60 times your monthly salary. The exact amount depends on your income, existing obligations, credit score, and the property value.' },
  { q: 'What are the tax benefits on a home loan?', a: 'You can claim up to ₹1.5 lakh deduction on principal repayment under Section 80C, and up to ₹2 lakh on interest under Section 24(b) for a self-occupied property.' },
];

const leadFields = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Full Name *' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address *' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  {
    name: 'monthlyIncome',
    label: 'Monthly Income',
    type: 'select',
    required: true,
    placeholder: 'Select Monthly Income *',
    options: [
      { value: 'below-50k', label: 'Below ₹50,000' },
      { value: '50k-1L', label: '₹50,000 - ₹1,00,000' },
      { value: '1L-2L', label: '₹1,00,000 - ₹2,00,000' },
      { value: '2L-5L', label: '₹2,00,000 - ₹5,00,000' },
      { value: 'above-5L', label: 'Above ₹5,00,000' },
    ],
  },
  {
    name: 'desiredLoanAmount',
    label: 'Desired Loan Amount',
    type: 'select',
    required: true,
    placeholder: 'Select Loan Amount *',
    options: [
      { value: 'below-30L', label: 'Below ₹30 Lakhs' },
      { value: '30L-50L', label: '₹30 - ₹50 Lakhs' },
      { value: '50L-1Cr', label: '₹50 Lakhs - ₹1 Crore' },
      { value: '1Cr-2Cr', label: '₹1 - ₹2 Crore' },
      { value: 'above-2Cr', label: 'Above ₹2 Crore' },
    ],
  },
];

/* ── Component ─────────────────────────────────── */
const HomeLoan = () => {
  const [loanAmount, setLoanAmount] = useState(5000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = useCallback((i) => setOpenFaq((prev) => (prev === i ? null : i)), []);

  const { emi, totalInterest, totalAmount } = useMemo(() => {
    const monthlyEmi = calcEMI(loanAmount, interestRate, tenure);
    const total = monthlyEmi * tenure * 12;
    return {
      emi: monthlyEmi,
      totalInterest: total - loanAmount,
      totalAmount: total,
    };
  }, [loanAmount, interestRate, tenure]);

  return (
    <>
      <Helmet>
        <title>Home Loan Assistance | H.O.M Advisory</title>
        <meta name="description" content="Get expert home loan assistance with H.O.M Advisory. Use our EMI calculator, explore partner banks, and get pre-approved for your dream home in Bangalore." />
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
              <Icon icon="mdi:home-city-outline" /> Buyer Assistance
            </span>
            <h1 className={styles.heroTitle}>Home Loan Assistance</h1>
            <p className={styles.heroSubtitle}>
              Navigate the home loan process with confidence. Use our EMI calculator, compare rates,
              and get pre-approved with our trusted banking partners.
            </p>
          </motion.div>
        </section>

        {/* ── EMI Calculator ─────────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>EMI Calculator</h2>
              <p className={styles.sectionSubtitle}>Plan your home loan with our interactive EMI calculator</p>
            </div>

            <div className={styles.calcGrid}>
              <div className={styles.calcInputs}>
                <RangeInput
                  label="Loan Amount"
                  value={loanAmount}
                  min={1000000}
                  max={100000000}
                  step={100000}
                  unit="₹"
                  displayValue={formatCurrency(loanAmount)}
                  onChange={setLoanAmount}
                />
                <RangeInput
                  label="Interest Rate"
                  value={interestRate}
                  min={6}
                  max={15}
                  step={0.1}
                  unit="%"
                  displayValue={`${interestRate}%`}
                  onChange={setInterestRate}
                />
                <RangeInput
                  label="Loan Tenure"
                  value={tenure}
                  min={5}
                  max={30}
                  step={1}
                  unit=" yrs"
                  displayValue={`${tenure} Years`}
                  onChange={setTenure}
                />

                <div className={styles.emiResults}>
                  <div className={styles.emiCard}>
                    <span className={styles.emiLabel}>Monthly EMI</span>
                    <span className={styles.emiAmount}>{formatCurrencyFull(emi)}</span>
                  </div>
                  <div className={styles.emiCard}>
                    <span className={styles.emiLabel}>Total Interest</span>
                    <span className={styles.emiAmountSm}>{formatCurrency(totalInterest)}</span>
                  </div>
                  <div className={styles.emiCard}>
                    <span className={styles.emiLabel}>Total Amount</span>
                    <span className={styles.emiAmountSm}>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.calcChart}>
                <DonutChart principal={loanAmount} interest={totalInterest} />
              </div>
            </div>
          </div>
        </Section>

        {/* ── How to Apply ───────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>How to Apply</h2>
              <p className={styles.sectionSubtitle}>A simple 4-step process to get your home loan</p>
            </div>

            <div className={styles.stepsGrid}>
              {steps.map((s, i) => (
                <motion.div
                  key={i}
                  className={styles.stepCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <div className={styles.stepNumber}>{i + 1}</div>
                  <div className={styles.stepIcon}>
                    <Icon icon={s.icon} />
                  </div>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Required Documents ──────────────────── */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Required Documents</h2>
              <p className={styles.sectionSubtitle}>Keep these documents ready for a smooth application</p>
            </div>

            <div className={styles.docGrid}>
              {documents.map((doc, i) => (
                <motion.div
                  key={i}
                  className={styles.docItem}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <Icon icon="mdi:check-circle" className={styles.docCheck} />
                  <span>{doc}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Partner Banks ──────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our Partner Banks</h2>
              <p className={styles.sectionSubtitle}>We work with India's leading banks to get you the best rates</p>
            </div>

            <div className={styles.banksGrid}>
              {banks.map((bank, i) => (
                <motion.div
                  key={i}
                  className={styles.bankCard}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <Icon icon={bank.icon} className={styles.bankIcon} />
                  <span className={styles.bankName}>{bank.name}</span>
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
                <h2 className={styles.sectionTitle}>Get Pre-Approved</h2>
                <p className={styles.formInfoText}>
                  Fill in your details and our home loan experts will guide you through the entire process —
                  from eligibility check to final disbursement.
                </p>
                <div className={styles.formBenefits}>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:percent-circle-outline" className={styles.benefitIcon} />
                    <span>Lowest Interest Rates</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:clock-fast" className={styles.benefitIcon} />
                    <span>Quick Processing</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:file-document-check-outline" className={styles.benefitIcon} />
                    <span>Minimal Documentation</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:headset" className={styles.benefitIcon} />
                    <span>Dedicated Support</span>
                  </div>
                </div>
              </div>
              <LeadForm
                title="Get Pre-Approved Today"
                subtitle="Our experts will call you within 24 hours"
                fields={leadFields}
                source="home_loan"
              />
            </div>
          </div>
        </Section>

        {/* ── FAQs ───────────────────────────────── */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
              <p className={styles.sectionSubtitle}>Common questions about home loans answered</p>
            </div>

            <div className={styles.faqList}>
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}
                >
                  <button
                    className={styles.faqQuestion}
                    onClick={() => toggleFaq(i)}
                    aria-expanded={openFaq === i}
                  >
                    <span>{faq.q}</span>
                    <Icon
                      icon={openFaq === i ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                      className={styles.faqArrow}
                    />
                  </button>
                  <motion.div
                    className={styles.faqAnswer}
                    initial={false}
                    animate={{
                      height: openFaq === i ? 'auto' : 0,
                      opacity: openFaq === i ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <p>{faq.a}</p>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default HomeLoan;
