import "@testing-library/cypress/add-commands";
/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       /**
//        * @description Custom command to select DOM element by data-testid attribute.
//        * @example cy.getByTestID('home_button')
//        */
//       getByTestID: (value: string, opts?: any) => Chainable<Element>;
//     }
//   }
// }

Cypress.Commands.add("getLiquidityBySymbolChain", (symbol, chain) => {
  cy.findByTestId(`${symbol}-${chain}-liquidity`)
    .invoke("text")
    .then((s) => {
      s = s.substring(0, s.lastIndexOf(" "));
      return s.replaceAll(",", "");
    });
});
