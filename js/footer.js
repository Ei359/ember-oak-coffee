
"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // Automatically update footer copyright year
  document.querySelectorAll("[data-footer-year]")
    .forEach(element => {
      element.textContent = new Date().getFullYear();
    });

  // Set up newsletter demo
  document.querySelectorAll(".eo-footer")
    .forEach(footer => {

      const input = footer.querySelector(
        "[data-newsletter-input]"
      );

      const button = footer.querySelector(
        "[data-newsletter-button]"
      );

      const status = footer.querySelector(
        "[data-newsletter-status]"
      );

      if (!input || !button || !status) {
        return;
      }

      function previewSignup() {

        // Validate the email format
        if (!input.reportValidity()) {
          return;
        }

        // Demonstration only: no network request
        // and no email stored in localStorage.
        status.textContent =
          "Demo complete! No subscription was created " +
          "and your email was not saved or sent.";

        input.value = "";
      }

      button.addEventListener("click", previewSignup);

      // Allow Enter to activate the demo
      input.addEventListener("keydown", event => {

        if (event.key === "Enter") {
          event.preventDefault();
          previewSignup();
        }

      });

    });

});