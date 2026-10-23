/* =========================================================
   R-TIM — intro animacija
   Sloj po sloj: pozadina (dim, guma, obod) je statična,
   krakovi + disk se okreću, kočiona čeljust stoji.
   Trajanje ≈ 1,9 s. Jednom po sesiji (sessionStorage).
   Test: dodajte ?intro=1 na adresu da se prikaže ponovo.
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var intro = document.getElementById("intro");
  if (!intro || !root.classList.contains("intro-on")) {
    if (intro) intro.parentNode.removeChild(intro);
    return;
  }

  var stage = intro.querySelector(".intro-stage");
  var wheel = intro.querySelector(".intro-wheel");
  var imgOrig = intro.querySelector(".intro-rim--orig");
  var imgSharp = intro.querySelector(".intro-rim--sharp");
  var imgBlur = intro.querySelector(".intro-rim--blur");
  var imgBlur2 = intro.querySelector(".intro-rim--blur2");
  var imgCal = intro.querySelector(".intro-caliper");
  var canvas = intro.querySelector(".intro-fx");
  var flash = intro.querySelector(".intro-flash");
  var skip = intro.querySelector(".intro-skip");
  var ctx = canvas.getContext("2d");

  /* ---- Geometrija (izvorna slika 1672×941) ---- */
  var CROP_W = 1672, CROP_H = 941;
  var HUB_X = 900.5, HUB_Y = 478.7;    // centar glavčine
  var RING_X = 924.3, RING_Y = 483.6;  // centar zlatnog oboda
  var SX = 0.586;                      // odnos osa zlatnog oboda (perspektiva)

  /* ---- Tajming ---- */
  var APPEAR = 380;       // pojavljivanje
  var SPIN = 1450;        // ubrzavanje
  var THETA_MAX = 1300;   // ukupan ugao (°) do vrhunca
  var FLASH_AT = 1320;    // početak svetlosnog prelaza
  var EXIT_AT = 1440;     // početak otkrivanja početne
  var LOAD_TIMEOUT = 1400;

  var done = false, start = 0, raf = 0, W = 0, H = 0, DPR = 1, leaving = false;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { var x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

  try { sessionStorage.setItem("rtimIntroSeen", "1"); } catch (e) { /* privatni režim */ }

  /* ---- Mapiranje: tačka na felni (polarno, u „ispravljenom“ krugu) → piksel na sceni ---- */
  function toStage(rho, ang) {
    var u = rho * Math.cos(ang), v = rho * Math.sin(ang);
    var x = RING_X + SX * u;
    var y = RING_Y + v;
    return [x / CROP_W * W, y / CROP_H * H];
  }

  function resize() {
    var r = stage.getBoundingClientRect();
    var z = parseFloat(stage.style.getPropertyValue("--intro-zoom")) || 1;
    W = r.width / z; H = r.height / z;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    /* blesak tačno na glavčini */
    var z2 = parseFloat(stage.style.getPropertyValue("--intro-zoom")) || 1;
    var hx = r.left + r.width * (HUB_X / CROP_W), hy = r.top + r.height * (HUB_Y / CROP_H);
    flash.style.setProperty("--fx", (hx / window.innerWidth * 100).toFixed(2) + "%");
    flash.style.setProperty("--fy", (hy / window.innerHeight * 100).toFixed(2) + "%");
    void z2;
  }

  /* Svetlosni tragovi koji prate obod i gumu */
  var TRAILS = [
    { r: 243, off: 0, w: 3.6 },
    { r: 246, off: 180, w: 3.0 },
    { r: 240, off: 95, w: 2.0 },
    { r: 249, off: 270, w: 1.6 }
  ];
  /* Horizontalni tragovi brzine iza točka */
  var STREAKS = [];
  for (var i = 0; i < 9; i++) {
    STREAKS.push({ y: 300 + i * 46 + (i % 3) * 11, len: 180 + (i * 67) % 260, ph: (i * 173) % 600, sp: 0.9 + (i % 4) * 0.25, w: 1 + (i % 3) * 0.6 });
  }

  function drawFx(theta, sp, t) {
    ctx.clearRect(0, 0, W, H);
    if (sp <= 0.01) return;
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    var k = W / 1550;
    var N = 36;
    var len = (25 + 115 * sp) * Math.PI / 180;
    for (var i = 0; i < TRAILS.length; i++) {
      var tr = TRAILS[i];
      var head = (theta + tr.off) * Math.PI / 180;
      var prev = toStage(tr.r, head - len);
      for (var s = 1; s <= N; s++) {
        var f = s / N;
        var p = toStage(tr.r, head - len + len * f);
        var a = sp * Math.pow(f, 1.6);
        ctx.strokeStyle = "rgba(255," + Math.round(178 + 50 * f) + "," + Math.round(60 + 90 * f * f) + "," + (a * 0.75).toFixed(3) + ")";
        ctx.lineWidth = tr.w * k * (0.35 + 0.9 * f);
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        prev = p;
      }
    }
    /* tragovi brzine levo od točka */
    var x0 = 600 / CROP_W * W;
    for (var j = 0; j < STREAKS.length; j++) {
      var st = STREAKS[j];
      var travel = ((t * st.sp * 1.4 + st.ph) % 560) / CROP_W * W;
      var xh = x0 - travel, l = st.len / CROP_W * W * (0.4 + sp);
      var y = st.y / CROP_H * H;
      var g = ctx.createLinearGradient(xh - l, y, xh, y);
      g.addColorStop(0, "rgba(255,212,0,0)");
      g.addColorStop(1, "rgba(255,226,90," + (0.55 * sp).toFixed(3) + ")");
      ctx.strokeStyle = g; ctx.lineWidth = st.w * k;
      ctx.beginPath(); ctx.moveTo(xh - l, y); ctx.lineTo(xh, y); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    if (done) return;
    var t = now - start;

    /* pojavljivanje */
    var ap = easeOut(clamp(t / APPEAR, 0, 1));
    var exitP = clamp((t - EXIT_AT) / 420, 0, 1);
    var zoom = 1.05 - 0.05 * ap + 0.12 * easeOut(exitP);
    stage.style.opacity = ap.toFixed(3);
    stage.style.setProperty("--intro-zoom", zoom.toFixed(4));

    /* rotacija: θ = θmax·(t/T)³ → uverljivo ubrzavanje */
    var ts = clamp(t / SPIN, 0, 1.25);
    var theta = THETA_MAX * ts * ts * ts;
    var omega = 3 * THETA_MAX * ts * ts / (SPIN / 1000); // °/s
    wheel.style.setProperty("--intro-a", (theta % 360).toFixed(2) + "deg");

    /* slojevi po brzini */
    var origO = 1 - smooth(8, 26, theta);            // original (sa čeljusti) → čista felna
    imgOrig.style.opacity = origO.toFixed(3);
    imgCal.style.opacity = (1 - origO).toFixed(3);    // statična čeljust preuzima
    var blurO = smooth(350, 700, omega);               // oštra → zamućena
    var blur2O = smooth(1200, 1900, omega);            // → jače zamućena (zadržava strukturu krakova)
    imgBlur.style.opacity = blurO.toFixed(3);
    imgBlur2.style.opacity = blur2O.toFixed(3);
    if (blurO >= 1) imgSharp.style.opacity = "0";

    /* svetlo */
    var sp = smooth(380, 2500, omega);
    drawFx(theta, sp, t);
    var fl = smooth(FLASH_AT, FLASH_AT + 140, t) * (1 - smooth(FLASH_AT + 170, FLASH_AT + 420, t));
    flash.style.opacity = fl.toFixed(3);
    flash.style.transform = "scale(" + (0.85 + 0.5 * smooth(FLASH_AT, FLASH_AT + 420, t)).toFixed(3) + ")";

    if (t >= EXIT_AT && !leaving) finish(false);
    raf = requestAnimationFrame(frame);
  }

  function cleanup() {
    done = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVis);
    if (intro.parentNode) intro.parentNode.removeChild(intro);
    root.classList.remove("intro-on", "intro-lock");
  }

  function finish(fast) {
    if (leaving) return;
    leaving = true;
    var hadFocus = intro.contains(document.activeElement);
    root.classList.add("intro-reveal");
    intro.classList.add("is-leaving");
    if (fast) intro.classList.add("is-fast");
    root.classList.remove("intro-lock");  // skrol se vraća odmah
    var ended = false;
    var end = function () {
      if (ended) return; ended = true;
      cleanup();
      if (hadFocus) {
        var target = document.querySelector(".skip-link") || document.body;
        try { target.focus({ preventScroll: true }); } catch (e) { /* noop */ }
      }
    };
    intro.addEventListener("transitionend", end);
    setTimeout(end, fast ? 320 : 600);
  }

  function onKey(e) { if (e.key === "Escape") finish(true); }
  function onVis() { if (document.hidden) finish(true); }

  skip.addEventListener("click", function () { finish(true); });
  document.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("resize", resize);

  /* ---- Učitavanje slojeva; ako kasne, intro se preskače ---- */
  var imgs = [intro.querySelector(".intro-bg"), imgOrig, imgSharp, imgBlur, imgBlur2, imgCal];
  imgs.forEach(function (img) { if (img.dataset.src) img.src = img.dataset.src; });
  var timer = setTimeout(function () { finish(true); }, LOAD_TIMEOUT);

  function ready(img) {
    return img.decode ? img.decode() : new Promise(function (res, rej) {
      if (img.complete && img.naturalWidth) res(); else { img.onload = res; img.onerror = rej; }
    });
  }
  /* kreće čim su spremni pozadina, original i oštra felna; zamućeni slojevi stižu usput */
  var later = [imgBlur, imgBlur2, imgCal].map(function (img) { return ready(img).catch(function () {}); });
  Promise.all([imgs[0], imgOrig, imgSharp].map(ready)).then(function () {
    if (leaving) return;
    clearTimeout(timer);
    resize();
    requestAnimationFrame(function (now) { start = now; frame(now); });
  }, function () { clearTimeout(timer); finish(true); });
  void later;
})();
