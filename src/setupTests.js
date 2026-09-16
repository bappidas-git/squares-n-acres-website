// Loaded by CRA's Jest before every test file.
// `jest-dom` adds the DOM matchers the component tests use
// (`toBeInTheDocument`, `toHaveAttribute`, `toHaveFocus`, …).
import '@testing-library/jest-dom';

// CRA loads `.env.development` for `start` and `build`, never for `test`, and
// `src/services/http.js` refuses to load without an API base (D48). Jest runs
// against stubs rather than a server, so any well-formed base will do; §3.5
// keeps the real values in the env files.
process.env.REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
process.env.REACT_APP_SITE_URL = process.env.REACT_APP_SITE_URL || 'http://localhost:3000';
