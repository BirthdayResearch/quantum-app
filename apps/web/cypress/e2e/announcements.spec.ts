const testAnnouncements = [
  {
    id: "1",
    lang: {
      en: "Join us on this exciting journey as we connect DeFiChain and Ethereum through Quantum",
    },
    version: ">=0.0.0",
    url: "",
  },
];

describe("Announcement Banner", () => {
  beforeEach(() => {
    cy.visit("http://localhost:3000/?network=Local");
  });

  it("should display announcement banner", () => {
    cy.intercept("**/bridge/announcements", {
      statusCode: 200,
      body: testAnnouncements,
    });
    cy.findByTestId("announcement_banner").should("exist");
  });

  it("should handle failed API announcement calls", () => {
    cy.intercept("**/bridge/announcements", {
      statusCode: 500,
      body: "Error!",
    });
    cy.findByTestId("announcement_banner").should("not.exist");
  });

  it("should handle empty announcements", () => {
    cy.intercept("**/bridge/announcements", {
      statusCode: 200,
      body: [],
    });
    cy.findByTestId("announcement_banner").should("not.exist");
  });
});
