/**
 * `adminUsers` — the three mock accounts of §6.14 (D80).
 *
 * The passwords are plaintext because the mock compares them directly; Laravel
 * hashes. They are documented in `docs/SEED_GUIDE.md` and rotated before
 * go-live, and they are the only credentials in the repository.
 */

const USERS = [
  ['Admin User', 'admin@squaresnacres.com', 'Admin@123', 'admin', '9880000010'],
  ['Manager User', 'manager@squaresnacres.com', 'Manager@123', 'manager', '9880000011'],
  ['Sales User', 'sales@squaresnacres.com', 'Sales@123', 'sales', '9880000012'],
];

module.exports = function users({ stamps, dates }) {
  return USERS.map(([name, email, password, role, phone], index) => ({
    id: index + 1,
    name,
    email,
    password,
    role,
    phone,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: dates.daysAgo(index + 1, 9, 15),
    ...stamps({ createdDaysAgo: 180 }),
  }));
};
