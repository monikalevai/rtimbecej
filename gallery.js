/* =========================================================
   R-TIM — poređenje PRE / POSLE
   Slider koristi nativni <input type="range">, pa radi mišem,
   dodirom i tastaturom (strelice, Home/End, PageUp/PageDown).
   ========================================================= */
(function () {
  "use strict";
  document.querySelectorAll("[data-ba]").forEach(function (box) {
    var range = box.querySelector('input[type="range"]');
    if (!range) return;
    var update = function () {
      var v = Number(range.value);
      box.style.setProperty("--pos", v + "%");
      range.setAttribute("aria-valuetext", "Prikazano " + v + "% fotografije PRE i " + (100 - v) + "% fotografije POSLE");
    };
    range.addEventListener("input", update);
    range.addEventListener("change", update);

    /* Miš i dodir: prevlačenje bilo gde po fotografiji */
    var dragging = false;
    var setFromX = function (clientX) {
      var r = box.getBoundingClientRect();
      var v = Math.round(((clientX - r.left) / r.width) * 100);
      range.value = Math.max(0, Math.min(100, v));
      update();
    };
    box.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      if (box.setPointerCapture) box.setPointerCapture(e.pointerId);
      setFromX(e.clientX);
    });
    box.addEventListener("pointermove", function (e) { if (dragging) setFromX(e.clientX); });
    var stop = function () { dragging = false; };
    box.addEventListener("pointerup", stop);
    box.addEventListener("pointercancel", stop);
    box.addEventListener("lostpointercapture", stop);

    update();
  });
})();
