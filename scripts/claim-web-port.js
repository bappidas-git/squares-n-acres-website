#!/usr/bin/env node
/**
 * `npm run dev` runs this before `npm start`: port 3000 is made free for the
 * new web dev server, and a web dev server this project left running there is
 * stopped first (QA-66, `scripts/lib/webTakeover.js`).
 *
 * Exit 0: the port is free, or was freed — or it is held by no process that
 * could be looked up, and `react-scripts start` reports it as before.
 * Exit 1: a program `npm run dev` must not stop holds the port, or this
 * project's old server would not stop; the message names the process and how
 * to stop it by hand.
 *
 * An unexpected failure here never keeps the web dev server from starting.
 */

const path = require('path');

const { claimWebPort, describeClaim, devServerAddress } = require('./lib/webTakeover');

const ROOT = path.resolve(__dirname, '..');

async function main() {
  const { port, host } = devServerAddress({ root: ROOT });
  const result = await claimWebPort({ port, host, root: ROOT });
  const { exitCode, level, message } = describeClaim(result, { port, root: ROOT });
  if (message) console[level](message);
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.warn(`Could not check the web dev server's port (${error.message}); starting it anyway.`);
});
