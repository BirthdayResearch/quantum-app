describe("Maintenance", () => {
  it("should display homepage when bridge is not down", () => {
    cy.visit("http://localhost:3000/?network=Local", {
      onBeforeLoad: (win) => {
        let nextData: any;
        Object.defineProperty(win, "__NEXT_DATA__", {
          set(o) {
            console.log("setting __NEXT_DATA__", o.props.pageProps);
            // here is our change to modify the injected parsed data
            o.props.pageProps.isBridgeUp = true;
            nextData = o;
          },
          get() {
            return nextData;
          },
        });
      },
    });
    cy.findByTestId("homepage").should("exist");
    cy.findByTestId("maintenance").should("not.exist");
  });

  it("should display maintenance page when Quantum Bridge is down", () => {
    cy.visit("http://localhost:3000/?network=Local", {
      onBeforeLoad: (win) => {
        let nextData: any;
        Object.defineProperty(win, "__NEXT_DATA__", {
          set(o) {
            console.log("setting __NEXT_DATA__", o.props.pageProps);
            // here is our change to modify the injected parsed data
            o.props.pageProps.isBridgeUp = false;
            nextData = o;
          },
          get() {
            return nextData;
          },
        });
      },
    });
    cy.findByTestId("homepage").should("not.exist");
    cy.findByTestId("maintenance").should("exist");
    cy.findByTestId("maintenance_title").contains("Bridge is currently closed");
  });
});
