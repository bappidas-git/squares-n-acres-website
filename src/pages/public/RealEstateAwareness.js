import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import LeadForm from '../../components/common/LeadForm';
import styles from './RealEstateAwareness.module.css';

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

/* ── Educational sections data ─────────────────── */
const educationalSections = [
  {
    id: 'rera',
    icon: 'mdi:shield-check-outline',
    title: 'Understanding RERA',
    summary: 'RERA protects homebuyers by regulating the real estate sector. Every project must be registered before sale.',
    content: [
      'RERA (Real Estate Regulatory Authority) was established under the Real Estate (Regulation and Development) Act, 2016 to protect homebuyers and promote transparency.',
      'Key protections include: mandatory project registration, 70% funds in escrow, carpet area-based pricing, timely delivery with penalties for delays, and a 5-year defect liability period.',
      'Always verify RERA registration on your state\'s RERA website before investing in any project. In Karnataka, visit rera.karnataka.gov.in.',
    ],
  },
  {
    id: 'registration',
    icon: 'mdi:file-document-edit-outline',
    title: 'Property Registration Process',
    summary: 'Property registration is mandatory under the Indian Registration Act. It gives legal validity to your ownership.',
    content: [
      'Steps: 1) Get the sale deed drafted by a lawyer. 2) Pay stamp duty (varies by state — 5% in Karnataka for properties above Rs 45L). 3) Pay registration charges (1% in Karnataka).',
      '4) Both buyer and seller must visit the Sub-Registrar office with witnesses. 5) Submit documents and biometric verification. 6) Collect the registered sale deed within 2-3 days.',
      'Documents needed: Sale deed, ID proofs, PAN cards, photographs, previous title documents, Encumbrance Certificate, and Khata Certificate.',
    ],
  },
  {
    id: 'home-loans',
    icon: 'mdi:bank-outline',
    title: 'Home Loan Basics',
    summary: 'Home loans make property ownership accessible. Banks finance up to 75-90% of the property value.',
    content: [
      'Eligibility factors: Age (21-60 years), income stability, credit score (700+ preferred), existing liabilities, and property value.',
      'Types of interest rates: Fixed (constant EMI, higher initial rate) vs Floating (linked to repo rate, lower initial rate but variable). Most buyers choose floating rates.',
      'Tax benefits: Section 80C deduction up to Rs 1.5L on principal, Section 24(b) up to Rs 2L on interest for self-occupied property. For joint loans, each borrower can claim separately.',
    ],
  },
  {
    id: 'tax-benefits',
    icon: 'mdi:percent-circle-outline',
    title: 'Tax Benefits on Property',
    summary: 'Homeowners enjoy significant tax benefits under the Income Tax Act. Plan wisely to maximize savings.',
    content: [
      'Section 80C: Deduction up to Rs 1.5 lakh per year on home loan principal repayment (including stamp duty and registration charges in the year of purchase).',
      'Section 24(b): Deduction up to Rs 2 lakh per year on home loan interest for self-occupied property. No upper limit for let-out properties.',
      'Section 80EEA: Additional Rs 1.5 lakh deduction on interest for affordable housing (stamp duty value up to Rs 45 lakhs). First-time buyers can combine 24(b) and 80EEA for up to Rs 3.5 lakh interest deduction.',
    ],
  },
  {
    id: 'stamp-duty',
    icon: 'mdi:stamp',
    title: 'Stamp Duty Guide',
    summary: 'Stamp duty is a state-levied tax on property transactions. Rates vary by state and property value.',
    content: [
      'Karnataka rates: 2% for properties up to Rs 20L, 3% for Rs 21-45L, 5% for above Rs 45L. Registration is an additional 1%.',
      'Stamp duty is calculated on the higher of: actual transaction value or government guidance value (circle rate).',
      'Payment options: E-stamping through SHCIL, online via Kaveri portal, or at authorized bank branches. Always get an e-stamping receipt as proof.',
    ],
  },
  {
    id: 'documents',
    icon: 'mdi:clipboard-check-outline',
    title: 'Documents Checklist',
    summary: 'Having the right documents ready ensures a smooth property transaction. Here\'s the complete list.',
    content: [
      'Buyer documents: PAN Card, Aadhaar Card, passport-size photos, bank statements (6 months), salary slips / ITR (3 years), Form 16, and employment letter.',
      'Property documents to verify: Title Deed (ownership chain for 30 years), Encumbrance Certificate (EC), Khata Certificate & Extract, approved building plan, RERA registration, Occupancy Certificate (OC), and Completion Certificate (CC).',
      'For home loan: All buyer documents plus property documents, property valuation report, builder NOC, society NOC (for resale), and allotment letter.',
    ],
  },
];

/* ── Did You Know facts ────────────────────────── */
const didYouKnowFacts = [
  { stat: '65,000+', label: 'New residential units launched in Bangalore in 2024', icon: 'mdi:home-city-outline' },
  { stat: '8-12%', label: 'Average annual property appreciation in top Indian cities', icon: 'mdi:trending-up' },
  { stat: '70%', label: 'Of project funds must be kept in escrow under RERA', icon: 'mdi:shield-lock-outline' },
  { stat: '5 Years', label: 'Defect liability period mandated by RERA for builders', icon: 'mdi:wrench-clock' },
  { stat: '₹3.5L', label: 'Maximum annual tax deduction on home loan interest', icon: 'mdi:cash-multiple' },
  { stat: '30 Days', label: 'Typical timeline for home loan processing', icon: 'mdi:timer-sand' },
];

/* ── Quiz data ─────────────────────────────────── */
const quizQuestions = [
  {
    question: 'What percentage of project funds must a developer keep in an escrow account under RERA?',
    options: ['50%', '60%', '70%', '80%'],
    correct: 2,
    explanation: 'RERA mandates that 70% of project funds collected from buyers must be deposited in a separate escrow account to prevent fund diversion.',
  },
  {
    question: 'What is the defect liability period under RERA after possession?',
    options: ['1 Year', '2 Years', '3 Years', '5 Years'],
    correct: 3,
    explanation: 'Under RERA, builders are liable for structural defects for 5 years after possession and must rectify them within 30 days.',
  },
  {
    question: 'What is the maximum home loan interest deduction under Section 24(b) for self-occupied property?',
    options: ['₹1 Lakh', '₹1.5 Lakhs', '₹2 Lakhs', 'No Limit'],
    correct: 2,
    explanation: 'Section 24(b) allows a maximum deduction of Rs 2 lakhs per year on home loan interest for a self-occupied property.',
  },
  {
    question: 'What does the Encumbrance Certificate (EC) verify?',
    options: ['Building quality', 'No pending loans or disputes', 'Property age', 'Tax compliance'],
    correct: 1,
    explanation: 'An Encumbrance Certificate confirms that the property is free from any monetary or legal liabilities such as unpaid loans or mortgages.',
  },
  {
    question: 'What is stamp duty rate in Karnataka for properties above Rs 45 lakhs?',
    options: ['2%', '3%', '5%', '7%'],
    correct: 2,
    explanation: 'In Karnataka, stamp duty is 5% for properties valued above Rs 45 lakhs, plus 1% registration charge.',
  },
];

/* ── Checklist data ────────────────────────────── */
const buyerChecklist = [
  { id: 1, text: 'Assessed budget and loan eligibility' },
  { id: 2, text: 'Researched locations and shortlisted properties' },
  { id: 3, text: 'Verified RERA registration of the project' },
  { id: 4, text: 'Checked title deed and ownership history (30 years)' },
  { id: 5, text: 'Obtained Encumbrance Certificate (EC)' },
  { id: 6, text: 'Verified approved building plan and OC/CC' },
  { id: 7, text: 'Compared home loan offers from multiple banks' },
  { id: 8, text: 'Calculated total cost including stamp duty and registration' },
  { id: 9, text: 'Reviewed sale agreement with a lawyer' },
  { id: 10, text: 'Conducted site inspection before possession' },
];

const leadFields = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Full Name *' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email Address *' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone Number *' },
  {
    name: 'interest',
    label: 'Interested In',
    type: 'select',
    required: true,
    placeholder: 'What are you looking for? *',
    options: [
      { value: 'buying', label: 'Buying a Property' },
      { value: 'selling', label: 'Selling a Property' },
      { value: 'renting', label: 'Renting a Property' },
      { value: 'home-loan', label: 'Home Loan Assistance' },
      { value: 'legal', label: 'Legal Assistance' },
      { value: 'general', label: 'General Consultation' },
    ],
  },
];

/* ── Component ─────────────────────────────────── */
const RealEstateAwareness = () => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [quizState, setQuizState] = useState({ current: 0, answers: {}, showResult: false });

  const toggleSection = useCallback(
    (id) => setExpandedSection((prev) => (prev === id ? null : id)),
    []
  );

  const toggleCheck = useCallback((id) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleQuizAnswer = (questionIdx, answerIdx) => {
    setQuizState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionIdx]: answerIdx },
    }));
  };

  const nextQuestion = () => {
    if (quizState.current < quizQuestions.length - 1) {
      setQuizState((prev) => ({ ...prev, current: prev.current + 1 }));
    } else {
      setQuizState((prev) => ({ ...prev, showResult: true }));
    }
  };

  const resetQuiz = () => {
    setQuizState({ current: 0, answers: {}, showResult: false });
  };

  const correctCount = Object.entries(quizState.answers).filter(
    ([qIdx, aIdx]) => quizQuestions[Number(qIdx)].correct === aIdx
  ).length;

  return (
    <>
      <Helmet>
        <title>Real Estate Awareness | Education & Guides | H.O.M Advisory</title>
        <meta
          name="description"
          content="Learn about RERA, property registration, home loans, tax benefits, stamp duty, and essential documents for real estate transactions in India."
        />
      </Helmet>

      <div className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />
          <motion.div
            className={styles.heroContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className={styles.heroBadge}>
              <Icon icon="mdi:school-outline" /> Education
            </span>
            <h1 className={styles.heroTitle}>Real Estate Awareness</h1>
            <p className={styles.heroSubtitle}>
              Empower yourself with knowledge about Indian real estate — from RERA regulations and
              property registration to home loans and tax benefits.
            </p>
          </motion.div>
        </section>

        {/* Did You Know */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Did You Know?</h2>
              <p className={styles.sectionSubtitle}>Key facts about Indian real estate</p>
            </div>
            <div className={styles.factsGrid}>
              {didYouKnowFacts.map((fact, i) => (
                <motion.div
                  key={i}
                  className={styles.factCard}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <Icon icon={fact.icon} className={styles.factIcon} />
                  <span className={styles.factStat}>{fact.stat}</span>
                  <span className={styles.factLabel}>{fact.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* Educational Sections */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Essential Knowledge</h2>
              <p className={styles.sectionSubtitle}>
                Everything you need to know before entering the real estate market
              </p>
            </div>
            <div className={styles.educationGrid}>
              {educationalSections.map((section, i) => (
                <motion.div
                  key={section.id}
                  className={`${styles.eduCard} ${expandedSection === section.id ? styles.eduCardExpanded : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <div className={styles.eduHeader}>
                    <div className={styles.eduIconWrap}>
                      <Icon icon={section.icon} />
                    </div>
                    <div className={styles.eduHeaderText}>
                      <h3 className={styles.eduTitle}>{section.title}</h3>
                      <p className={styles.eduSummary}>{section.summary}</p>
                      <button
                        className={styles.eduToggle}
                        onClick={() => toggleSection(section.id)}
                      >
                        {expandedSection === section.id ? 'Show Less' : 'Learn More'}
                        <Icon icon={expandedSection === section.id ? 'mdi:chevron-up' : 'mdi:chevron-down'} />
                      </button>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {expandedSection === section.id && (
                      <motion.div
                        className={styles.eduContent}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className={styles.eduContentInner}>
                          {section.content.map((para, pi) => (
                            <p key={pi}>{para}</p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* Interactive Quiz */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Test Your Knowledge</h2>
              <p className={styles.sectionSubtitle}>
                Take this quick quiz to see how much you know about Indian real estate
              </p>
            </div>
            <div className={styles.quizCard}>
              {!quizState.showResult ? (
                <>
                  <div className={styles.quizProgress}>
                    <div
                      className={styles.quizProgressBar}
                      style={{ width: `${((quizState.current + 1) / quizQuestions.length) * 100}%` }}
                    />
                  </div>
                  <span className={styles.quizCounter}>
                    Question {quizState.current + 1} of {quizQuestions.length}
                  </span>
                  <h3 className={styles.quizQuestion}>
                    {quizQuestions[quizState.current].question}
                  </h3>
                  <div className={styles.quizOptions}>
                    {quizQuestions[quizState.current].options.map((opt, oi) => {
                      const selected = quizState.answers[quizState.current] === oi;
                      const answered = quizState.answers[quizState.current] !== undefined;
                      const isCorrect = oi === quizQuestions[quizState.current].correct;
                      let optClass = styles.quizOption;
                      if (answered && selected && isCorrect) optClass += ` ${styles.quizCorrect}`;
                      else if (answered && selected && !isCorrect) optClass += ` ${styles.quizWrong}`;
                      else if (answered && isCorrect) optClass += ` ${styles.quizCorrect}`;

                      return (
                        <button
                          key={oi}
                          className={optClass}
                          onClick={() => !answered && handleQuizAnswer(quizState.current, oi)}
                          disabled={answered}
                        >
                          <span className={styles.optionLetter}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                          {answered && isCorrect && (
                            <Icon icon="mdi:check-circle" className={styles.optionCheck} />
                          )}
                          {answered && selected && !isCorrect && (
                            <Icon icon="mdi:close-circle" className={styles.optionClose} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {quizState.answers[quizState.current] !== undefined && (
                    <motion.div
                      className={styles.quizExplanation}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Icon icon="mdi:lightbulb-outline" />
                      <p>{quizQuestions[quizState.current].explanation}</p>
                    </motion.div>
                  )}
                  {quizState.answers[quizState.current] !== undefined && (
                    <button className={styles.quizNextBtn} onClick={nextQuestion}>
                      {quizState.current < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                      <Icon icon="mdi:arrow-right" />
                    </button>
                  )}
                </>
              ) : (
                <div className={styles.quizResult}>
                  <div className={styles.quizScore}>
                    <span className={styles.scoreNumber}>{correctCount}</span>
                    <span className={styles.scoreTotal}>/ {quizQuestions.length}</span>
                  </div>
                  <h3 className={styles.quizResultTitle}>
                    {correctCount === quizQuestions.length
                      ? 'Perfect Score!'
                      : correctCount >= 3
                        ? 'Well Done!'
                        : 'Keep Learning!'}
                  </h3>
                  <p className={styles.quizResultText}>
                    You answered {correctCount} out of {quizQuestions.length} questions correctly.
                    {correctCount < quizQuestions.length &&
                      ' Review the educational sections above to strengthen your knowledge.'}
                  </p>
                  <button className={styles.quizRetryBtn} onClick={resetQuiz}>
                    <Icon icon="mdi:refresh" /> Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Buyer Checklist */}
        <Section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Homebuyer Checklist</h2>
              <p className={styles.sectionSubtitle}>
                Track your progress with this interactive checklist
              </p>
            </div>
            <div className={styles.checklistCard}>
              <div className={styles.checklistProgress}>
                <div className={styles.checklistProgressInfo}>
                  <span>{checkedItems.size} of {buyerChecklist.length} completed</span>
                  <span>{Math.round((checkedItems.size / buyerChecklist.length) * 100)}%</span>
                </div>
                <div className={styles.checklistBar}>
                  <div
                    className={styles.checklistBarFill}
                    style={{ width: `${(checkedItems.size / buyerChecklist.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className={styles.checklistItems}>
                {buyerChecklist.map((item, i) => (
                  <motion.label
                    key={item.id}
                    className={`${styles.checklistItem} ${checkedItems.has(item.id) ? styles.checklistItemDone : ''}`}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <input
                      type="checkbox"
                      checked={checkedItems.has(item.id)}
                      onChange={() => toggleCheck(item.id)}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkmark}>
                      {checkedItems.has(item.id) && <Icon icon="mdi:check" />}
                    </span>
                    <span className={styles.checklistText}>{item.text}</span>
                  </motion.label>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* CTA */}
        <Section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.ctaSection}>
              <div className={styles.ctaInfo}>
                <h2 className={styles.sectionTitle}>Need Help Navigating Your Real Estate Journey?</h2>
                <p className={styles.ctaText}>
                  Our experienced team at H.O.M Advisory is here to guide you through every step —
                  from property search and legal verification to home loan processing and registration.
                </p>
                <div className={styles.ctaBenefits}>
                  <div className={styles.ctaBenefit}>
                    <Icon icon="mdi:check-decagram" className={styles.ctaBenefitIcon} />
                    <span>Free expert consultation</span>
                  </div>
                  <div className={styles.ctaBenefit}>
                    <Icon icon="mdi:check-decagram" className={styles.ctaBenefitIcon} />
                    <span>End-to-end property assistance</span>
                  </div>
                  <div className={styles.ctaBenefit}>
                    <Icon icon="mdi:check-decagram" className={styles.ctaBenefitIcon} />
                    <span>Legal document verification</span>
                  </div>
                  <div className={styles.ctaBenefit}>
                    <Icon icon="mdi:check-decagram" className={styles.ctaBenefitIcon} />
                    <span>Home loan processing support</span>
                  </div>
                </div>
              </div>
              <LeadForm
                title="Get Expert Guidance"
                subtitle="Our team will reach out within 24 hours"
                fields={leadFields}
                source="real_estate_awareness"
              />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
};

export default RealEstateAwareness;
