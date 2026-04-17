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

  function classify(value) {
    var v = (value || "").trim();
    if (!v) return { kind: "empty" };
    if (v.indexOf("@") !== -1) {
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      return { kind: emailOk ? "email" : "invalid-email", value: v };
    }
    var digits = v.replace(/[\s\-().]/g, "");
    var phoneOk = /^\+?\d{7,15}$/.test(digits);
    return {
      kind: phoneOk ? "phone" : "invalid-phone",
      value: phoneOk ? digits : v,
    };
  }

  if (form && statusEl) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("contact");
      if (!input) return;
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
          "Please include your country code, e.g. +1 555 123 4567.";
        input.focus();
        return;
      }
      var label = result.kind === "email" ? "email" : "WhatsApp";
      statusEl.textContent =
        "You're on the list — we'll reach out via " + label + ".";
      form.reset();
    });
  }
})();
