// https://docs.cypress.io/api/introduction/api.html

describe("Login", () => {
  it("visits the app root url", () => {
    cy.visit("/");
    cy.contains("h2", "login.title");
  });
});
