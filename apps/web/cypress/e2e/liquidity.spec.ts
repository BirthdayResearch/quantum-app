import BigNumber from "bignumber.js";
import { networkConfigs } from "../fixtures/networks.config";

const desktopViewPort = "macbook-15";
const mobileViewPort = "iphone-x";

const baseUrl = "/liquidity?network=";

const evmSymbols = ["DFI", "WBTC", "ETH", "USDT", "USDC", "EUROC"];
const dfcSymbols = ["dEUROC", "dUSDC", "dUSDT", "dETH", "dBTC", "DFI"];

networkConfigs.forEach((networkItem) => {
  context(
    `Liquidity page on ${desktopViewPort} at the ${networkItem.network}`,
    () => {
      beforeEach(() => {
        cy.visit(baseUrl + networkItem.network);
        cy.viewport(desktopViewPort);
      });

      // TODO: check why it's flaky
      it.skip("should check Proof of Backing link", () => {
        cy.findByTestId("POB.Url")
          .should("have.attr", "href")
          .and("include", "https://defiscan.live/proof-of-backing");
      });

      // TODO: check why it's flaky
      it.skip("should check that Addresses links are correct", () => {
        evmSymbols.forEach((symbol) => {
          cy.findByTestId(`${symbol}-Ethereum-address`)
            .and("have.attr", "href")
            .and("include", networkItem.evmAddress);
        });
        dfcSymbols.forEach((symbol) => {
          cy.findByTestId(`${symbol}-DeFiChain-address`)
            .and("have.attr", "href")
            .and("include", networkItem.dfcAddress);
        });
      });

      it("should check that liquidity values displayed correctly", () => {
        cy.request(networkItem.balancesUrl).then((response) => {
          dfcSymbols.reverse().forEach((symbol) => {
            const apiSymbol = symbol.replaceAll("d", "");
            cy.getLiquidityBySymbolChain(symbol, "DeFiChain").should(
              "include",
              BigNumber(response.body.DFC[apiSymbol]).toFixed(8),
            );
          });
          evmSymbols.forEach((symbol) => {
            cy.getLiquidityBySymbolChain(symbol, "Ethereum").should(
              "include",
              BigNumber(response.body.EVM[symbol]).toFixed(8),
            );
          });
        });
      });

      context(`Liquidity page on ${mobileViewPort}`, () => {
        beforeEach(() => {
          cy.visit(baseUrl + networkItem.network);
          cy.viewport(mobileViewPort);
        });

        it("should check navigation between Bridge and Liquidity pages", () => {
          cy.get("a[data-testid='navigation-bridge']")
            .last()
            .should("be.visible")
            .click();
          cy.url().should("not.contain", "liquidity");
          cy.get("a[data-testid='navigation-liquidity']")
            .last()
            .should("be.visible")
            .click();
          cy.url().should("contain", "liquidity");
        });

        it("should check responsive design for the Liquidity table elements", () => {
          cy.get("svg[data-testid='liquidity-mobile-dropdownArrow']").should(
            "have.length",
            8,
          );
          cy.viewport(desktopViewPort);
          cy.get("svg[data-testid='liquidity-mobile-dropdownArrow']").should(
            "have.length",
            0,
          );
        });
      });
    },
  );
});
