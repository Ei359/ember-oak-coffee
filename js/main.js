
(() => {
  "use strict";

  const catalog = window.EMBER_OAK_PRODUCTS || [];

  const products = new Map(
    catalog.map(product => [product.id, product])
  );

  const CART_KEY = "emberOakCart";
  const PROMO_KEY = "emberOakPromo";

  const money = cents =>
    "$" + (cents / 100).toFixed(2);

  const priceInCents = price =>
    Math.round(price * 100);

  // ========================================
  // LOCAL STORAGE
  // ========================================

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn("Local storage is unavailable.");
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      console.warn("Local storage is unavailable.");
    }
  }

  // ========================================
  // GET CART
  // ========================================

  function getCart() {
    try {
      const stored = JSON.parse(
        read(CART_KEY) || "{}"
      );

      if (
        !stored ||
        typeof stored !== "object" ||
        Array.isArray(stored)
      ) {
        return {};
      }

      const cart = {};

      for (const [id, qty] of Object.entries(stored)) {
        if (
          products.has(id) &&
          Number.isInteger(qty) &&
          qty >= 1 &&
          qty <= 99
        ) {
          cart[id] = qty;
        }
      }

      return cart;

    } catch {
      return {};
    }
  }

  // ========================================
  // SAVE CART
  // ========================================

  function saveCart(cart) {
    write(CART_KEY, JSON.stringify(cart));

    refreshCartUI();

    document.dispatchEvent(
      new Event("cart:updated")
    );
  }

  // ========================================
  // UPDATE CART BADGE
  // ========================================

  function updateCartBadges() {
    const total = Object.values(getCart()).reduce(
      (sum, qty) => sum + qty,
      0
    );

    document.querySelectorAll("[data-cart-count]")
      .forEach(badge => {
        badge.textContent = total;

        badge.setAttribute(
          "aria-label",
          `${total} items in cart`
        );
      });
  }

  // ========================================
  // UPDATE PRODUCT CARD QUANTITIES
  // ========================================

  function updateProductControls() {
    const cart = getCart();

    document.querySelectorAll(".card-cart-action")
      .forEach(control => {

        const id = control.dataset.productId;

        const qty = cart[id] || 0;

        const addButton =
          control.querySelector("[data-add]");

        const stepper =
          control.querySelector(".card-stepper");

        const value =
          control.querySelector("[data-quantity-value]");

        const plusButton =
          control.querySelector('[data-step="1"]');

        // At quantity 0, show Add to Cart.
        addButton.hidden = qty > 0;

        // At quantity 1 or more, show - quantity +.
        stepper.hidden = qty === 0;

        value.textContent = qty;

        // Maximum quantity: 99
        plusButton.disabled = qty >= 99;
      });
  }

  function refreshCartUI() {
    updateCartBadges();
    updateProductControls();
  }

  // ========================================
  // INITIALIZE PRODUCT CARD CONTROLS
  // ========================================

  function initProductCards() {

    // Product cards already exist in the HTML.
    // Add quantity selectors without replacing cards.

    document.querySelectorAll(
      ".product-card button[data-add]"
    ).forEach(addButton => {

      const id = addButton.dataset.add;
      const product = products.get(id);

      if (!product) {
        addButton.disabled = true;
        return;
      }

      if (addButton.closest(".card-cart-action")) {
        return;
      }

      // Create a wrapper
      const holder = document.createElement("div");

      holder.className = "card-cart-action";
      holder.dataset.productId = id;

      addButton.before(holder);
      holder.append(addButton);

      // Create quantity selector
      const stepper = document.createElement("div");

      stepper.className = "card-stepper";
      stepper.hidden = true;

      // Minus button
      const minus = document.createElement("button");

      minus.type = "button";
      minus.dataset.step = "-1";
      minus.textContent = "−";

      minus.setAttribute(
        "aria-label",
        `Decrease ${product.name}`
      );

      // Quantity number
      const number = document.createElement("span");

      number.dataset.quantityValue = "";
      number.textContent = "0";

      number.setAttribute(
        "aria-live",
        "polite"
      );

      number.setAttribute(
        "aria-label",
        "Quantity in cart"
      );

      // Plus button
      const plus = document.createElement("button");

      plus.type = "button";
      plus.dataset.step = "1";
      plus.textContent = "+";

      plus.setAttribute(
        "aria-label",
        `Increase ${product.name}`
      );

      // Add elements to product card
      stepper.append(minus, number, plus);

      holder.append(stepper);

    });

    // ====================================
    // CLICK ADD, PLUS OR MINUS
    // ====================================

    document.addEventListener("click", event => {

      const button = event.target.closest(
        ".card-cart-action button[data-add], " +
        ".card-cart-action button[data-step]"
      );

      if (!button) return;

      const holder = button.closest(
        ".card-cart-action"
      );

      const id = holder.dataset.productId;
      const product = products.get(id);

      if (!product) return;

      const cart = getCart();
      const current = cart[id] || 0;

      let next;

      // First Add to Cart click
      if (button.hasAttribute("data-add")) {
        next = 1;
      } else {

        // Increase or decrease
        const change = Number(
          button.dataset.step
        );

        next = Math.max(
          0,
          Math.min(99, current + change)
        );
      }

      // Quantity 0 removes the item
      if (next === 0) {
        delete cart[id];
      } else {
        cart[id] = next;
      }

      // Save changes
      saveCart(cart);

      // Display notification
      const notice =
        document.getElementById("cartNotice");

      if (notice) {
        notice.textContent = next === 0
          ? `${product.name} removed from cart.`
          : `${product.name}: ${next} in your cart.`;
      }

    });

    // Restore quantities after refreshing
    refreshCartUI();
  }

  // ========================================
  // PRODUCT SEARCH
  // ========================================

  function initProductSearch() {

    const input =
      document.getElementById("productSearch");

    const grid =
      document.getElementById("productGrid");

    const noProducts =
      document.getElementById("noProducts");

    if (!input || !grid) return;

    function filter() {
      const term = input.value
        .trim()
        .toLowerCase();

      let matches = 0;

      grid.querySelectorAll(".product-card")
        .forEach(card => {

          const visible = card.textContent
            .toLowerCase()
            .includes(term);

          card.hidden = !visible;

          if (visible) {
            matches++;
          }
        });

      if (noProducts) {
        noProducts.hidden = matches !== 0;
      }
    }

    input.addEventListener("input", filter);
  }

  // ========================================
  // SHOPPING CART PAGE
  // ========================================

  function initCartPage() {

    const list =
      document.getElementById("cartItems");

    if (!list) return;

    const subtotalEl =
      document.getElementById("subtotalValue");

    const discountEl =
      document.getElementById("discountValue");

    const taxEl =
      document.getElementById("taxValue");

    const totalEl =
      document.getElementById("totalValue");

    const checkout =
      document.getElementById("checkoutButton");

    const promoInput =
      document.getElementById("promoInput");

    const promoMessage =
      document.getElementById("promoMessage");

    if (
      ![
        subtotalEl,
        discountEl,
        taxEl,
        totalEl,
        checkout
      ].every(Boolean)
    ) {
      return;
    }

    // ====================================
    // DISPLAY CART ITEMS
    // ====================================

    function render() {

      const cart = getCart();

      let subtotal = 0;

      list.replaceChildren();

      for (const [id, qty] of Object.entries(cart)) {

        const product = products.get(id);

        const unitPrice =
          priceInCents(product.price);

        subtotal += unitPrice * qty;

        const item =
          document.createElement("article");

        item.className = "cart-item";

        // Values come from the local product catalogue.
        item.innerHTML = `
          <img
            src="${product.image}"
            alt="${product.name}"
          >

          <div class="cart-item-info">

            <h3>${product.name}</h3>

            <p>${money(unitPrice)} each</p>

            <button
              type="button"
              class="text-button"
              data-action="remove"
              data-id="${id}"
            >
              Remove
            </button>

          </div>

          <div class="quantity-controls">

            <button
              type="button"
              data-action="decrease"
              data-id="${id}"
              aria-label="Decrease ${product.name}"
            >
              −
            </button>

            <input
              type="number"
              min="1"
              max="99"
              value="${qty}"
              data-quantity="${id}"
              aria-label="Quantity for ${product.name}"
            >

            <button
              type="button"
              data-action="increase"
              data-id="${id}"
              aria-label="Increase ${product.name}"
            >
              +
            </button>

          </div>

          <strong>
            ${money(unitPrice * qty)}
          </strong>
        `;

        list.append(item);
      }

      // Empty cart
      if (Object.keys(cart).length === 0) {
        list.innerHTML = `
          <p class="empty-message">
            Your cart is empty.
            <a href="coffee.html">Browse Coffee</a>
            or
            <a href="equipment.html">Equipment</a>.
          </p>
        `;
      }

      // Calculate demo discount and tax
      const discount =
        read(PROMO_KEY) === "WELCOME15"
          ? Math.round(subtotal * 0.15)
          : 0;

      const tax = Math.round(
        (subtotal - discount) * 0.05
      );

      subtotalEl.textContent =
        money(subtotal);

      discountEl.textContent =
        "−" + money(discount);

      taxEl.textContent =
        money(tax);

      totalEl.textContent =
        money(subtotal - discount + tax);

      checkout.disabled = subtotal === 0;
    }

    // ====================================
    // CART PAGE QUANTITY BUTTONS
    // ====================================

    list.addEventListener("click", event => {

      const button = event.target.closest(
        "button[data-action]"
      );

      if (!button) return;

      const { id, action } = button.dataset;

      const cart = getCart();

      if (!cart[id]) return;

      if (action === "remove") {
        delete cart[id];
      }

      if (action === "increase") {
        cart[id] = Math.min(99, cart[id] + 1);
      }

      if (action === "decrease") {
        cart[id]--;

        if (cart[id] <= 0) {
          delete cart[id];
        }
      }

      saveCart(cart);
    });

    // ====================================
    // MANUAL CART QUANTITY INPUT
    // ====================================

    list.addEventListener("change", event => {

      const input = event.target.closest(
        "input[data-quantity]"
      );

      if (!input) return;

      const qty = Number(input.value);

      if (
        !Number.isInteger(qty) ||
        qty < 1 ||
        qty > 99
      ) {
        render();
        return;
      }

      const cart = getCart();

      if (!cart[input.dataset.quantity]) {
        return;
      }

      cart[input.dataset.quantity] = qty;

      saveCart(cart);
    });

    // ====================================
    // APPLY DISCOUNT
    // ====================================

    document.getElementById("applyPromo")
      ?.addEventListener("click", () => {

        if (!promoInput || !promoMessage) {
          return;
        }

        const code = promoInput.value
          .trim()
          .toUpperCase();

        if (code === "WELCOME15") {

          write(PROMO_KEY, "WELCOME15");

          promoMessage.textContent =
            "15% demo discount applied.";

          promoInput.value = "";

          render();

        } else {

          promoMessage.textContent =
            "Invalid code. Try WELCOME15.";
        }

      });

    // ====================================
    // REMOVE DISCOUNT
    // ====================================

    document.getElementById("removePromo")
      ?.addEventListener("click", () => {

        remove(PROMO_KEY);

        if (promoMessage) {
          promoMessage.textContent =
            "Demo discount removed.";
        }

        render();
      });

    // ====================================
    // DEMO CHECKOUT
    // ====================================

    checkout.addEventListener("click", () => {

      alert(
        "Demo checkout only. " +
        "No payment has been taken " +
        "and no order has been placed."
      );
    });

    // Refresh Cart page after quantity changes
    document.addEventListener(
      "cart:updated",
      render
    );

    render();
  }

  // ========================================
  // WELCOME POPUP
  // ========================================

  function initWelcomeDialog() {

    const dialog =
      document.getElementById("welcomeDialog");

    if (!dialog) return;

    let seen = false;

    try {
      seen = sessionStorage.getItem(
        "emberOakWelcomeSeen"
      ) === "yes";
    } catch {
      // Session storage unavailable
    }

    if (
      !seen &&
      typeof dialog.showModal === "function"
    ) {
      dialog.showModal();
    }

    dialog.addEventListener("close", () => {

      try {
        sessionStorage.setItem(
          "emberOakWelcomeSeen",
          "yes"
        );
      } catch {
        // Session storage unavailable
      }

    });

    document.getElementById("closeWelcome")
      ?.addEventListener("click", () => {
        dialog.close();
      });

    document.getElementById("welcomeForm")
      ?.addEventListener("submit", event => {

        event.preventDefault();

        if (!event.currentTarget.reportValidity()) {
          return;
        }

        write(PROMO_KEY, "WELCOME15");

        dialog.close();

        const status =
          document.getElementById("welcomeStatus");

        if (status) {
          status.textContent =
            "Demo code WELCOME15 saved. " +
            "Apply it in your cart.";
        }

      });
  }

  // ========================================
  // EVENT FORM
  // ========================================

  function initEventForm() {

    const form =
      document.getElementById("eventForm");

    if (!form) return;

    form.addEventListener("submit", event => {

      event.preventDefault();

      if (!form.reportValidity()) {
        return;
      }

      const output =
        document.getElementById("eventMessage");

      if (output) {
        output.textContent =
          "Demo form only. " +
          "No registration was submitted or saved.";
      }

      form.reset();
    });
  }

  // ========================================
  // INITIALIZE ALL FEATURES
  // ========================================

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      document.querySelectorAll("[data-year]")
        .forEach(element => {
          element.textContent =
            new Date().getFullYear();
        });

      initProductCards();
      initProductSearch();
      initCartPage();
      initWelcomeDialog();
      initEventForm();

      // Synchronize changes across browser tabs
      window.addEventListener("storage", event => {

        if (
          event.key === CART_KEY ||
          event.key === PROMO_KEY ||
          event.key === null
        ) {

          refreshCartUI();

          document.dispatchEvent(
            new Event("cart:updated")
          );
        }

      });

    }
  );

})();