declare namespace Cypress {
  interface Chainable {
    getLiquidityBySymbolChain(symbol: string, chain: string): Chainable;
  }
}
