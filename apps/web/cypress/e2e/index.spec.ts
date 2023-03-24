const BirthdayResearchSocialItems = [
  { id: "twitter_br", url: "https://twitter.com/BirthdayDev" },
  { id: "medium_br", url: "https://medium.com/@birthdayresearch" },
];

beforeEach(() => {
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
});

describe("Navigation", () => {
  it("should navigate to the home page", () => {
    cy.findByTestId("homepage").should("exist");
    cy.findByTestId("header-bridge-logo").should("exist");
    cy.findByTestId("connect-button").should("exist");
    cy.findByTestId("footer_web").should("be.visible");

    BirthdayResearchSocialItems.forEach((BirthdayResearchSocialItem) => {
      cy.findByTestId(BirthdayResearchSocialItem.id)
        .should("be.visible")
        .should("have.attr", "href")
        .and("contain", BirthdayResearchSocialItem.url);
    });
  });

  it("should navigate to 404 page when random url is accessed", () => {
    cy.request({ url: "/random-url", failOnStatusCode: false })
      .its("status")
      .should("equal", 404);
    cy.visit("/random-url", { failOnStatusCode: false });
    cy.contains("h1", "Page Not Found");
  });
});
