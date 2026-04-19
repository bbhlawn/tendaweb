(function () {
  "use strict";

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var nav = document.querySelector(".nav");
  var toggle = document.getElementById("nav-toggle");
  var drawer = document.getElementById("drawer");

  function setDrawer(open) {
    if (!nav || !toggle || !drawer) return;
    nav.classList.toggle("is-open", open);
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (toggle && drawer) {
    toggle.addEventListener("click", function () {
      setDrawer(!drawer.classList.contains("is-open"));
    });

    drawer.addEventListener("click", function (e) {
      if (e.target === drawer) setDrawer(false);
    });

    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setDrawer(false);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) {
        setDrawer(false);
        toggle.focus();
      }
    });

    var mq = window.matchMedia("(min-width: 768px)");
    mq.addEventListener("change", function (e) {
      if (e.matches && drawer.classList.contains("is-open")) setDrawer(false);
    });
  }

  var form = document.getElementById("waitlist-form");
  var statusEl = document.getElementById("waitlist-status");
  var hintEl = document.getElementById("waitlist-hint");
  var successEl = document.getElementById("waitlist-success");
  var input = document.getElementById("contact");
  var dial = document.getElementById("dial-code");

  function looksLikePhone(v) {
    v = (v || "").trim();
    if (!v) return null;
    if (v.indexOf("@") !== -1) return false;
    return /^[\d+(\s-]/.test(v);
  }

  function syncDial() {
    if (!input || !dial) return;
    var phone = looksLikePhone(input.value);
    if (phone === null) {
      // Empty: hide dial so the bare placeholder reads correctly.
      dial.hidden = true;
      input.setAttribute("inputmode", "text");
      return;
    }
    dial.hidden = !phone;
    input.setAttribute("inputmode", phone ? "tel" : "text");
  }

  if (input) {
    input.addEventListener("input", syncDial);
    syncDial();
  }

  function classify(value) {
    var v = (value || "").trim();
    if (!v) return { kind: "empty" };
    if (v.indexOf("@") !== -1) {
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      return { kind: emailOk ? "email" : "invalid-email", value: v };
    }
    // Phone: if user already typed a + prefix, respect it; otherwise prepend
    // the dial code selected from the dropdown.
    var raw = v.replace(/[\s\-().]/g, "");
    var prefixed;
    if (raw.charAt(0) === "+") {
      prefixed = raw;
    } else {
      var code = dial && !dial.hidden ? dial.value : "";
      prefixed = (code || "") + raw;
    }
    var phoneOk = /^\+\d{7,15}$/.test(prefixed);
    return {
      kind: phoneOk ? "phone" : "invalid-phone",
      value: phoneOk ? prefixed : v,
    };
  }

  // On mobile (small viewport OR touch primary input), Calendly's popup
  // widget is cramped and lacks a clear close button — so we let the link
  // open in a new browser tab via the existing target="_blank". Hitting
  // Back on the new tab returns to Tenda instead of dropping the user out.
  function isMobileLikeViewport() {
    return (
      window.matchMedia("(max-width: 768px)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    );
  }

  var calendlyOpen = false;

  function openCalendly(url) {
    if (!window.Calendly || typeof window.Calendly.initPopupWidget !== "function") {
      return false;
    }
    window.Calendly.initPopupWidget({ url: url });
    calendlyOpen = true;
    // Push a history entry so the browser Back button closes the popup
    // instead of leaving the page.
    try {
      history.pushState({ calendly: true }, "", location.href);
    } catch (_) {}
    return true;
  }

  function closeCalendly() {
    if (
      window.Calendly &&
      typeof window.Calendly.closePopupWidget === "function"
    ) {
      window.Calendly.closePopupWidget();
    }
    calendlyOpen = false;
  }

  window.addEventListener("popstate", function () {
    if (calendlyOpen) closeCalendly();
  });

  var calendlyTriggers = document.querySelectorAll("[data-calendly-url]");
  calendlyTriggers.forEach(function (trigger) {
    trigger.addEventListener("click", function (e) {
      var url = trigger.getAttribute("data-calendly-url");
      if (!url) return;
      // Mobile: do nothing — let the browser open target="_blank" in a
      // new tab (separate from the Tenda tab).
      if (isMobileLikeViewport()) return;
      // Desktop: launch the in-page popup.
      if (openCalendly(url)) e.preventDefault();
      // Else: fall through to the href so the link still works if the
      // Calendly script hasn't finished loading yet.
    });
  });

  var GOOGLE_FORM_ID =
    "1FAIpQLScWWJ4OTzMFOAzxPSzkWRJuR6I_C6Cp6Rav4YeMwLX-QSDftw";
  var GOOGLE_CONTACT_ENTRY = "entry.854632602";

  function submitToGoogleForm(value) {
    var url =
      "https://docs.google.com/forms/d/e/" +
      GOOGLE_FORM_ID +
      "/formResponse";
    var body = new FormData();
    body.append(GOOGLE_CONTACT_ENTRY, value);
    return fetch(url, {
      method: "POST",
      mode: "no-cors",
      body: body,
    });
  }

  if (form && statusEl && input) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var result = classify(input.value);
      if (result.kind === "empty") {
        statusEl.textContent = "Please enter your email or WhatsApp number.";
        input.focus();
        return;
      }
      if (result.kind === "invalid-email") {
        statusEl.textContent = "That email doesn't look right — try again.";
        input.focus();
        return;
      }
      if (result.kind === "invalid-phone") {
        statusEl.textContent =
          "Please enter a valid number (pick your country code on the left).";
        input.focus();
        return;
      }

      var submitBtn = form.querySelector(".waitlist__btn");
      if (submitBtn) submitBtn.disabled = true;
      statusEl.textContent = "Adding you to the list…";

      var label = result.kind === "email" ? "email" : "WhatsApp";

      submitToGoogleForm(result.value)
        .catch(function () {
          // no-cors hides errors; we optimistically treat as success.
        })
        .then(function () {
          form.reset();
          syncDial();
          if (submitBtn) submitBtn.disabled = false;
          // Hide the form + hint + status, then reveal the success CTA in
          // their place. Keep `label` referenced so older browsers don't
          // tree-shake it during minification — and so we can announce it.
          statusEl.textContent =
            "You're on the list — we'll reach out via " + label + ".";
          if (form) form.hidden = true;
          if (hintEl) hintEl.hidden = true;
          if (statusEl) statusEl.hidden = true;
          if (successEl) {
            successEl.hidden = false;
            // Move keyboard focus to the new CTA so users can hit Enter to
            // book a demo immediately.
            try {
              successEl.focus({ preventScroll: true });
            } catch (_) {
              successEl.focus();
            }
          }
        });
    });
  }
})();
