import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './utils/vitals';
import { whenIdle } from './utils/idle';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * Report this page load's Core Web Vitals (§8.6, prompt 41).
 *
 * After `render`, and then in an idle slot: `web-vitals` is a dynamic import,
 * and fetching it — or running anything at all — while React is still
 * committing the first paint would make the measurement worse than what it
 * measures. `createRoot` is untouched, which is what the prerender relies on
 * (§9.9, D16): the saved HTML is re-rendered rather than hydrated.
 */
whenIdle(() => reportWebVitals());
