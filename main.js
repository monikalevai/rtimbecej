/* =========================================================
   R-TIM Auto Centar — glavni JS
   ========================================================= */

/* ---------------------------------------------------------
   PODEŠAVANJA — menjajte samo ovde
   --------------------------------------------------------- */
var RTIM_CONFIG = {
  /* WhatsApp broj u međunarodnom formatu, bez "+" i razmaka (potvrđeno da je aktivan).
     Ako se obriše (""), forme samo pripremaju tekst za kopiranje i nude poziv. */
  whatsappBroj: "381616484144",

  /* Radni dani — upisati posle potvrde, npr. "Ponedeljak – subota".
     Dok je prazno, na sajtu stoji tekst iz HTML-a sa oznakom „za potvrdu". */
  radniDani: "",

  /* Email — upisati tek kada bude potvrđen. */
  email: "",

  /* Sekcija „Utisci klijenata" na početnoj: false = sakrivena. */
  prikaziUtiske: true
};

(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.remove("no-js");

  /* ---------- Primena podešavanja ---------- */
  function applyConfig() {
    if (RTIM_CONFIG.radniDani) {
      document.querySelectorAll('[data-cfg="radniDani"]').forEach(function (el) {
        el.textContent = RTIM_CONFIG.radniDani;
      });
      document.querySelectorAll('[data-tbc="radniDani"]').forEach(function (el) { el.remove(); });
    }
    if (RTIM_CONFIG.email) {
      document.querySelectorAll('[data-cfg="email"]').forEach(function (el) {
        var a = document.createElement("a");
        a.href = "mailto:" + RTIM_CONFIG.email;
        a.textContent = RTIM_CONFIG.email;
        a.className = el.className;
        el.replaceWith(a);
      });
      document.querySelectorAll('[data-tbc="email"]').forEach(function (el) { el.remove(); });
    }
    if (!RTIM_CONFIG.prikaziUtiske) {
      document.querySelectorAll('[data-section="utisci"]').forEach(function (el) { el.hidden = true; });
    }
  }
  applyConfig();

  /* ---------- Bez usamljene reči u poslednjem redu ---------- */
  function noWidows(root) {
    var sel = "h1, h2, h3, h4, p, li, dd, .btn, .link-arrow, .hero-sub, figcaption, label, .chip";
    (root || document).querySelectorAll(sel).forEach(function (el) {
      if (el.closest("pre, .no-widow-fix")) return;
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var last = null, node;
      while ((node = walker.nextNode())) { if (/\S/.test(node.nodeValue)) last = node; }
      if (!last) return;
      var txt = last.nodeValue.replace(/\s+$/, "");
      var trail = last.nodeValue.slice(txt.length);
      /* Ako su poslednje dve reči već spojene (&nbsp;), ne diramo ništa */
      var i = Math.max(txt.lastIndexOf(" "), txt.lastIndexOf(" "));
      if (i > 0 && txt.charAt(i) === " " && txt.slice(0, i).trim().length) {
        last.nodeValue = txt.slice(0, i) + " " + txt.slice(i + 1) + trail;
      }
    });
  }
  noWidows();

  /* ---------- Mobilna navigacija ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  if (toggle && nav) {
    var mq = window.matchMedia("(max-width: 1100px)");
    var setOpen = function (open, returnFocus) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Zatvori meni" : "Otvori meni");
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
      if (open) {
        var first = nav.querySelector("a");
        if (first) setTimeout(function () { first.focus(); }, 60);
      } else if (returnFocus) {
        toggle.focus();
      }
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) setOpen(false, true);
      /* Zadrži fokus unutar otvorenog menija */
      if (e.key === "Tab" && nav.classList.contains("is-open") && mq.matches) {
        var f = [toggle].concat([].slice.call(nav.querySelectorAll("a, button")));
        var firstEl = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    });
    var onMq = function () { if (!mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener("change", onMq); else mq.addListener(onMq);
  }

  /* ---------- Header pri skrolu + plutajuće dugme ---------- */
  var header = document.querySelector(".site-header");
  var floatCall = document.querySelector(".float-call");
  var onScroll = function () {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("is-scrolled", y > 40);
    if (floatCall) {
      var nearEnd = (window.innerHeight + y) > (document.body.scrollHeight - 420);
      floatCall.classList.toggle("is-visible", y > window.innerHeight * 0.7 && !nearEnd);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Pojavljivanje sekcija ---------- */
  var reveals = document.querySelectorAll(".reveal");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Godina u footeru ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Forme (upit za uvoz / kontakt) ----------
     Sajt je statičan i nema server. Forma NE šalje email i NE čuva podatke.
     Ako je RTIM_CONFIG.whatsappBroj upisan, otvara WhatsApp sa pripremljenom
     porukom (korisnik sam pritiska „Pošalji"). U suprotnom prikazuje
     pripremljen tekst koji se može kopirati, uz poziv na telefon. */
  var PHONE_DISPLAY = "061 648 41 44";
  var PHONE_TEL = "tel:+381616484144";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function validate(form) {
    var ok = true, firstBad = null;
    form.querySelectorAll("[required]").forEach(function (input) {
      var field = input.closest(".field");
      var v = input.value.trim();
      var bad = !v;
      if (!bad && input.type === "tel") bad = v.replace(/[^\d]/g, "").length < 6;
      if (!bad && input.type === "email" && v) bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (field) field.classList.toggle("has-error", bad);
      input.setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad) { ok = false; if (!firstBad) firstBad = input; }
    });
    form.querySelectorAll('input[type="email"]:not([required])').forEach(function (input) {
      var v = input.value.trim();
      var bad = v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      var field = input.closest(".field");
      if (field) field.classList.toggle("has-error", !!bad);
      input.setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad) { ok = false; if (!firstBad) firstBad = input; }
    });
    if (firstBad) firstBad.focus();
    return ok;
  }

  function buildMessage(form) {
    var lines = [form.getAttribute("data-title") || "Upit sa sajta R-TIM", ""];
    form.querySelectorAll("[data-label]").forEach(function (input) {
      var v = input.value.trim();
      if (v) lines.push(input.getAttribute("data-label") + ": " + v);
    });
    return lines.join("\n");
  }

  document.querySelectorAll("form[data-wa-form]").forEach(function (form) {
    var status = form.querySelector(".form-status");
    var methodText = form.querySelector("[data-method-text]");
    var submitLabel = form.querySelector("[data-submit-label]");

    if (!RTIM_CONFIG.whatsappBroj) {
      if (methodText) methodText.textContent = "Sajt nema server i ne šalje email. Posle provere polja dobićete pripremljen tekst koji možete kopirati i poslati porukom, ili nas pozovite na " + PHONE_DISPLAY + ".";
      if (submitLabel) submitLabel.textContent = "Pripremite poruku";
    }
    if (RTIM_CONFIG.whatsappBroj) {
      if (methodText) methodText.textContent = "Klikom na dugme otvara se WhatsApp sa pripremljenom porukom. Poruka se šalje tek kada u WhatsApp-u pritisnete „Pošalji“. Sajt ne čuva vaše podatke.";
      if (submitLabel) submitLabel.textContent = "Pošaljite preko WhatsApp-a";
    }

    form.querySelectorAll("input, textarea, select").forEach(function (el) {
      el.addEventListener("input", function () {
        var f = el.closest(".field");
        if (f && f.classList.contains("has-error") && el.value.trim()) { f.classList.remove("has-error"); el.setAttribute("aria-invalid", "false"); }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) {
        status.innerHTML = '<div class="notice notice--info" role="alert"><p>Molimo popunite obavezna polja označena zvezdicom.</p></div>';
        return;
      }
      var msg = buildMessage(form);

      if (RTIM_CONFIG.whatsappBroj) {
        var url = "https://wa.me/" + encodeURIComponent(RTIM_CONFIG.whatsappBroj.replace(/[^\d]/g, "")) + "?text=" + encodeURIComponent(msg);
        var w = window.open(url, "_blank", "noopener");
        status.innerHTML =
          '<div class="notice notice--ok" role="status"><h3>WhatsApp je otvoren</h3>' +
          '<p>Proverite poruku i pritisnite „Pošalji“ u WhatsApp-u. Ako se prozor nije otvorio, ' +
          '<a class="accent" href="' + esc(url) + '" target="_blank" rel="noopener">kliknite ovde</a>.</p></div>';
        if (!w) { /* blokiran popup — link iznad i dalje radi */ }
        return;
      }

      status.innerHTML =
        '<div class="notice notice--info" role="status">' +
        "<h3>Vaš upit je pripremljen</h3>" +
        "<p>Slanje upita preko sajta još nije aktivirano. Pozovite nas ili kopirajte tekst ispod i pošaljite ga porukom na " + PHONE_DISPLAY + ".</p>" +
        '<pre tabindex="0" aria-label="Pripremljen tekst upita">' + esc(msg) + "</pre>" +
        '<div class="btn-row">' +
        '<a class="btn" href="' + PHONE_TEL + '">Pozovite ' + PHONE_DISPLAY + "</a>" +
        '<button type="button" class="btn btn--ghost" data-copy>Kopirajte tekst upita</button>' +
        "</div></div>";
      noWidows(status);
      var copyBtn = status.querySelector("[data-copy]");
      copyBtn.addEventListener("click", function () {
        var done = function () { copyBtn.textContent = "Tekst je kopiran"; };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(msg).then(done, function () { fallbackCopy(msg); done(); });
        } else { fallbackCopy(msg); done(); }
      });
      status.querySelector(".notice").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    });
  });

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (err) { /* nema podrške */ }
    document.body.removeChild(ta);
  }

  /* ---------- Dugme „Pošaljite upit“ na kartici vozila popunjava formu ---------- */
  document.querySelectorAll("[data-car-inquiry]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var name = btn.getAttribute("data-car-inquiry");
      var ta = document.getElementById("upit-zelje");
      if (ta && name && name.indexOf("Podaci o vozilu") === -1) {
        ta.value = "Zanima me vozilo iz ponude: " + name;
      }
    });
  });
})();
