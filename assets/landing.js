/* ===================== HUMIND landing interactions ===================== */
(function () {
  'use strict';

  /* ---- nav shadow on scroll ---- */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- count-up ---- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    var isInt = target % 1 === 0;
    var dur = 1100, start = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var v = target * e;
      var out = isInt ? Math.round(v).toLocaleString('en-US') : v.toFixed(1);
      el.textContent = prefix + out + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---- draw line charts ---- */
  function anim() { return document.documentElement.classList.contains('anim'); }
  function drawChart(scope) {
    var animate = anim();
    scope.querySelectorAll('.area-line').forEach(function (path) {
      if (path.dataset.drawn) return;
      path.dataset.drawn = '1';
      if (!animate) return; // visible by default
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.3,.7,.3,1)';
      path.style.strokeDashoffset = '0';
    });
    scope.querySelectorAll('.area-fill').forEach(function (f) {
      if (f.dataset.drawn) return;
      f.dataset.drawn = '1';
      if (!animate) { f.style.opacity = '1'; return; }
      f.style.transition = 'opacity 1.4s ease .4s';
      f.style.opacity = '1';
    });
    scope.querySelectorAll('.spk').forEach(function (p) {
      if (p.dataset.drawn) return;
      p.dataset.drawn = '1';
      if (!animate) return;
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.getBoundingClientRect();
      p.style.transition = 'stroke-dashoffset 1.2s ease .2s';
      p.style.strokeDashoffset = '0';
    });
  }

  /* ---- gauge arc + donut ---- */
  function drawGauge(scope) {
    var animate = anim();
    scope.querySelectorAll('[data-gauge]').forEach(function (g) {
      if (g.dataset.drawn) return;
      g.dataset.drawn = '1';
      var pct = parseFloat(g.getAttribute('data-gauge')) / 100;
      var arc = g.querySelector('.gauge-arc');
      if (!arc) return;
      var r = 54, c = 2 * Math.PI * r;
      arc.style.strokeDasharray = c;
      arc.style.strokeDashoffset = animate ? c : c * (1 - pct);
      if (!animate) return;
      arc.getBoundingClientRect();
      arc.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(.3,.7,.3,1) .2s';
      arc.style.strokeDashoffset = c * (1 - pct);
    });
  }

  /* ---- build department heatmap ---- */
  function buildHeat() {
    var host = document.getElementById('heat');
    if (!host || host.dataset.built) return;
    host.dataset.built = '1';
    var depts = ['Sales', 'Eng', 'Ops', 'Product', 'CS', 'G&A'];
    var rows = ['EMEA', 'AMER', 'APAC'];
    // header row
    var html = '<div class="hhead"></div>';
    depts.forEach(function (d) { html += '<div class="hhead">' + d + '</div>'; });
    var vals = [
      [0.82, 0.6, 0.35, 0.28, 0.4, 0.2],
      [0.55, 0.7, 0.42, 0.3, 0.33, 0.18],
      [0.38, 0.48, 0.6, 0.5, 0.26, 0.22]
    ];
    rows.forEach(function (rname, ri) {
      html += '<div class="hl">' + rname + '</div>';
      vals[ri].forEach(function (v) {
        var col;
        if (v >= 0.65) col = 'rgba(255,122,138,' + (0.35 + v * 0.55) + ')';
        else if (v >= 0.45) col = 'rgba(246,196,90,' + (0.25 + v * 0.5) + ')';
        else col = 'rgba(124,58,237,' + (0.12 + v * 0.45) + ')';
        html += '<div class="hc" style="background:' + col + '">' + Math.round(v * 100) + '</div>';
      });
    });
    host.innerHTML = html;
  }

  /* ---- reveal (position-based: robust in background iframes where IO won't fire) ---- */
  function revealEl(el) {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    drawChart(el);
    drawGauge(el);
    el.querySelectorAll('[data-count]').forEach(animateCount);
  }
  var reveals = [];
  function checkReveals() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var remaining = [];
    reveals.forEach(function (el) {
      var top = el.getBoundingClientRect().top;
      if (top < vh * 0.88) revealEl(el);
      else remaining.push(el);
    });
    reveals = remaining;
  }
  function init() {
    buildHeat();
    // Engage entrance animation only in a foreground tab; otherwise content
    // shows immediately (background iframes throttle CSS transitions).
    var canAnimate = document.visibilityState !== 'hidden';
    if (canAnimate) document.documentElement.classList.add('anim');
    reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    // hero draws immediately
    var hero = document.getElementById('hero');
    if (hero) { drawChart(hero); drawGauge(hero); hero.querySelectorAll('[data-count]').forEach(animateCount); }
    checkReveals();
    window.addEventListener('scroll', checkReveals, { passive: true });
    window.addEventListener('resize', checkReveals, { passive: true });
    // safety: ensure nothing stays hidden if scroll never happens
    setTimeout(checkReveals, 300);
    setTimeout(function () { reveals.forEach(revealEl); reveals = []; }, 2500);
    // watchdog: if transitions are throttled and content is stuck hidden, drop anim
    if (canAnimate) {
      setTimeout(function () {
        var h1 = document.querySelector('.hero h1');
        if (h1 && parseFloat(getComputedStyle(h1).opacity) < 0.05) {
          document.documentElement.classList.remove('anim');
        }
      }, 1400);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* ---- hero copilot demo ---- */
  var form = document.getElementById('heroCopilot');
  if (form) {
    var answers = {
      en: {
        emea: "EMEA Sales attrition is driven by the 1–2y tenure cohort (+31% risk). Top drivers: compensation (42%) and workload (18%). Recommended: targeted retention for 38 high-risk reps — projected −9% attrition, protecting ~€1.4M in cost-to-replace this quarter.",
        burnout: "Engineering shows a burnout precursor: after-hours activity +42% over 3 weeks, concentrated in Platform. Recommend rebalancing on-call load and a manager check-in cadence — modeled to cut burnout index by 6 pts.",
        default: "Across 12,480 employees, risk is concentrated, not systemic: 2 units drive 64% of projected exits. Workforce Health is 78/100 (▲5). Recommended focus: EMEA Sales retention + Engineering workload — projected to protect ~€1.4M over two quarters."
      },
      fr: {
        emea: "L'attrition des Ventes EMEA est portée par la cohorte 1–2 ans (+31 % de risque). Facteurs principaux : rémunération (42 %) et charge de travail (18 %). Recommandé : rétention ciblée pour 38 commerciaux à risque — projetée à −9 % d'attrition, protégeant ~1,4 M€ de coûts de remplacement ce trimestre.",
        burnout: "L'ingénierie présente un signe précurseur d'épuisement : activité hors heures +42 % sur 3 semaines, concentrée sur Platform. Recommandé : rééquilibrer la charge d'astreinte et instaurer un rythme de points managers — modélisé pour réduire l'indice d'épuisement de 6 pts.",
        default: "Sur 12 480 employés, le risque est concentré, pas systémique : 2 unités concentrent 64 % des départs projetés. La santé des effectifs est de 78/100 (▲5). Priorités recommandées : rétention Ventes EMEA + charge Ingénierie — projetées pour protéger ~1,4 M€ sur deux trimestres."
      }
    };
    function answerLang() { return (window.StanceI18N && window.StanceI18N.getLang() === 'fr') ? 'fr' : 'en'; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (document.getElementById('heroInput').value || '').toLowerCase();
      var key = 'default';
      if (q.indexOf('emea') > -1 || q.indexOf('sales') > -1 || q.indexOf('vente') > -1 || q.indexOf('attrition') > -1) key = 'emea';
      if (q.indexOf('burnout') > -1 || q.indexOf('engineer') > -1 || q.indexOf('épuis') > -1 || q.indexOf('ingéni') > -1 || q.indexOf('overtime') > -1) key = 'burnout';
      var box = document.getElementById('heroAnswer');
      var txt = document.getElementById('heroAnswerText');
      box.style.display = 'flex';
      txt.textContent = '';
      var full = answers[answerLang()][key], i = 0;
      (function type() {
        txt.textContent = full.slice(0, i);
        i += 3;
        if (i < full.length + 3) setTimeout(type, 12);
        else txt.textContent = full;
      })();
    });
  }

  /* ===================== TWEAKS ENGINE ===================== */

  /* accent — 'purple' clears overrides so the Brand Kit purple shows */
  function applyAccent(accent, b) {
    var s = b.style;
    var map = {
      purple: null,
      sky: ['#38BDF8', '#7DD3FC'],
      lilac: ['#A78BFA', '#C4B5FD'],
      emerald: ['#2BD9A0', '#6EE7C4'],
      amber: ['#F6B43A', '#FFD37A']
    };
    var a = map[accent];
    ['--accent', '--accent-2', '--cyan', '--cyan-2', '--cyan-3'].forEach(function (v) { s.removeProperty(v); });
    if (a) {
      s.setProperty('--accent', a[0]); s.setProperty('--accent-2', a[1]);
      s.setProperty('--cyan', a[0]); s.setProperty('--cyan-2', a[0]); s.setProperty('--cyan-3', a[1]);
    }
  }

  /* shadow intensity — theme-aware so light stays neutral, dark stays glassy */
  function applyShadow(level, theme, s) {
    var sets = theme === 'light' ? {
      flat: ['0 1px 2px rgba(16,24,40,.04)', '0 1px 2px rgba(16,24,40,.05)', '0 6px 18px -12px rgba(16,24,40,.16)'],
      soft: ['0 1px 2px rgba(16,24,40,.05),0 6px 18px -8px rgba(16,24,40,.12)', '0 1px 2px rgba(16,24,40,.05),0 14px 34px -16px rgba(124,58,237,.22)', '0 14px 40px -20px rgba(16,24,40,.22)'],
      elevated: ['0 2px 4px rgba(16,24,40,.08),0 22px 50px -16px rgba(16,24,40,.3)', '0 2px 6px rgba(16,24,40,.08),0 28px 64px -18px rgba(124,58,237,.42)', '0 32px 74px -24px rgba(16,24,40,.4)']
    } : {
      flat: ['0 1px 0 rgba(255,255,255,.03) inset', '0 0 0 1px rgba(255,255,255,.1)', '0 10px 30px -22px rgba(0,0,0,.8)'],
      soft: ['0 1px 0 rgba(255,255,255,.04) inset, 0 24px 60px -28px rgba(0,0,0,.85)', '0 0 0 1px rgba(124,58,237,.18), 0 18px 60px -20px rgba(124,58,237,.35)', '0 20px 50px -30px rgba(0,0,0,.9)'],
      elevated: ['0 1px 0 rgba(255,255,255,.06) inset, 0 44px 96px -30px rgba(0,0,0,.95)', '0 0 0 1px rgba(124,58,237,.3), 0 34px 96px -18px rgba(124,58,237,.5)', '0 44px 96px -28px rgba(0,0,0,.95)']
    };
    var set = sets[level] || sets.soft;
    s.setProperty('--sh-card', set[0]);
    s.setProperty('--sh-glow', set[1]);
    s.setProperty('--sh-soft', set[2]);
  }

  /* ---- master apply (called from tweaks-app) ---- */
  window.__applyStanceTweaks = function (t) {
    t = t || {};
    var b = document.body, s = b.style;

    /* THEME — toggle the light override stylesheet via media (keeps it loaded;
       flipping .disabled unloads the sheet and won't reliably re-apply) */
    var theme = t.theme || 'light';
    b.setAttribute('data-theme', theme);
    var lightLink = document.getElementById('themeLight');
    if (lightLink) lightLink.media = (theme === 'light') ? 'all' : 'not all';

    /* LAYOUT ATTRS */
    b.setAttribute('data-hero', t.hero || 'split');
    b.setAttribute('data-herosize', t.herosize || 'default');
    b.setAttribute('data-balance', t.balance || 'default');
    b.setAttribute('data-density', t.density || 'calm');
    b.setAttribute('data-dash', t.dash || 'comfortable');
    b.setAttribute('data-kpi', t.kpi || 'solid');

    /* SCALAR VARS */
    if (t.maxw) s.setProperty('--maxw', t.maxw + 'px');
    if (t.sectionY) s.setProperty('--tw-sec-y', t.sectionY + 'px');
    if (t.titleSize) s.setProperty('--tw-h1', t.titleSize + 'px');
    if (t.stageSize) s.setProperty('--tw-stage-zoom', (t.stageSize / 100).toFixed(3));

    /* BUTTON RADIUS */
    var btnR = { pill: '999px', soft: '14px', square: '7px' };
    s.setProperty('--btn-radius', btnR[t.btn] || '999px');

    /* CARD RADIUS SCALE */
    var radii = {
      sharp: ['6px', '8px', '10px', '12px', '16px'],
      default: ['8px', '14px', '20px', '28px', '36px'],
      rounded: ['12px', '20px', '28px', '38px', '46px']
    };
    var rr = radii[t.radius] || radii.default;
    ['--r-sm', '--r-md', '--r-lg', '--r-xl', '--r-2xl'].forEach(function (v, i) { s.setProperty(v, rr[i]); });

    /* SHADOW INTENSITY (theme-aware) */
    applyShadow(t.shadow || 'soft', theme, s);

    /* ACCENT */
    applyAccent(t.accent || 'purple', b);
  };
})();
