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

  // ────────────────────────────────────────────────────────────────────
  // Calendly: custom in-page modal with a direct iframe to Calendly.
  // We avoid Calendly's official "PopupWidget" because it has been
  // observed to hang on the loading spinner on some desktop browsers.
  // A plain iframe + our own modal chrome is the most reliable approach.
  // ────────────────────────────────────────────────────────────────────
  var calModal = document.getElementById("cal-modal");
  var calModalIframe = document.getElementById("cal-modal-iframe");
  var calModalLoader = document.getElementById("cal-modal-loader");
  var calModalCloses = document.querySelectorAll("[data-cal-close]");
  var calModalOpen = false;

  function buildCalUrl(url) {
    var sep = url.indexOf("?") === -1 ? "?" : "&";
    return (
      url +
      sep +
      "embed_domain=" +
      encodeURIComponent(location.hostname || "heytenda.com") +
      "&embed_type=Inline&hide_event_type_details=0&hide_gdpr_banner=1"
    );
  }

  function openCalendlyModal(url) {
    if (!calModal || !calModalIframe) {
      // No modal markup on this page — fall back to a new tab so the
      // booking link is never dead.
      window.open(url, "_blank", "noopener");
      return;
    }
    if (calModalLoader) calModalLoader.hidden = false;
    calModalIframe.onload = function () {
      if (calModalLoader) calModalLoader.hidden = true;
    };
    // Force a reload even if it's the same URL — fresh embed every open.
    calModalIframe.src = buildCalUrl(url);
    calModal.hidden = false;
    document.body.classList.add("cal-locked");
    calModalOpen = true;
    try {
      history.pushState({ calOpen: true }, "", location.href);
    } catch (_) {}
    // Move focus to the close button so ESC/Enter is wired up immediately.
    var closer = calModal.querySelector(".cal-modal__close");
    if (closer) {
      try {
        closer.focus({ preventScroll: true });
      } catch (_) {
        closer.focus();
      }
    }
  }

  function closeCalendlyModal(viaPopstate) {
    if (!calModalOpen || !calModal) return;
    calModal.hidden = true;
    if (calModalIframe) calModalIframe.src = "about:blank";
    document.body.classList.remove("cal-locked");
    calModalOpen = false;
    if (!viaPopstate && history.state && history.state.calOpen) {
      try {
        history.back();
      } catch (_) {}
    }
  }

  calModalCloses.forEach(function (el) {
    el.addEventListener("click", function () {
      closeCalendlyModal(false);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && calModalOpen) {
      closeCalendlyModal(false);
    }
  });

  window.addEventListener("popstate", function () {
    if (calModalOpen) closeCalendlyModal(true);
  });

  var calendlyTriggers = document.querySelectorAll("[data-calendly-url]");
  calendlyTriggers.forEach(function (trigger) {
    trigger.addEventListener("click", function (e) {
      var url = trigger.getAttribute("data-calendly-url");
      if (!url) return;
      e.preventDefault();
      openCalendlyModal(url);
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
          // Redirect to the dedicated welcome page so users get the full
          // post-signup experience (book demo / follow build / share).
          // `label` retained as a query param so we could greet them by
          // channel later if useful.
          var qp = "?via=" + encodeURIComponent(label);
          window.location.assign("welcome.html" + qp);
        });
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Welcome page — share card
  // ────────────────────────────────────────────────────────────────────
  var copyBtn = document.getElementById("share-copy");
  var copyLabel = document.getElementById("share-copy-label");
  var shareUrlEl = document.getElementById("share-url");

  if (copyBtn && shareUrlEl) {
    copyBtn.addEventListener("click", function () {
      var url = shareUrlEl.value || shareUrlEl.getAttribute("value") || "";
      var done = function () {
        copyBtn.classList.add("is-copied");
        if (copyLabel) copyLabel.textContent = "Copied!";
        setTimeout(function () {
          copyBtn.classList.remove("is-copied");
          if (copyLabel) copyLabel.textContent = "Copy";
        }, 1800);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(url)
          .then(done)
          .catch(function () {
            // Fallback: select-and-execCommand for older browsers.
            try {
              shareUrlEl.removeAttribute("readonly");
              shareUrlEl.select();
              document.execCommand("copy");
              shareUrlEl.setAttribute("readonly", "true");
              done();
            } catch (_) {}
          });
      } else {
        try {
          shareUrlEl.removeAttribute("readonly");
          shareUrlEl.select();
          document.execCommand("copy");
          shareUrlEl.setAttribute("readonly", "true");
          done();
        } catch (_) {}
      }
    });
  }
})();
