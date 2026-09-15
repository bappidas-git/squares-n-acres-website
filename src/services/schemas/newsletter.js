/**
 * Newsletter subscription (00_MASTER_CONTEXT.md §5.14, §6.14).
 * A duplicate e-mail answers 200 `{ data: null, message: 'Already subscribed' }`
 * rather than 409 — subscribing twice is not an error for the visitor.
 */

const { LEAD_SOURCES } = require('../../config/enums');

const subscribe = {
  email: { type: 'email', required: true },
  name: { type: 'string', nullable: true, maxLength: 80, default: null },
  source: { type: 'enum', enum: LEAD_SOURCES.values, default: 'newsletter' },
  // Honeypot (§5.11).
  website: { type: 'string', nullable: true, maxLength: 200, default: null },
};

module.exports = { subscribe };
