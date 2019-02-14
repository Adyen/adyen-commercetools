describe('Credit card 3DS 1.0', () => {
  let ctpPaymentCreditCard3DS

  before(() => {
    cy.task('ngrokInit', 8000)
      .then(() => cy.task('paymentResources'))
      .then(() => cy.task('createCreditCard3DS'))
      .then((response) => {
        ctpPaymentCreditCard3DS = response.body
      })
  })

  after(() => {
    cy.task('ngrokDestroy')
  })

  it('should finish the payment process', () => {
    const adyenResponse = JSON.parse(ctpPaymentCreditCard3DS.interfaceInteractions[0].fields.response)
    cy.visit('cypress/resources/credit-card-3ds-form.html')
    cy.get('#PaReq').type(adyenResponse.redirect.data.PaReq)
    cy.get('#TermUrl').type(adyenResponse.redirect.data.TermUrl)
    cy.get('#MD').type(adyenResponse.redirect.data.MD)
    cy.get('#submit').click()
    cy.get('#username').type('user')
    cy.get('#password').type('password')
    cy.get('input[type="submit"]').click()
    cy.get('#interfaceId')
      .should(($div) => {
        expect($div.text().trim()).match(/^[0-9]*$/)
      })
  })
})
