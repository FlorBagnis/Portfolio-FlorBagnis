/* Exportar portfolio a PDF (descarga directa) — archivo autónomo.
   No modifica tu código existente. Lee <html lang> y data-theme.
   - Oculta el formulario de consultas (y su desplegable) en el PDF y al imprimir.
   - Deja solo los botones Email / LinkedIn / GitHub y "Desarrollado por…". */
(function () {
  const socials = document.querySelector('.header-socials');
  if (!socials) return;

  const T = {
    es: { label: 'PDF', title: 'Descargar portfolio en PDF', busy: 'Generando…', file: 'Florencia-Bagnis-Portfolio.pdf', doc: 'Florencia Bagnis — Portfolio', wait: 'Generando tu PDF… ✿', s1: 'Preparando…', s2: 'Cargando imágenes…', s3: 'Capturando tu portfolio…', s4: 'Armando el PDF…', s5: '¡Listo! ✿', err: 'No se pudo generar el PDF. Revisá tu conexión e intentá de nuevo.' },
    en: { label: 'PDF', title: 'Download portfolio as PDF', busy: 'Generating…', file: 'Florencia-Bagnis-Portfolio-EN.pdf', doc: 'Florencia Bagnis — Portfolio', wait: 'Generating your PDF… ✿', s1: 'Getting ready…', s2: 'Loading images…', s3: 'Capturing your portfolio…', s4: 'Building the PDF…', s5: 'Done! ✿', err: 'The PDF could not be generated. Check your connection and try again.' }
  };
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'es');

  const btn = document.createElement('button');
  btn.id = 'export-pdf';
  btn.type = 'button';
  btn.className = 'export-pdf-btn';
  btn.innerHTML = '<i class="fas fa-file-lines"></i><span class="export-pdf-label" id="export-pdf-label"></span>';
  socials.appendChild(btn);

  let busy = false;
  let lastUrl = null;
  let status = '';
  function updateTexts() {
    const t = T[lang()];
    document.getElementById('export-pdf-label').textContent = busy ? t.busy : (status || t.label);
    btn.title = t.title;
    btn.setAttribute('aria-label', t.title);
  }
  updateTexts();
  new MutationObserver(updateTexts).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  /* ---------- Ocultar formulario de consultas ---------- */
  // Selectores exactos del index.html (acordeón completo: título, intro, form, mensajes y mail)
  const FORM_SELECTOR = '#contacto .contact-accordion, #contacto details, #contactForm, #formSuccess, #formError, #copy-email-btn';

  function markFormBlocks(root) {
    root.querySelectorAll(FORM_SELECTOR).forEach(el => el.setAttribute('data-pdf-hide', ''));
  }
  function unmarkFormBlocks() {
    document.querySelectorAll('[data-pdf-hide]').forEach(el => el.removeAttribute('data-pdf-hide'));
  }

  // Ctrl+P / imprimir desde el navegador
  window.addEventListener('beforeprint', () => markFormBlocks(document));
  window.addEventListener('afterprint', unmarkFormBlocks);

  /* ---------- Carga de librerías ---------- */
  const LIBS = [
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  ];
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('No cargó ' + src));
      document.head.appendChild(s);
    });
  }
  async function ensureLibs() {
    if (!window.html2canvas) await loadScript(LIBS[0]);
    if (!window.jspdf) await loadScript(LIBS[1]);
  }

  const HIDE_CSS = `
    *, *::before, *::after { animation: none !important; transition: none !important; }
    header, section { opacity: 1 !important; transform: none !important; }
    .card:hover, .summary-pill:hover { transform: none !important; }
    #proyectos .project-group, #proyectos .project-group.hide-card, #proyectos .card.hide-card { display: block !important; }
    .sticky-nav-wrapper, #panel-toggle, #float-panel, #back-to-top, .kawaii-bg-decor,
    .kawaii-modal, .gif-toggle-btn, .project-filters, #export-pdf, #copy-email-btn,
    button[onclick^="openModal"], [data-pdf-hide], #contacto details, #contactForm { display: none !important; }
    #contacto .contact-grid { display: flex !important; flex-wrap: wrap; justify-content: center; align-items: center; gap: 14px; }
    #contacto .contact-item { display: inline-flex !important; align-items: center; justify-content: center; gap: 8px; height: auto !important; min-height: 0 !important; padding: 12px 22px !important; line-height: 1.2; }
    /* El footer ("Desarrollado por…") vuelve al flujo normal para que no se superponga */
    footer { position: static !important; transform: none !important; margin-top: 28px !important; clear: both; }
  `;

  /* ---------- Exportar ---------- */
  // Barra de progreso en la ventana nueva (la animación usa transform → sigue fluida aunque la captura sea pesada)
  function progress(win, pct, text, secs) {
    try {
      if (!win || win.closed) return;
      const f = win.document.getElementById('fill');
      const st = win.document.getElementById('st');
      if (f) {
        f.style.transitionDuration = (secs || 1.2) + 's';
        f.style.transform = 'scaleX(' + pct + ')';
      }
      if (st && text) st.textContent = text;
    } catch (_) {}
  }

  async function exportPdf() {
    if (busy) return;
    busy = true; btn.disabled = true; updateTexts();

    // Abrir la ventana YA (dentro del click) para que el navegador no la bloquee;
    // cuando el PDF esté listo se carga ahí.
    let win = null;
    try {
      win = window.open('', '_blank');
      if (win) {
        win.document.write(
          '<!doctype html><html lang="' + lang() + '"><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<title>' + T[lang()].doc + '</title>' +
          '<style>' +
          '*{box-sizing:border-box}' +
          'body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;' +
          'background:#ffd6e3;color:#4a1d3d;font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:24px;text-align:center}' +
          '.flor{font-size:54px;line-height:1;animation:g 3s linear infinite}' +
          '@keyframes g{to{transform:rotate(360deg)}}' +
          'h1{margin:0;font-size:22px;font-weight:800}' +
          '.track{width:min(420px,86vw);height:18px;border-radius:999px;background:#fff;border:2px solid #ec4899;overflow:hidden;' +
          'box-shadow:0 6px 18px rgba(236,72,153,.25)}' +
          '.fill{height:100%;width:100%;border-radius:999px;transform-origin:left center;transform:scaleX(.04);' +
          'background:linear-gradient(90deg,#f9a8d4,#ec4899,#f9a8d4);background-size:200% 100%;' +
          'transition:transform 1.2s cubic-bezier(.22,.8,.3,1);animation:s 1.4s linear infinite}' +
          '@keyframes s{to{background-position:-200% 0}}' +
          '#st{font-size:15px;font-weight:600;opacity:.8}' +
          '</style>' +
          '<body><div class="flor">✿</div><h1>' + T[lang()].wait + '</h1>' +
          '<div class="track"><div class="fill" id="fill"></div></div>' +
          '<div id="st">' + T[lang()].s1 + '</div></body></html>');
        win.document.close();
      }
    } catch (_) { win = null; }

    // Sube la página arriba de todo antes de capturar
    window.scrollTo({ top: 0, behavior: 'instant' });

    try {
      progress(win, 0.12, T[lang()].s1, 1);
      await ensureLibs();
      progress(win, 0.3, T[lang()].s2, 1.2);

      // cargar imágenes lazy antes de capturar
      const imgs = Array.from(document.querySelectorAll('img'));
      imgs.forEach(i => { i.loading = 'eager'; });
      await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));

      progress(win, 0.85, T[lang()].s3, 14);
      await new Promise(r => setTimeout(r, 60)); // deja pintar la barra antes de la captura pesada
      const bg = getComputedStyle(document.body).backgroundColor;
      const container = document.querySelector('.container');
      const links = [];

      // escala segura (iOS/Safari limita el tamaño del canvas)
      const approxH = container.scrollHeight + 100;
      const scale = Math.max(1, Math.min(2, Math.sqrt(16e6 / (1000 * approxH))));

      const canvas = await window.html2canvas(container, {
        scale, backgroundColor: bg, useCORS: true, logging: false, windowWidth: 1000,
        onclone: (doc, el) => {
          const st = doc.createElement('style'); st.textContent = HIDE_CSS; doc.head.appendChild(st);
          // mostrar TODOS los proyectos (el filtro de la página deja solo "Destacados" y oculta los demás grupos)
          doc.querySelectorAll('.project-group.hide-card, .card.hide-card').forEach(c => c.classList.remove('hide-card'));

          // quitar formulario de consultas + desplegable del clon
          markFormBlocks(doc);
          doc.querySelectorAll('[data-pdf-hide]').forEach(n => n.remove());

          el.style.cssText += ';width:1000px;max-width:none;margin:0;padding:48px 40px;background:' + bg + ';';
          const base = el.getBoundingClientRect();
          el.querySelectorAll('a[href]').forEach(a => {
            const href = a.href;
            if (!/^(https?:|mailto:)/.test(href) || href === doc.location.href + '#') return;
            const r = a.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) links.push({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height, url: href });
          });
        }
      });

      progress(win, 0.96, T[lang()].s4, 2);
      const w = canvas.width / scale, h = canvas.height / scale;
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: h > w ? 'p' : 'l', unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h);
      links.forEach(l => pdf.link(l.x, l.y, l.w, l.h, { url: l.url }));
      pdf.setProperties({ title: T[lang()].doc, author: 'Florencia Bagnis' });

      if (win && !win.closed) {
        // Abrir el PDF ya generado en la otra ventana (ahí se puede ver y descargar)
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(pdf.output('blob'));
        progress(win, 1, T[lang()].s5, 0.4);
        await new Promise(r => setTimeout(r, 600));
        win.location.href = lastUrl;
      } else {
        // Si el navegador bloqueó la ventana: descarga directa como antes
        pdf.save(T[lang()].file);
      }
      status = lang() === 'en' ? 'Done! ✿' : '¡Listo! ✿';
      setTimeout(() => { status = ''; updateTexts(); }, 2500);
    } catch (e) {
      console.error(e);
      if (win && !win.closed) win.close();
      alert(T[lang()].err);
    } finally {
      busy = false; btn.disabled = false; updateTexts();
    }
  }
  btn.addEventListener('click', exportPdf);
})();
