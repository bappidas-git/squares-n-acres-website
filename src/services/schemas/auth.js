/**
 * Authentication write schemas (00_MASTER_CONTEXT.md §5.4).
 */

const login = {
  email: { type: 'email', required: true },
  password: { type: 'string', required: true, min: 6, maxLength: 100 },
};

const profile = {
  name: { type: 'string', required: true, min: 2, maxLength: 80 },
  phone: { type: 'phone', nullable: true, default: null },
  avatarUrl: { type: 'url', nullable: true, default: null },
};

const password = {
  currentPassword: { type: 'string', required: true, maxLength: 100 },
  newPassword: { type: 'string', required: true, min: 8, maxLength: 100 },
};

module.exports = { login, profile, password };
