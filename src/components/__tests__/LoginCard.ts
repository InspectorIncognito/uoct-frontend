import LoginCard from "../LoginCard.vue";

describe("LoginCard", () => {
  it("playground", () => {
    cy.mount(LoginCard, { props: {} });
  });

  it("renders properly", () => {
    cy.mount(LoginCard, { props: {} });
    cy.get("h2").should("contain", "Inicio de sesión");
  });
});
