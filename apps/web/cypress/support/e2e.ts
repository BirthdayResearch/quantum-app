// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import "@cypress/code-coverage/support";
import "./commands";

Cypress.on("uncaught:exception", (err) => {
  if (
    err.message.includes(
      "Cannot read properties of undefined (reading 'undefined')",
    )
  ) {
    return false;
  }
});
