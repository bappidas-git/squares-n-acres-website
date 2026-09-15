/**
 * Job application (00_MASTER_CONTEXT.md §6.11) — the body of
 * `POST /jobs/:id/apply`. The résumé travels as a URL (decision D12): the
 * form uploads to Cloudinary when a preset is configured, otherwise the
 * applicant pastes a link.
 */

const { JOB_APPLICATION_STATUS } = require('../../config/enums');

const create = {
  name: { type: 'string', required: true, min: 2, maxLength: 80 },
  email: { type: 'email', required: true },
  phone: { type: 'phone', required: true },
  resumeUrl: { type: 'url', required: true },
  coverLetter: { type: 'string', nullable: true, maxLength: 5000, default: null },
  linkedinUrl: { type: 'url', nullable: true, default: null },
  // Honeypot (§5.11).
  website: { type: 'string', nullable: true, maxLength: 200, default: null },
};

/** Admin triage of an application. */
const patch = {
  status: { type: 'enum', enum: JOB_APPLICATION_STATUS.values },
  notes: { type: 'string', nullable: true, maxLength: 2000 },
};

module.exports = { create, patch };
