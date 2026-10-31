/* =====================================================================
   TECH KAWAII ROSA · detalles decorativos (no cargan nada de verdad)
   - Barra de progreso de scroll + lectura ▰▰▰▱▱ en la nav
   - Solapa activa según la sección que estás viendo
   - Línea de estado bajo cada título ("⠋ build #proyectos ▰▰▱▱…" → "✓ ok")
   - Contador (n) en cada filtro de proyectos
   Todo el contenido real ya está en el HTML: si este archivo falla,
   la página se ve completa igual. Respeta tu botón de "reducir movimiento".
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  function reduced() {
    return root.classList.contains('reduce-motion');
  }

  function bar(n) {
    n = Math.max(0, Math.min(10, n));
    return '▰'.repeat(n) + '▱'.repeat(10 - n);
  }

  /* ---------- línea de estado decorativa ---------- */
  function runStatus(el, label, done, ms) {
    var msg = el.querySelector('.tk-msg');
    if (!msg) return;
    if (el._timer) clearInterval(el._timer);

    if (reduced()) {
      el.classList.add('is-done');
      msg.textContent = done;
      return;
    }

    el.classList.remove('is-done');
    var i = 0;
    var t0 = Date.now();
    el._timer = setInterval(function () {
      var p = Math.min(1, (Date.now() - t0) / ms);
      msg.textContent = FRAMES[i++ % FRAMES.length] + ' ' + label + '  ' + bar(Math.round(p * 10));
      if (p >= 1) {
        clearInterval(el._timer);
        el.classList.add('is-done');
        msg.textContent = done;
      }
    }, 70);
  }

  function makeStatuses() {
    var heads = document.querySelectorAll('section[id] > h2');
    var map = {};
    heads.forEach(function (h2) {
      var sec = h2.parentElement;
      var st = document.createElement('div');
      st.className = 'tk-status';
      st.setAttribute('aria-hidden', 'true');
      st.innerHTML = '<i class="tk-dot"></i><span class="tk-msg"></span>';
      h2.insertAdjacentElement('afterend', st);
      map[sec.id] = st;
      /* estado inicial: ya "listo" (por si nunca llega a animarse) */
      st.querySelector('.tk-msg').textContent = '✓ build #' + sec.id + ' ok';
      st.classList.add('is-done');
    });

    if (!('IntersectionObserver' in window)) return map;

    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || seen[e.target.id]) return;
        seen[e.target.id] = true;
        runStatus(map[e.target.id], 'build #' + e.target.id, '✓ build #' + e.target.id + ' ok · 0.3s', 800);
        io.unobserve(e.target);
      });
    }, { threshold: 0.2 });

    Object.keys(map).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) io.observe(s);
    });
    return map;
  }

  /* ---------- contadores en los filtros ---------- */
  function countFor(filter) {
    if (filter === 'all') return document.querySelectorAll('.project-group .card').length;
    return document.querySelectorAll('.project-group[data-group="' + filter + '"] .card').length;
  }

  function setupFilters(statusMap) {
    var btns = document.querySelectorAll('.project-filters .filter-btn');
    var total = countFor('all');
    btns.forEach(function (b) {
      var f = b.getAttribute('data-filter');
      b.setAttribute('data-count', countFor(f));
      b.addEventListener('click', function () {
        var st = statusMap.proyectos;
        if (!st) return;
        var shown = countFor(f);
        runStatus(
          st,
          'filter("' + f + '")',
          '✓ filter("' + f + '") → ' + shown + '/' + total,
          450
        );
      });
    });
  }

  /* ---------- nav: progreso + solapa activa ---------- */
  function setupNav() {
    var nav = document.querySelector('.sticky-nav');
    var links = nav ? [].slice.call(nav.querySelectorAll('a[href^="#"]')) : [];

    var prog = document.createElement('div');
    prog.className = 'tk-progress';
    prog.setAttribute('aria-hidden', 'true');
    prog.innerHTML = '<i></i>';
    document.body.appendChild(prog);
    var fill = prog.firstChild;

    var readout = null;
    if (nav) {
      readout = document.createElement('span');
      readout.className = 'tk-readout';
      readout.setAttribute('aria-hidden', 'true');
      nav.appendChild(readout);
    }

    var ticking = false;
    function update() {
      ticking = false;
      var max = root.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.max(0, Math.min(100, (window.scrollY / max) * 100)) : 0;
      fill.style.width = pct + '%';
      if (readout) readout.textContent = bar(Math.round(pct / 10)) + ' ' + Math.round(pct) + '%';

      /* solapa activa: la última sección cuyo borde superior ya pasó el 35% de la pantalla */
      var line = window.innerHeight * 0.35;
      var active = null;
      links.forEach(function (a) {
        var s = document.getElementById(a.getAttribute('href').slice(1));
        if (s && s.getBoundingClientRect().top <= line) active = a;
      });
      if (max > 0 && window.scrollY >= max - 4 && links.length) active = links[links.length - 1];
      links.forEach(function (a) { a.classList.toggle('is-active', a === active); });
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  function init() {
    try {
      var statusMap = makeStatuses();
      setupFilters(statusMap);
      setupNav();
      root.classList.add('tk-ready');
    } catch (e) {
      /* si algo falla, la página queda con el estilo base, sin romperse */
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
