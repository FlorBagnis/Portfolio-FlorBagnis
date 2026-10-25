/* Exportar portfolio a PDF (descarga directa) — archivo autónomo.
   No modifica tu código existente. Lee <html lang> y data-theme.
   - Oculta el formulario de consultas (y su desplegable) en el PDF y al imprimir.
   - Deja solo los botones Email / LinkedIn / GitHub y "Desarrollado por…". */
(function () {
  const socials = document.querySelector('.header-socials');
  if (!socials) return;

  const T = {
    es: { label: 'PDF', title: 'Descargar portfolio en PDF', busy: 'Generando…', file: 'Florencia-Bagnis-Portfolio.pdf', doc: 'Florencia Bagnis — Portfolio', wait: 'Generando tu PDF… ✿', err: 'No se pudo generar el PDF. Revisá tu conexión e intentá de nuevo.' },
    en: { label: 'PDF', title: 'Download portfolio as PDF', busy: 'Generating…', file: 'Florencia-Bagnis-Portfolio-EN.pdf', doc: 'Florencia Bagnis — Portfolio', wait: 'Generating your PDF… ✿', err: 'The PDF could not be generated. Check your connection and try again.' }
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
    .sticky-nav-wrapper, #panel-toggle, #float-panel, #back-to-top, .kawaii-bg-decor,
    .kawaii-modal, .gif-toggle-btn, .project-filters, #export-pdf, #copy-email-btn,
    button[onclick^="openModal"], [data-pdf-hide], #contacto details, #contactForm { display: none !important; }
    #contacto .contact-grid { display: flex !important; flex-wrap: wrap; justify-content: center; align-items: center; gap: 14px; }
    #contacto .contact-item { display: inline-flex !important; align-items: center; justify-content: center; gap: 8px; height: auto !important; min-height: 0 !important; padding: 12px 22px !important; line-height: 1.2; }
    /* El footer ("Desarrollado por…") vuelve al flujo normal para que no se superponga */
    footer { position: static !important; transform: none !important; margin-top: 28px !important; clear: both; }
  `;

  /* ---------- Exportar ---------- */
  async function exportPdf() {
    if (busy) return;
    busy = true; btn.disabled = true; updateTexts();

    // Abrir la ventana YA (dentro del click) para que el navegador no la bloquee;
    // cuando el PDF esté listo se carga ahí.
    let win = null;
    try {
      win = window.open('', '_blank');
      if (win) {
        win.document.write('<!doctype html><title>' + T[lang()].doc + '</title>' +
          '<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;' +
          'background:#ffd6e3;color:#4a1d3d;font-family:system-ui,sans-serif;font-size:20px;font-weight:700">' +
          T[lang()].wait + '</body>');
        win.document.close();
      }
    } catch (_) { win = null; }

    // Sube la página arriba de todo antes de capturar
    window.scrollTo({ top: 0, behavior: 'instant' });

    try {
      await ensureLibs();

      // cargar imágenes lazy antes de capturar
      const imgs = Array.from(document.querySelectorAll('img'));
      imgs.forEach(i => { i.loading = 'eager'; });
      await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));

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
          doc.querySelectorAll('.card.hide-card').forEach(c => c.classList.remove('hide-card'));

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
