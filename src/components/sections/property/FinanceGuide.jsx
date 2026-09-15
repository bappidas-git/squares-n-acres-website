import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useInView } from "react-intersection-observer";
import { leadService } from "../../../services/api";
import { getNameErrorMessage, getEmailErrorMessage, getMobileErrorMessage } from "../../../utils/validators";
import { DEFAULT_BANKS } from "../../../config/adminConstants";
import styles from "./FinanceGuide.module.css";

const formatCurrency = (val) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
};

/* ─── Assessment Options ─── */
const occupationOptions = [
  { value: "salaried", label: "Salaried", icon: "mdi:briefcase-outline" },
  {
    value: "self-employed",
    label: "Self-Employed",
    icon: "mdi:account-tie-outline",
  },
  {
    value: "business-owner",
    label: "Business Owner",
    icon: "mdi:store-outline",
  },
  { value: "professional", label: "Professional", icon: "mdi:school-outline" },
  { value: "retired", label: "Retired", icon: "mdi:beach" },
];

const incomeRanges = [
  { value: "exact", label: "Enter Exact Amount" },
  { value: "0-25000", label: "Below ₹25,000" },
  { value: "25000-50000", label: "₹25,000 - ₹50,000" },
  { value: "50000-100000", label: "₹50,000 - ₹1,00,000" },
  { value: "100000-150000", label: "₹1,00,000 - ₹1,50,000" },
  { value: "150000-250000", label: "₹1,50,000 - ₹2,50,000" },
  { value: "250000+", label: "Above ₹2,50,000" },
];

const creditScoreOptions = [
  { value: "excellent", label: "Excellent (750+)", color: "#10B981" },
  { value: "good", label: "Good (700-749)", color: "#3B82F6" },
  { value: "fair", label: "Fair (650-699)", color: "#F59E0B" },
  { value: "poor", label: "Poor (Below 650)", color: "#EF4444" },
  { value: "not-sure", label: "Not Sure", color: "#6B7280" },
];

const existingEmiOptions = [
  { value: "0", label: "No existing EMIs" },
  { value: "1-10000", label: "Up to ₹10,000" },
  { value: "10000-25000", label: "₹10,000 - ₹25,000" },
  { value: "25000-50000", label: "₹25,000 - ₹50,000" },
  { value: "50000+", label: "Above ₹50,000" },
];

const emiTenureOptions = [
  { value: "0-12", label: "0 to 12 Months" },
  { value: "12-24", label: "12 to 24 Months" },
  { value: "24+", label: "More than 24 Months" },
];

const employmentYearOptions = [
  { value: "0-1", label: "Less than 1 year" },
  { value: "1-3", label: "1 - 3 years" },
  { value: "3-5", label: "3 - 5 years" },
  { value: "5-10", label: "5 - 10 years" },
  { value: "10+", label: "10+ years" },
];

/* ─── Numeric Lookup Tables ─── */
const monthlyIncomeValues = {
  "0-25000": 15000,
  "25000-50000": 37500,
  "50000-100000": 75000,
  "100000-150000": 125000,
  "150000-250000": 200000,
  "250000+": 350000,
};

const emiNumericValues = {
  "0": 0,
  "1-10000": 5000,
  "10000-25000": 17500,
  "25000-50000": 37500,
  "50000+": 75000,
};

/* ─── Helper: resolve monthly income (exact value or midpoint from range) ─── */
const getMonthlyIncome = (data) => {
  if (data.monthlyIncome === "exact") {
    return parseInt(data.exactMonthlyIncome) || 0;
  }
  return monthlyIncomeValues[data.monthlyIncome] || 0;
};

/* ─── Score Calculation ─── */
/* Formula: (60% of Monthly Income - Existing EMI) / (60% of Monthly Income) × 100 */
const calculateFitScore = (data) => {
  const monthlyIncome = getMonthlyIncome(data);
  const existingEmi = emiNumericValues[data.existingEmi] || 0;

  const maxEmiCapacity = 0.6 * monthlyIncome;
  if (maxEmiCapacity <= 0) return 0;

  const availableCapacity = maxEmiCapacity - existingEmi;
  const score = Math.min(100, Math.max(0, Math.round((availableCapacity / maxEmiCapacity) * 100)));

  return score;
};

/* Helper to compute eligible loan amount based on available EMI capacity */
const computeEligibleLoan = (data, rate = 8.5, tenureYears = 20) => {
  const monthlyIncome = getMonthlyIncome(data);
  const existingEmi = emiNumericValues[data.existingEmi] || 0;
  const availableEmi = Math.max(0, 0.6 * monthlyIncome - existingEmi);
  const r = rate / 12 / 100;
  const n = tenureYears * 12;
  if (r === 0 || availableEmi === 0) return 0;
  return Math.round(availableEmi * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)));
};

const getScoreLabel = (score) => {
  if (score >= 75)
    return {
      label: "Excellent",
      color: "#10B981",
      bg: "#ECFDF5",
      icon: "mdi:check-decagram",
      message:
        "Your estimated EMI capacity is strong. Based on standard FOIR (Fixed Obligation to Income Ratio) norms, you may have a high likelihood of loan approval with competitive interest rates.",
    };
  if (score >= 50)
    return {
      label: "Good",
      color: "#3B82F6",
      bg: "#EFF6FF",
      icon: "mdi:thumb-up",
      message:
        "Your estimated EMI capacity looks favourable. You may be eligible for home loans from most banks. Final approval and terms are subject to the respective bank's assessment.",
    };
  if (score >= 25)
    return {
      label: "Moderate",
      color: "#F59E0B",
      bg: "#FFFBEB",
      icon: "mdi:alert-circle-outline",
      message:
        "Your existing obligations consume a significant portion of your income. Consider reducing existing EMIs or exploring a longer tenure to improve your affordability. Consult a bank for a detailed evaluation.",
    };
  return {
    label: "Needs Improvement",
    color: "#EF4444",
    bg: "#FEF2F2",
    icon: "mdi:information-outline",
    message:
      "Your current financial obligations may exceed the recommended FOIR limit. We suggest clearing existing liabilities or increasing your income before applying. Speak to a financial advisor for personalised guidance.",
  };
};

const FinanceGuide = ({ price = 0, property = null, savedUserDetails, onLeadCaptured, bankData }) => {
  // Bank data: use API-provided bankData prop when available, fall back to centralized defaults
  const banks = Array.isArray(bankData) && bankData.length > 0 ? bankData : DEFAULT_BANKS;

  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const resultRef = useRef(null);

  /* ─── EMI Calculator State ─── */
  const [loanPercent, setLoanPercent] = useState(80);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  const loanAmount = (price * loanPercent) / 100;
  const downPaymentAmount = price - loanAmount;

  const emi = useMemo(() => {
    const r = interestRate / 12 / 100;
    const n = tenure * 12;
    if (r === 0) return loanAmount / n;
    return (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [loanAmount, interestRate, tenure]);

  const totalAmount = emi * tenure * 12;
  const totalInterest = totalAmount - loanAmount;
  const principalPercent =
    loanAmount > 0 ? Math.round((loanAmount / totalAmount) * 100) : 0;
  const interestPercent = 100 - principalPercent;

  /* ─── Assessment State ─── */
  const [assessmentStep, setAssessmentStep] = useState(0); // 0=form, 1=result, 2=thankyou
  const [assessmentData, setAssessmentData] = useState({
    name: "",
    phone: "",
    email: "",
    occupation: "",
    monthlyIncome: "",
    exactMonthlyIncome: "",
    employmentYears: "",
    existingEmi: "",
    emiTenure: "",
    creditScore: "",
    downPayment: "20",
    hasCoApplicant: "",
    coApplicantIncome: "",
  });
  const [assessmentErrors, setAssessmentErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [fitScore, setFitScore] = useState(null);

  /* ─── Active Section Tabs ─── */
  const [activeTab, setActiveTab] = useState("assessment");

  /* ─── View More Banks State ─── */
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [initialBankCount, setInitialBankCount] = useState(3);

  /* ─── Eligibility Modal State ─── */
  const [eligibilityModal, setEligibilityModal] = useState({
    open: false,
    bank: null,
  });
  const [modalFormData, setModalFormData] = useState({
    name: "",
    phone: "",
    email: "",
    occupation: "",
    monthlyIncome: "",
    exactMonthlyIncome: "",
    employmentYears: "",
    existingEmi: "",
    emiTenure: "",
    creditScore: "",
    downPayment: "20",
    hasCoApplicant: "",
    coApplicantIncome: "",
  });
  const [modalErrors, setModalErrors] = useState({});
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalStep, setModalStep] = useState(0); // 0=form, 1=result
  const [modalFitScore, setModalFitScore] = useState(null);

  useEffect(() => {
    const updateBankCount = () => {
      setInitialBankCount(window.innerWidth > 960 ? 3 : 1);
    };
    updateBankCount();
    window.addEventListener("resize", updateBankCount);
    return () => window.removeEventListener("resize", updateBankCount);
  }, []);

  // Pre-fill assessment and modal forms with saved user details
  useEffect(() => {
    if (savedUserDetails) {
      setAssessmentData((prev) => ({
        ...prev,
        name: savedUserDetails.name || prev.name,
        email: savedUserDetails.email || prev.email,
        phone: savedUserDetails.phone || prev.phone,
      }));
    }
  }, [savedUserDetails]);

  const visibleBanks = showAllBanks ? banks : banks.slice(0, initialBankCount);

  const handleAssessmentChange = useCallback((field, value) => {
    setAssessmentData((prev) => ({ ...prev, [field]: value }));
    setAssessmentErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const validateAssessment = useCallback(() => {
    const errors = {};
    const nameErr = getNameErrorMessage(assessmentData.name);
    if (nameErr) errors.name = nameErr;
    const phoneErr = getMobileErrorMessage(assessmentData.phone);
    if (phoneErr) errors.phone = phoneErr;
    const emailErr = getEmailErrorMessage(assessmentData.email, false);
    if (emailErr) errors.email = emailErr;
    if (!assessmentData.occupation)
      errors.occupation = "Select your occupation";
    if (!assessmentData.monthlyIncome)
      errors.monthlyIncome = "Select your income range";
    else if (assessmentData.monthlyIncome === "exact") {
      const exactVal = parseInt(assessmentData.exactMonthlyIncome);
      if (!assessmentData.exactMonthlyIncome || isNaN(exactVal) || exactVal <= 0)
        errors.exactMonthlyIncome = "Enter a valid monthly income";
    }
    if (!assessmentData.creditScore)
      errors.creditScore = "Select your credit score range";
    if (!assessmentData.existingEmi) errors.existingEmi = "Select existing EMI";
    if (assessmentData.existingEmi && assessmentData.existingEmi !== "0" && !assessmentData.emiTenure)
      errors.emiTenure = "Select remaining EMI tenure";
    if (!assessmentData.employmentYears)
      errors.employmentYears = "Select employment duration";
    setAssessmentErrors(errors);
    return Object.keys(errors).length === 0;
  }, [assessmentData]);

  const scrollToResult = useCallback(() => {
    setTimeout(() => {
      const financeSection = document.getElementById("finance");
      if (financeSection) {
        const headerHeight = window.innerWidth <= 960 ? 60 : 72;
        const navHeight = 48;
        const gap = 16;
        const offset = headerHeight + navHeight + gap;
        const top =
          financeSection.getBoundingClientRect().top +
          window.scrollY -
          offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, 150);
  }, []);

  const handleAssessmentSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validateAssessment()) return;

      const score = calculateFitScore(assessmentData);
      setFitScore(score);

      try {
        setSubmitting(true);
        await leadService.create({
          name: assessmentData.name,
          phone: assessmentData.phone,
          email: assessmentData.email || "",
          propertyId: property?.id || null,
          source: "financial-assessment",
          message: `Financial Assessment Lead | Score: ${score}/100 | Occupation: ${assessmentData.occupation} | Monthly Income: ${assessmentData.monthlyIncome === "exact" ? "₹" + assessmentData.exactMonthlyIncome : assessmentData.monthlyIncome} | Credit: ${assessmentData.creditScore} | EMI: ${assessmentData.existingEmi}${assessmentData.emiTenure ? " (Tenure: " + assessmentData.emiTenure + ")" : ""} | Employment: ${assessmentData.employmentYears} yrs | Down Payment: ${assessmentData.downPayment}% | Co-applicant: ${assessmentData.hasCoApplicant || "No"}${assessmentData.coApplicantIncome ? " (Income: " + assessmentData.coApplicantIncome + ")" : ""}`,
          assessmentData: {
            score,
            occupation: assessmentData.occupation,
            monthlyIncome: assessmentData.monthlyIncome,
            exactMonthlyIncome: assessmentData.exactMonthlyIncome || "",
            employmentYears: assessmentData.employmentYears,
            existingEmi: assessmentData.existingEmi,
            emiTenure: assessmentData.emiTenure,
            creditScore: assessmentData.creditScore,
            downPayment: assessmentData.downPayment,
            hasCoApplicant: assessmentData.hasCoApplicant,
            coApplicantIncome: assessmentData.coApplicantIncome,
            propertyPrice: price,
          },
        });
        setAssessmentStep(1);
        scrollToResult();
        if (onLeadCaptured) {
          onLeadCaptured({ name: assessmentData.name, email: assessmentData.email, phone: assessmentData.phone });
        }
      } catch {
        setAssessmentStep(1);
        scrollToResult();
      } finally {
        setSubmitting(false);
      }
    },
    [assessmentData, property?.id, price, validateAssessment, scrollToResult, onLeadCaptured],
  );

  /* ─── Eligibility Modal Handlers ─── */
  const openEligibilityModal = useCallback((bank) => {
    setEligibilityModal({ open: true, bank });
    setModalStep(0);
    setModalFormData({
      name: savedUserDetails?.name || "",
      phone: savedUserDetails?.phone || "",
      email: savedUserDetails?.email || "",
      occupation: "",
      monthlyIncome: "",
      exactMonthlyIncome: "",
      employmentYears: "",
      existingEmi: "",
      emiTenure: "",
      creditScore: "",
      downPayment: "20",
      hasCoApplicant: "",
      coApplicantIncome: "",
    });
    setModalErrors({});
    setModalFitScore(null);
    document.body.style.overflow = "hidden";
  }, [savedUserDetails]);

  const closeEligibilityModal = useCallback(() => {
    setEligibilityModal({ open: false, bank: null });
    setModalStep(0);
    document.body.style.overflow = "";
  }, []);

  const handleModalChange = useCallback((field, value) => {
    setModalFormData((prev) => ({ ...prev, [field]: value }));
    setModalErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const validateModalForm = useCallback(() => {
    const errors = {};
    const nameErr = getNameErrorMessage(modalFormData.name);
    if (nameErr) errors.name = nameErr;
    const phoneErr = getMobileErrorMessage(modalFormData.phone);
    if (phoneErr) errors.phone = phoneErr;
    const emailErr = getEmailErrorMessage(modalFormData.email, false);
    if (emailErr) errors.email = emailErr;
    if (!modalFormData.occupation) errors.occupation = "Select your occupation";
    if (!modalFormData.monthlyIncome)
      errors.monthlyIncome = "Select your income range";
    else if (modalFormData.monthlyIncome === "exact") {
      const exactVal = parseInt(modalFormData.exactMonthlyIncome);
      if (!modalFormData.exactMonthlyIncome || isNaN(exactVal) || exactVal <= 0)
        errors.exactMonthlyIncome = "Enter a valid monthly income";
    }
    if (!modalFormData.creditScore)
      errors.creditScore = "Select your credit score range";
    if (!modalFormData.existingEmi) errors.existingEmi = "Select existing EMI";
    if (modalFormData.existingEmi && modalFormData.existingEmi !== "0" && !modalFormData.emiTenure)
      errors.emiTenure = "Select remaining EMI tenure";
    if (!modalFormData.employmentYears)
      errors.employmentYears = "Select employment duration";
    setModalErrors(errors);
    return Object.keys(errors).length === 0;
  }, [modalFormData]);

  const handleModalSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validateModalForm()) return;

      const score = calculateFitScore(modalFormData);
      setModalFitScore(score);

      try {
        setModalSubmitting(true);
        await leadService.create({
          name: modalFormData.name,
          phone: modalFormData.phone,
          email: modalFormData.email || "",
          propertyId: property?.id || null,
          source: "bank-eligibility-check",
          message: `Bank Eligibility Check — ${eligibilityModal.bank?.name} | Score: ${score}/100 | Occupation: ${modalFormData.occupation} | Monthly Income: ${modalFormData.monthlyIncome === "exact" ? "₹" + modalFormData.exactMonthlyIncome : modalFormData.monthlyIncome} | Credit: ${modalFormData.creditScore} | EMI: ${modalFormData.existingEmi}${modalFormData.emiTenure ? " (Tenure: " + modalFormData.emiTenure + ")" : ""} | Employment: ${modalFormData.employmentYears} yrs | Down Payment: ${modalFormData.downPayment}% | Co-applicant: ${modalFormData.hasCoApplicant || "No"}${modalFormData.coApplicantIncome ? " (Income: " + modalFormData.coApplicantIncome + ")" : ""}`,
          assessmentData: {
            score,
            bank: eligibilityModal.bank?.name,
            occupation: modalFormData.occupation,
            monthlyIncome: modalFormData.monthlyIncome,
            exactMonthlyIncome: modalFormData.exactMonthlyIncome || "",
            employmentYears: modalFormData.employmentYears,
            existingEmi: modalFormData.existingEmi,
            emiTenure: modalFormData.emiTenure,
            creditScore: modalFormData.creditScore,
            downPayment: modalFormData.downPayment,
            hasCoApplicant: modalFormData.hasCoApplicant,
            coApplicantIncome: modalFormData.coApplicantIncome,
            propertyPrice: price,
          },
        });
        setModalStep(1);
        if (onLeadCaptured) {
          onLeadCaptured({ name: modalFormData.name, email: modalFormData.email, phone: modalFormData.phone });
        }
      } catch {
        setModalStep(1);
      } finally {
        setModalSubmitting(false);
      }
    },
    [
      modalFormData,
      eligibilityModal.bank,
      property?.id,
      price,
      validateModalForm,
      onLeadCaptured,
    ],
  );

  // Cleanup body overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  /* ─── Reusable Form Fields Renderer ─── */
  const renderFormFields = (data, errors, onChange) => (
    <>
      {/* ── Personal Details ── */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>
          <Icon icon="mdi:account-outline" /> Personal Details
        </h4>
        <div className={styles.formGrid3}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Full Name *</label>
            <input
              type="text"
              className={`${styles.formInput} ${errors.name ? styles.formInputError : ""}`}
              placeholder="Enter your full name"
              value={data.name}
              onChange={(e) => onChange("name", e.target.value)}
            />
            {errors.name && (
              <span className={styles.fieldError}>{errors.name}</span>
            )}
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Phone Number *</label>
            <input
              type="tel"
              className={`${styles.formInput} ${errors.phone ? styles.formInputError : ""}`}
              placeholder="10-digit mobile number"
              value={data.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              maxLength={10}
            />
            {errors.phone && (
              <span className={styles.fieldError}>{errors.phone}</span>
            )}
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Email Address</label>
            <input
              type="email"
              className={`${styles.formInput} ${errors.email ? styles.formInputError : ""}`}
              placeholder="your@email.com"
              value={data.email}
              onChange={(e) => onChange("email", e.target.value)}
            />
            {errors.email && (
              <span className={styles.fieldError}>{errors.email}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Occupation ── */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>
          <Icon icon="mdi:briefcase-outline" /> Employment Details
        </h4>
        <label className={styles.formLabel}>Occupation Type *</label>
        <div className={styles.chipSelector}>
          {occupationOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.chipOption} ${data.occupation === opt.value ? styles.chipOptionActive : ""}`}
              onClick={() => onChange("occupation", opt.value)}
            >
              <Icon icon={opt.icon} />
              {opt.label}
            </button>
          ))}
        </div>
        {errors.occupation && (
          <span className={styles.fieldError}>{errors.occupation}</span>
        )}

        <div className={styles.formGrid2} style={{ marginTop: "16px" }}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>
              Years of Employment / Business *
            </label>
            <select
              className={`${styles.formSelect} ${errors.employmentYears ? styles.formInputError : ""}`}
              value={data.employmentYears}
              onChange={(e) => onChange("employmentYears", e.target.value)}
            >
              <option value="">Select duration</option>
              {employmentYearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.employmentYears && (
              <span className={styles.fieldError}>
                {errors.employmentYears}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Financial Details ── */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>
          <Icon icon="mdi:currency-inr" /> Financial Details
        </h4>
        <div className={styles.formGrid2}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Monthly Income *</label>
            <select
              className={`${styles.formSelect} ${errors.monthlyIncome ? styles.formInputError : ""}`}
              value={data.monthlyIncome}
              onChange={(e) => {
                onChange("monthlyIncome", e.target.value);
                if (e.target.value !== "exact") {
                  onChange("exactMonthlyIncome", "");
                }
              }}
            >
              <option value="">Select income range</option>
              {incomeRanges.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.monthlyIncome && (
              <span className={styles.fieldError}>{errors.monthlyIncome}</span>
            )}
            {data.monthlyIncome === "exact" && (
              <div className={styles.exactIncomeWrap}>
                <span className={styles.exactIncomePrefix}>₹</span>
                <input
                  type="number"
                  className={`${styles.formInput} ${styles.exactIncomeInput} ${errors.exactMonthlyIncome ? styles.formInputError : ""}`}
                  placeholder="e.g. 75000"
                  value={data.exactMonthlyIncome}
                  onChange={(e) => onChange("exactMonthlyIncome", e.target.value)}
                  min="1"
                />
              </div>
            )}
            {errors.exactMonthlyIncome && (
              <span className={styles.fieldError}>{errors.exactMonthlyIncome}</span>
            )}
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Existing Monthly EMIs *</label>
            <select
              className={`${styles.formSelect} ${errors.existingEmi ? styles.formInputError : ""}`}
              value={data.existingEmi}
              onChange={(e) => {
                onChange("existingEmi", e.target.value);
                if (e.target.value === "0" || e.target.value === "") {
                  onChange("emiTenure", "");
                }
              }}
            >
              <option value="">Select EMI range</option>
              {existingEmiOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.existingEmi && (
              <span className={styles.fieldError}>{errors.existingEmi}</span>
            )}
          </div>
        </div>

        {/* EMI Tenure — shown only when existing EMIs are selected */}
        {data.existingEmi && data.existingEmi !== "0" && (
          <div className={styles.formGrid2} style={{ marginTop: "16px" }}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Remaining EMI Tenure *</label>
              <select
                className={`${styles.formSelect} ${errors.emiTenure ? styles.formInputError : ""}`}
                value={data.emiTenure}
                onChange={(e) => onChange("emiTenure", e.target.value)}
              >
                <option value="">Select tenure</option>
                {emiTenureOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.emiTenure && (
                <span className={styles.fieldError}>{errors.emiTenure}</span>
              )}
            </div>
          </div>
        )}

        <label className={styles.formLabel} style={{ marginTop: "16px" }}>
          Credit Score Range *
        </label>
        <div className={styles.chipSelector}>
          {creditScoreOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.chipOption} ${data.creditScore === opt.value ? styles.chipOptionActive : ""}`}
              onClick={() => onChange("creditScore", opt.value)}
              style={
                data.creditScore === opt.value
                  ? { borderColor: opt.color, background: `${opt.color}10` }
                  : {}
              }
            >
              <span
                className={styles.creditDot}
                style={{ background: opt.color }}
              />
              {opt.label}
            </button>
          ))}
        </div>
        {errors.creditScore && (
          <span className={styles.fieldError}>{errors.creditScore}</span>
        )}

        <div className={styles.formGrid2} style={{ marginTop: "16px" }}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>
              Down Payment Available ({data.downPayment}%)
            </label>
            <input
              type="range"
              min="10"
              max="50"
              value={data.downPayment}
              onChange={(e) => onChange("downPayment", e.target.value)}
              className={styles.rangeSlider}
            />
            <div className={styles.rangeLabels}>
              <span>10%</span>
              <span className={styles.rangeCurrentVal}>
                {formatCurrency(
                  (price * (parseInt(data.downPayment) || 0)) / 100,
                )}
              </span>
              <span>50%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Co-Applicant ── */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>
          <Icon icon="mdi:account-multiple-outline" /> Co-Applicant (Optional)
        </h4>
        <div className={styles.formGrid2}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>
              Do you have a co-applicant?
            </label>
            <div className={styles.toggleRow}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${data.hasCoApplicant === "yes" ? styles.toggleBtnActive : ""}`}
                onClick={() => onChange("hasCoApplicant", "yes")}
              >
                Yes
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${data.hasCoApplicant === "no" ? styles.toggleBtnActive : ""}`}
                onClick={() => onChange("hasCoApplicant", "no")}
              >
                No
              </button>
            </div>
          </div>
          {data.hasCoApplicant === "yes" && (
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Co-Applicant Monthly Income
              </label>
              <select
                className={styles.formSelect}
                value={data.coApplicantIncome}
                onChange={(e) => onChange("coApplicantIncome", e.target.value)}
              >
                <option value="">Select income range</option>
                {incomeRanges.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (!price) return null;

  const scoreInfo = fitScore !== null ? getScoreLabel(fitScore) : null;

  const tabs = [
    {
      id: "assessment",
      label: "Know Your Eligibility",
      icon: "mdi:clipboard-check-outline",
    },
    { id: "finance", label: "Bank Loan Assistance", icon: "mdi:bank-check" },
    { id: "emi", label: "EMI Projections", icon: "mdi:calculator-variant" },
  ];

  return (
    <section className={styles.section} ref={ref} id="finance">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.sectionTitle}>Home Finance Clearity</h2>
        <p className={styles.sectionSubtitle}>
          Comprehensive financial planning tools to help you make an informed
          property investment decision
        </p>

        {/* ─── Tab Navigation ─── */}
        <div className={styles.tabNav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon icon={tab.icon} className={styles.tabIcon} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 1: Home Finance Clarity — Bank Cards                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "finance" && (
          <motion.div
            key="finance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Top Banner */}
            <div className={styles.financeBanner}>
              <div className={styles.financeBannerIcon}>
                <Icon icon="mdi:shield-check" />
              </div>
              <div className={styles.financeBannerText}>
                <h3>Banks Approved</h3>
                <p>
                  This property is pre-approved for home loans from India&apos;s
                  top banks with competitive rates starting from{" "}
                  <strong>8.35% p.a.</strong>
                </p>
              </div>
            </div>

            {/* Highlight Stats Bar */}
            <div className={styles.statsBar}>
              <div className={styles.statItem}>
                <Icon icon="mdi:percent-circle" className={styles.statIcon} />
                <div>
                  <span className={styles.statValue}>8.35%</span>
                  <span className={styles.statLabel}>Lowest Rate</span>
                </div>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <Icon icon="mdi:clock-fast" className={styles.statIcon} />
                <div>
                  <span className={styles.statValue}>48 Hrs</span>
                  <span className={styles.statLabel}>Quick Approval</span>
                </div>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <Icon icon="mdi:cash-multiple" className={styles.statIcon} />
                <div>
                  <span className={styles.statValue}>Up to 90%</span>
                  <span className={styles.statLabel}>Financing</span>
                </div>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <Icon
                  icon="mdi:file-document-check"
                  className={styles.statIcon}
                />
                <div>
                  <span className={styles.statValue}>Minimal</span>
                  <span className={styles.statLabel}>Documentation</span>
                </div>
              </div>
            </div>

            {/* Bank Cards Grid */}
            <div className={styles.bankGrid}>
              {visibleBanks.map((bank, idx) => (
                <motion.div
                  key={idx}
                  className={styles.bankCard}
                  initial={{ opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.35, delay: 0.1 + idx * 0.06 }}
                >
                  <div className={styles.bankCardHeader}>
                    <div
                      className={styles.bankIconWrap}
                      style={{ background: `${bank.color}15` }}
                    >
                      <Icon
                        icon={bank.icon}
                        className={styles.bankIconLg}
                        style={{ color: bank.color }}
                      />
                    </div>
                    <div className={styles.bankNameBlock}>
                      <span className={styles.bankName}>{bank.name}</span>
                      <span className={styles.preApprovedBadge}>
                        <Icon icon="mdi:check-circle" /> Pre-Approved
                      </span>
                    </div>
                  </div>
                  <div className={styles.bankCardBody}>
                    <div className={styles.bankRateRow}>
                      <span className={styles.bankRateLabel}>
                        Interest Rate
                      </span>
                      <span className={styles.bankRateValue}>
                        {bank.rate}% <small>p.a. onwards</small>
                      </span>
                    </div>
                    <div className={styles.bankRateRow}>
                      <span className={styles.bankRateLabel}>Max Loan</span>
                      <span className={styles.bankRateValue}>
                        {formatCurrency(bank.maxLoan)}
                      </span>
                    </div>
                    <div className={styles.bankRateRow}>
                      <span className={styles.bankRateLabel}>
                        Processing Fee
                      </span>
                      <span className={styles.bankRateValue}>
                        0.5%<small> + GST</small>
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.bankCta}
                    onClick={() => openEligibilityModal(bank)}
                  >
                    <Icon icon="mdi:check-decagram-outline" />
                    Check Eligibility
                  </button>
                </motion.div>
              ))}
            </div>

            {/* View More / Show Less Banks Button */}
            {banks.length > initialBankCount && (
              <div className={styles.viewMoreWrap}>
                {!showAllBanks ? (
                  <button
                    className={styles.viewMoreBtn}
                    onClick={() => setShowAllBanks(true)}
                  >
                    <Icon icon="mdi:bank-plus" />
                    <span className={styles.viewMoreTextDesktop}>
                      View More Banks
                    </span>
                    <span className={styles.viewMoreTextMobile}>
                      View More Bank
                    </span>
                    <Icon icon="mdi:chevron-down" />
                  </button>
                ) : (
                  <button
                    className={styles.viewMoreBtn}
                    onClick={() => setShowAllBanks(false)}
                  >
                    <Icon icon="mdi:chevron-up" />
                    Show Less
                  </button>
                )}
              </div>
            )}

            {/* Approval Steps */}
            <div className={styles.approvalSteps}>
              <h4 className={styles.approvalStepsTitle}>
                <Icon icon="mdi:rocket-launch-outline" /> Get Loan Approval in 3
                Simple Steps
              </h4>
              <div className={styles.stepsRow}>
                <div className={styles.stepCard}>
                  <div className={styles.stepNumber}>1</div>
                  <span className={styles.stepLabel}>Submit Documents</span>
                  <span className={styles.stepDesc}>
                    Upload KYC &amp; income proofs
                  </span>
                </div>
                <div className={styles.stepConnector}>
                  <Icon icon="mdi:chevron-right" />
                </div>
                <div className={styles.stepCard}>
                  <div className={styles.stepNumber}>2</div>
                  <span className={styles.stepLabel}>Get Eligibility</span>
                  <span className={styles.stepDesc}>
                    Instant pre-approval check
                  </span>
                </div>
                <div className={styles.stepConnector}>
                  <Icon icon="mdi:chevron-right" />
                </div>
                <div className={styles.stepCard}>
                  <div className={styles.stepNumber}>3</div>
                  <span className={styles.stepLabel}>Loan Sanctioned</span>
                  <span className={styles.stepDesc}>
                    Disbursement within 48 hrs
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 2: Financial Fit Assessment                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "assessment" && (
          <motion.div
            key="assessment"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="wait">
              {assessmentStep === 0 && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.assessmentHeader}>
                    <div className={styles.assessmentHeaderIcon}>
                      <Icon icon="mdi:finance" />
                    </div>
                    <div>
                      <h3 className={styles.assessmentTitle}>
                        Discover Your Home Buying Power
                      </h3>
                      <p className={styles.assessmentDesc}>
                        Answer a few quick questions to get a personalised
                        financial fit score and expert recommendations for this
                        property worth <strong>{formatCurrency(price)}</strong>.
                      </p>
                    </div>
                  </div>

                  <form
                    className={styles.assessmentForm}
                    onSubmit={handleAssessmentSubmit}
                  >
                    {renderFormFields(
                      assessmentData,
                      assessmentErrors,
                      handleAssessmentChange,
                    )}

                    {/* ── Submit ── */}
                    <div className={styles.assessmentSubmitWrap}>
                      <button
                        type="submit"
                        className={styles.assessmentSubmitBtn}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Icon
                              icon="mdi:loading"
                              className={styles.spinIcon}
                            />
                            Analyzing Your Profile...
                          </>
                        ) : (
                          <>
                            <Icon icon="mdi:chart-box-outline" />
                            Check My Eligibility
                          </>
                        )}
                      </button>
                      <p className={styles.privacyNote}>
                        <Icon icon="mdi:lock-outline" /> Your data is secure and
                        used only for this assessment
                      </p>
                      <p style={{ fontSize: "0.65rem", color: "#9CA3AF", textAlign: "center", marginTop: "8px", lineHeight: 1.5 }}>
                        <Icon icon="mdi:information-outline" style={{ fontSize: "0.75rem", verticalAlign: "middle", marginRight: "2px" }} />
                        This is an indicative tool only. We are not a bank or financial institution. Final eligibility is subject to the bank&apos;s assessment.
                      </p>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ── Assessment Result ── */}
              {assessmentStep === 1 && scoreInfo && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                  className={styles.resultContainer}
                >
                  <div className={styles.resultCard}>
                    <div className={styles.resultHeader}>
                      <div
                        className={styles.scoreCircle}
                        style={{ borderColor: scoreInfo.color }}
                      >
                        <span
                          className={styles.scoreNumber}
                          style={{ color: scoreInfo.color }}
                        >
                          {fitScore}
                        </span>
                        <span className={styles.scoreOutOf}>/ 100</span>
                      </div>
                      <div className={styles.resultMeta}>
                        <div
                          className={styles.scoreBadge}
                          style={{
                            background: scoreInfo.bg,
                            color: scoreInfo.color,
                          }}
                        >
                          <Icon icon={scoreInfo.icon} />
                          {scoreInfo.label}
                        </div>
                        <h3 className={styles.resultTitle}>
                          Your Financial Fit Score
                        </h3>
                        <p className={styles.resultDesc}>{scoreInfo.message}</p>
                      </div>
                    </div>

                    {/* Eligibility Breakdown */}
                    <div className={styles.scoreBreakdown}>
                      <h4 className={styles.breakdownTitle}>Eligibility Breakdown</h4>
                      <div className={styles.breakdownGrid}>
                        {(() => {
                          const mIncome = getMonthlyIncome(assessmentData);
                          const eEmi = emiNumericValues[assessmentData.existingEmi] || 0;
                          const maxCapacity = Math.round(0.6 * mIncome);
                          const availableEmi = Math.max(0, maxCapacity - eEmi);
                          const eligibleLoan = computeEligibleLoan(assessmentData);
                          const dp = parseInt(assessmentData.downPayment) || 20;
                          const affordableProperty = dp > 0 ? Math.round(eligibleLoan / (1 - dp / 100)) : eligibleLoan;

                          const breakdownItems = [
                            {
                              label: "Monthly Income",
                              icon: "mdi:currency-inr",
                              value: formatCurrency(mIncome),
                              sub: "Gross monthly income",
                            },
                            {
                              label: "Max EMI Capacity (60% FOIR)",
                              icon: "mdi:calculator-variant",
                              value: formatCurrency(maxCapacity),
                              sub: "60% of monthly income",
                            },
                            {
                              label: "Existing EMI Obligations",
                              icon: "mdi:minus-circle-outline",
                              value: `- ${formatCurrency(eEmi)}`,
                              sub: assessmentData.emiTenure ? `Remaining tenure: ${assessmentData.emiTenure.replace("24+", "24+")} months` : "No existing EMIs",
                            },
                            {
                              label: "Available EMI Capacity",
                              icon: "mdi:check-circle-outline",
                              value: formatCurrency(availableEmi),
                              sub: "Monthly amount available for new home loan EMI",
                              highlight: true,
                            },
                            {
                              label: "Estimated Loan Eligibility",
                              icon: "mdi:bank-outline",
                              value: formatCurrency(eligibleLoan),
                              sub: "Based on 8.5% p.a. for 20 years (indicative)",
                              highlight: true,
                            },
                            {
                              label: "Estimated Affordable Property Value",
                              icon: "mdi:home-outline",
                              value: formatCurrency(affordableProperty),
                              sub: `With ${dp}% down payment`,
                              highlight: true,
                            },
                          ];

                          return breakdownItems.map((item, idx) => (
                            <div key={idx} className={styles.breakdownItem} style={item.highlight ? { background: "#F0FDF4", borderRadius: "8px", padding: "10px 12px" } : {}}>
                              <div className={styles.breakdownItemTop}>
                                <Icon
                                  icon={item.icon}
                                  className={styles.breakdownIcon}
                                />
                                <span className={styles.breakdownLabel}>
                                  {item.label}
                                </span>
                                <span className={styles.breakdownScore} style={item.highlight ? { fontWeight: 700, color: "#10B981" } : {}}>
                                  {item.value}
                                </span>
                              </div>
                              <span style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: "2px", display: "block" }}>
                                {item.sub}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className={styles.recommendations}>
                      <h4 className={styles.recoTitle}>
                        <Icon icon="mdi:lightbulb-outline" /> Recommendations
                      </h4>
                      <div className={styles.recoList}>
                        {fitScore >= 50 && (
                          <div className={styles.recoItem}>
                            <Icon
                              icon="mdi:check-circle"
                              style={{ color: "#10B981" }}
                            />
                            <span>
                              Based on the FOIR estimate, you may be eligible for home loans from major banks for this property.
                            </span>
                          </div>
                        )}
                        {fitScore < 75 &&
                          assessmentData.creditScore !== "excellent" && (
                            <div className={styles.recoItem}>
                              <Icon
                                icon="mdi:arrow-up-circle"
                                style={{ color: "#3B82F6" }}
                              />
                              <span>
                                A good credit score (750+) can help you negotiate better interest rates from banks.
                              </span>
                            </div>
                          )}
                        {assessmentData.existingEmi !== "0" && (
                          <div className={styles.recoItem}>
                            <Icon
                              icon="mdi:information"
                              style={{ color: "#F59E0B" }}
                            />
                            <span>
                              Clearing or reducing existing EMIs before applying can significantly improve your loan eligibility and available capacity.
                            </span>
                          </div>
                        )}
                        {parseInt(assessmentData.downPayment) < 20 && (
                          <div className={styles.recoItem}>
                            <Icon
                              icon="mdi:piggy-bank-outline"
                              style={{ color: "#8B5CF6" }}
                            />
                            <span>
                              A higher down payment (20%+) can lower your EMI burden and improve loan approval chances with banks.
                            </span>
                          </div>
                        )}
                        <div className={styles.recoItem}>
                          <Icon
                            icon="mdi:phone-outline"
                            style={{ color: "#C9A86C" }}
                          />
                          <span>
                            Our property advisors will contact you shortly to assist with connecting you to suitable banks and financial institutions.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div style={{ marginTop: "16px", padding: "12px 16px", background: "#FEF9E7", borderRadius: "8px", border: "1px solid #F5E6B8" }}>
                      <p style={{ fontSize: "0.7rem", color: "#92400E", lineHeight: 1.6, margin: 0 }}>
                        <Icon icon="mdi:alert-outline" style={{ fontSize: "0.85rem", verticalAlign: "middle", marginRight: "4px" }} />
                        <strong>Disclaimer:</strong> This is an indicative assessment based on the information provided and standard FOIR (Fixed Obligation to Income Ratio) norms used in the Indian real estate industry. We are not a bank, NBFC, or financial institution. Actual loan eligibility, interest rates, and terms are determined solely by the respective lending institution after their independent evaluation. This tool is for informational purposes only and does not constitute financial advice or a loan offer. Please consult with your bank or a certified financial advisor for accurate eligibility.
                      </p>
                    </div>

                    <div className={styles.resultActions}>
                      <button
                        className={styles.resultPrimaryBtn}
                        onClick={() => setAssessmentStep(2)}
                      >
                        <Icon icon="mdi:check" /> Done
                      </button>
                      <button
                        className={styles.resultSecondaryBtn}
                        onClick={() => {
                          setAssessmentStep(0);
                          setFitScore(null);
                        }}
                      >
                        <Icon icon="mdi:refresh" /> Retake Assessment
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Thank You ── */}
              {assessmentStep === 2 && (
                <motion.div
                  key="thankyou"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className={styles.thankYouWrap}
                >
                  <div className={styles.thankYouCard}>
                    <div className={styles.thankYouIconWrap}>
                      <Icon
                        icon="mdi:check-circle"
                        className={styles.thankYouIcon}
                      />
                    </div>
                    <h3 className={styles.thankYouTitle}>
                      Thank You, {assessmentData.name}!
                    </h3>
                    <p className={styles.thankYouText}>
                      Your Financial Fit Assessment has been submitted
                      successfully. Your score of{" "}
                      <strong style={{ color: scoreInfo?.color }}>
                        {fitScore}/100
                      </strong>{" "}
                      ({scoreInfo?.label}) has been recorded.
                    </p>
                    <p className={styles.thankYouSubtext}>
                      Our property advisors will reach out to you
                      within 24 hours to help connect you with suitable banks and financing options
                      tailored to your profile for this property.
                    </p>
                    <p style={{ fontSize: "0.65rem", color: "#9CA3AF", textAlign: "center", marginTop: "8px", lineHeight: 1.5 }}>
                      <Icon icon="mdi:information-outline" style={{ fontSize: "0.7rem", verticalAlign: "middle", marginRight: "2px" }} />
                      We are a real estate advisory platform, not a bank or financial institution. All loan-related decisions are made by the respective banks.
                    </p>
                    <div className={styles.thankYouActions}>
                      <button
                        className={styles.thankYouBtn}
                        onClick={() => setActiveTab("emi")}
                      >
                        <Icon icon="mdi:calculator-variant" /> View EMI
                        Projections
                      </button>
                      <button
                        className={styles.thankYouBtnOutline}
                        onClick={() => {
                          setAssessmentStep(0);
                          setFitScore(null);
                        }}
                      >
                        <Icon icon="mdi:refresh" /> Start New Assessment
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 3: EMI Projections                                    */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "emi" && (
          <motion.div
            key="emi"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.emiHeader}>
              <div className={styles.emiHeaderIcon}>
                <Icon icon="mdi:calculator-variant" />
              </div>
              <div>
                <h3 className={styles.emiHeaderTitle}>
                  EMI Projection Calculator
                </h3>
                <p className={styles.emiHeaderDesc}>
                  Plan your monthly payments for{" "}
                  <strong>{formatCurrency(price)}</strong> property
                </p>
              </div>
            </div>

            <div className={styles.emiGrid}>
              {/* Left: Calculator Controls */}
              <div className={styles.emiCalculator}>
                <div className={styles.emiPropertyPrice}>
                  <span className={styles.emiPriceLabel}>Property Price</span>
                  <span className={styles.emiPriceValue}>
                    {formatCurrency(price)}
                  </span>
                </div>

                <div className={styles.emiInputGroup}>
                  <div className={styles.emiInputHeader}>
                    <label className={styles.emiLabel}>
                      <Icon icon="mdi:cash-multiple" /> Loan Amount (
                      {loanPercent}%)
                    </label>
                    <span className={styles.emiInputVal}>
                      {formatCurrency(loanAmount)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    value={loanPercent}
                    onChange={(e) => setLoanPercent(Number(e.target.value))}
                    className={styles.rangeSlider}
                  />
                  <div className={styles.rangeLabels}>
                    <span>50%</span>
                    <span>90%</span>
                  </div>
                </div>

                <div className={styles.emiInputGroup}>
                  <div className={styles.emiInputHeader}>
                    <label className={styles.emiLabel}>
                      <Icon icon="mdi:percent" /> Interest Rate
                    </label>
                    <span className={styles.emiInputVal}>
                      {interestRate}% p.a.
                    </span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="14"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className={styles.rangeSlider}
                  />
                  <div className={styles.rangeLabels}>
                    <span>6%</span>
                    <span>14%</span>
                  </div>
                </div>

                <div className={styles.emiInputGroup}>
                  <div className={styles.emiInputHeader}>
                    <label className={styles.emiLabel}>
                      <Icon icon="mdi:calendar-range" /> Loan Tenure
                    </label>
                    <span className={styles.emiInputVal}>{tenure} years</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={tenure}
                    onChange={(e) => setTenure(Number(e.target.value))}
                    className={styles.rangeSlider}
                  />
                  <div className={styles.rangeLabels}>
                    <span>5 yrs</span>
                    <span>30 yrs</span>
                  </div>
                </div>
              </div>

              {/* Right: Results Panel */}
              <div className={styles.emiResults}>
                {/* EMI Hero */}
                <div className={styles.emiHeroBox}>
                  <span className={styles.emiHeroLabel}>Your Monthly EMI</span>
                  <span className={styles.emiHeroValue}>
                    {formatCurrency(emi)}
                  </span>
                  <span className={styles.emiHeroSub}>
                    for {tenure} years at {interestRate}% p.a.
                  </span>
                </div>

                {/* Visual Breakdown */}
                <div className={styles.emiBreakdownVisual}>
                  <div className={styles.emiBarContainer}>
                    <div
                      className={styles.emiBarPrincipal}
                      style={{ width: `${principalPercent}%` }}
                    >
                      {principalPercent > 15 && (
                        <span>{principalPercent}%</span>
                      )}
                    </div>
                    <div
                      className={styles.emiBarInterest}
                      style={{ width: `${interestPercent}%` }}
                    >
                      {interestPercent > 15 && <span>{interestPercent}%</span>}
                    </div>
                  </div>
                  <div className={styles.emiLegend}>
                    <div className={styles.emiLegendItem}>
                      <span
                        className={styles.emiLegendDot}
                        style={{ background: "var(--color-primary)" }}
                      />
                      Principal
                    </div>
                    <div className={styles.emiLegendItem}>
                      <span
                        className={styles.emiLegendDot}
                        style={{ background: "var(--color-secondary)" }}
                      />
                      Interest
                    </div>
                  </div>
                </div>

                {/* Summary Rows */}
                <div className={styles.emiSummary}>
                  <div className={styles.emiSummaryRow}>
                    <span className={styles.emiSummaryLabel}>
                      <Icon icon="mdi:cash" /> Loan Amount
                    </span>
                    <span className={styles.emiSummaryValue}>
                      {formatCurrency(loanAmount)}
                    </span>
                  </div>
                  <div className={styles.emiSummaryRow}>
                    <span className={styles.emiSummaryLabel}>
                      <Icon icon="mdi:arrow-down-circle" /> Down Payment
                    </span>
                    <span className={styles.emiSummaryValue}>
                      {formatCurrency(downPaymentAmount)}
                    </span>
                  </div>
                  <div className={styles.emiSummaryRow}>
                    <span className={styles.emiSummaryLabel}>
                      <Icon icon="mdi:percent-circle" /> Total Interest
                    </span>
                    <span
                      className={styles.emiSummaryValue}
                      style={{ color: "#EF4444" }}
                    >
                      {formatCurrency(totalInterest)}
                    </span>
                  </div>
                  <div
                    className={`${styles.emiSummaryRow} ${styles.emiSummaryTotal}`}
                  >
                    <span className={styles.emiSummaryLabel}>
                      <Icon icon="mdi:sigma" /> Total Payable
                    </span>
                    <span className={styles.emiSummaryValue}>
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Interest Savings Tip */}
                <div className={styles.emiTip}>
                  <Icon
                    icon="mdi:lightbulb-on-outline"
                    className={styles.emiTipIcon}
                  />
                  <span>
                    Tip: Increasing your down payment to{" "}
                    {Math.min(loanPercent + 5, 90)}% can save you approx.{" "}
                    {formatCurrency(totalInterest * 0.08)} in interest over the
                    loan tenure.
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Eligibility Check Modal                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {eligibilityModal.open && eligibilityModal.bank && (
          <motion.div
            className={styles.eligibilityOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeEligibilityModal}
          >
            <motion.div
              className={styles.eligibilityModal}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                duration: 0.3,
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={styles.eligibilityHeader}>
                <div className={styles.eligibilityTitleWrap}>
                  <div
                    className={styles.eligibilityBankIcon}
                    style={{ background: `${eligibilityModal.bank.color}15` }}
                  >
                    <Icon
                      icon={eligibilityModal.bank.icon}
                      style={{
                        color: eligibilityModal.bank.color,
                        fontSize: "1.3rem",
                      }}
                    />
                  </div>
                  <div>
                    <h3 className={styles.eligibilityTitle}>
                      Check Eligibility with {eligibilityModal.bank.name}
                    </h3>
                    <p className={styles.eligibilitySubtitle}>
                      Rate from {eligibilityModal.bank.rate}% p.a. &bull; Max
                      loan {formatCurrency(eligibilityModal.bank.maxLoan)}
                    </p>
                  </div>
                </div>
                <button
                  className={styles.eligibilityClose}
                  onClick={closeEligibilityModal}
                  aria-label="Close modal"
                >
                  <Icon icon="mdi:close" />
                </button>
              </div>

              {/* Modal Body */}
              <div className={styles.eligibilityBody}>
                <AnimatePresence mode="wait">
                  {modalStep === 0 && (
                    <motion.div
                      key="modal-form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      <form
                        className={styles.assessmentForm}
                        onSubmit={handleModalSubmit}
                      >
                        {renderFormFields(
                          modalFormData,
                          modalErrors,
                          handleModalChange,
                        )}

                        {/* ── Submit ── */}
                        <div className={styles.assessmentSubmitWrap}>
                          <button
                            type="submit"
                            className={styles.assessmentSubmitBtn}
                            disabled={modalSubmitting}
                          >
                            {modalSubmitting ? (
                              <>
                                <Icon
                                  icon="mdi:loading"
                                  className={styles.spinIcon}
                                />
                                Checking Eligibility...
                              </>
                            ) : (
                              <>
                                <Icon icon="mdi:check-decagram-outline" />
                                Check My Eligibility
                              </>
                            )}
                          </button>
                          <p className={styles.privacyNote}>
                            <Icon icon="mdi:lock-outline" /> Your data is secure
                            and used only for this assessment
                          </p>
                          <p style={{ fontSize: "0.65rem", color: "#9CA3AF", textAlign: "center", marginTop: "8px", lineHeight: 1.5 }}>
                            <Icon icon="mdi:information-outline" style={{ fontSize: "0.75rem", verticalAlign: "middle", marginRight: "2px" }} />
                            This is an indicative tool only. We are not a bank or financial institution. Final eligibility is subject to the bank&apos;s assessment.
                          </p>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {modalStep === 1 && modalFitScore !== null && (
                    <motion.div
                      key="modal-result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.35,
                        type: "spring",
                        stiffness: 200,
                      }}
                    >
                      {(() => {
                        const mScoreInfo = getScoreLabel(modalFitScore);
                        const mIncome = getMonthlyIncome(modalFormData);
                        const eEmi = emiNumericValues[modalFormData.existingEmi] || 0;
                        const availableEmi = Math.max(0, 0.6 * mIncome - eEmi);
                        const eligibleLoan = computeEligibleLoan(modalFormData, eligibilityModal.bank?.rate || 8.5);
                        return (
                          <div className={styles.eligibilityResult}>
                            <div className={styles.eligibilityResultIcon}>
                              <Icon icon="mdi:check-circle" />
                            </div>
                            <div
                              className={styles.eligibilityScoreCircle}
                              style={{ borderColor: mScoreInfo.color }}
                            >
                              <span
                                className={styles.eligibilityScoreNum}
                                style={{ color: mScoreInfo.color }}
                              >
                                {modalFitScore}
                              </span>
                              <span className={styles.eligibilityScoreOf}>
                                / 100
                              </span>
                            </div>
                            <div
                              className={styles.eligibilityScoreBadge}
                              style={{
                                background: mScoreInfo.bg,
                                color: mScoreInfo.color,
                              }}
                            >
                              <Icon icon={mScoreInfo.icon} />
                              {mScoreInfo.label}
                            </div>
                            <h3 className={styles.eligibilityResultTitle}>
                              Eligibility Assessment Complete
                            </h3>
                            <p className={styles.eligibilityResultText}>
                              {mScoreInfo.message}
                            </p>
                            <div style={{ width: "100%", margin: "12px 0", padding: "12px", background: "#F9FAFB", borderRadius: "8px", textAlign: "left" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.8rem" }}>
                                <span style={{ color: "#6B7280" }}>Available EMI Capacity</span>
                                <span style={{ fontWeight: 600, color: "#059669" }}>{formatCurrency(availableEmi)}/month</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                <span style={{ color: "#6B7280" }}>Estimated Loan Eligibility</span>
                                <span style={{ fontWeight: 600, color: "#059669" }}>{formatCurrency(eligibleLoan)}</span>
                              </div>
                              <span style={{ display: "block", fontSize: "0.65rem", color: "#9CA3AF", marginTop: "6px" }}>
                                *Based on {eligibilityModal.bank?.rate || 8.5}% p.a. for 20 years (indicative only)
                              </span>
                            </div>
                            <p className={styles.eligibilityResultSub}>
                              Our team will help connect you with {eligibilityModal.bank.name} for detailed loan processing and final eligibility assessment.
                            </p>
                            <p style={{ fontSize: "0.65rem", color: "#9CA3AF", textAlign: "center", lineHeight: 1.5, marginTop: "4px" }}>
                              <Icon icon="mdi:information-outline" style={{ fontSize: "0.7rem", verticalAlign: "middle", marginRight: "2px" }} />
                              We are not a bank or financial institution. This is an indicative estimate only. Actual eligibility is determined by {eligibilityModal.bank.name}.
                            </p>
                            <div className={styles.eligibilityResultActions}>
                              <button
                                className={styles.eligibilityDoneBtn}
                                onClick={closeEligibilityModal}
                              >
                                <Icon icon="mdi:check" /> Done
                              </button>
                              <button
                                className={styles.eligibilityRetakeBtn}
                                onClick={() => {
                                  setModalStep(0);
                                  setModalFitScore(null);
                                }}
                              >
                                <Icon icon="mdi:refresh" /> Retake
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default FinanceGuide;
