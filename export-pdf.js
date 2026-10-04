/* Exportar portfolio a PDF (descarga directa) — archivo autónomo.
   No modifica tu código existente. Lee <html lang> y data-theme. */
(function () {
  const socials = document.querySelector('.header-socials');
  if (!socials) return;

  const T = {
    es: { label: 'PDF', title: 'Descargar portfolio en PDF', busy: 'Generando…', file: 'Florencia-Bagnis-Portfolio.pdf', err: 'No se pudo generar el PDF. Revisá tu conexión e intentá de nuevo.' },
    en: { label: 'PDF', title: 'Download portfolio as PDF' , busy: 'Generating…', file: 'Florencia-Bagnis-Portfolio-EN.pdf', err: 'The PDF could not be generated. Check your connection and try again.' }
  };
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'es');

  const btn = document.createElement('button');
  btn.id = 'export-pdf';
  btn.type = 'button';
  btn.className = 'export-pdf-btn';
  btn.innerHTML = '<i class="fas fa-file-lines"></i><span class="export-pdf-label" id="export-pdf-label"></span>';
  socials.appendChild(btn);

  let busy = false;
  let status = '';
  function updateTexts() {
    const t = T[lang()];
    document.getElementById('export-pdf-label').textContent = busy ? t.busy : (status || t.label);
    btn.title = t.title;
    btn.setAttribute('aria-label', t.title);
  }
  updateTexts();
  new MutationObserver(updateTexts).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

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
    button[onclick^="openModal"] { display: none !important; }
  `;

  async function exportPdf() {
    if (busy) return;
    busy = true; btn.disabled = true; updateTexts();
    try {
      await ensureLibs();

      // Foto de perfil: se prepara como imagen cuadrada exacta para que no se recorte en el PDF
      let fotoURL = null;
      try {
        if (document.querySelector('.foto-perfil')) {
          const im = new Image();
          await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = 'foto-florencia-600.webp'; });
          const c = document.createElement('canvas');
          c.width = c.height = 360;
          c.getContext('2d').drawImage(im, 0, 0, 360, 360);
          fotoURL = c.toDataURL('image/png');
        }
      } catch (e) { console.warn('No se pudo preparar la foto para el PDF', e); }

      // cargar imágenes lazy antes de capturar
      const imgs = Array.from(document.querySelectorAll('img'));
      imgs.forEach(i => { i.loading = 'eager'; });
      await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));

      const bg = getComputedStyle(document.body).backgroundColor;
      const container = document.querySelector('.container');
      const links = [];
      let cssW = 0, cssH = 0;

      // escala segura (iOS/Safari limita el tamaño del canvas)
      const approxH = container.scrollHeight + 100;
      const scale = Math.max(1, Math.min(2, Math.sqrt(16e6 / (1000 * approxH))));

      const canvas = await window.html2canvas(container, {
        scale, backgroundColor: bg, useCORS: true, logging: false, windowWidth: 1000,
        onclone: (doc, el) => {
          const st = doc.createElement('style'); st.textContent = HIDE_CSS; doc.head.appendChild(st);
          doc.querySelectorAll('.card.hide-card').forEach(c => c.classList.remove('hide-card'));

          // Foto de perfil: reemplazamos el fondo por la imagen ya preparada
          if (fotoURL) {
            const f = doc.querySelector('.foto-perfil');
            if (f) {
              f.style.background = 'none';
              const fi = doc.createElement('img');
              fi.src = fotoURL;
              fi.style.cssText = 'display:block;width:100%;height:100%;border-radius:50%;';
              f.appendChild(fi);
            }
          }

          el.style.cssText += ';width:1000px;max-width:none;margin:0;padding:48px 40px;background:' + bg + ';';
          const base = el.getBoundingClientRect();
          cssW = base.width; cssH = base.height;
          el.querySelectorAll('a[href]').forEach(a => {
            const href = a.href;
            if (!/^https?:/.test(href) || href === doc.location.href + '#') return;
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
      pdf.save(T[lang()].file);
      status = lang() === 'en' ? 'Done! ✿' : '¡Listo! ✿';
      setTimeout(() => { status = ''; updateTexts(); }, 2500);
    } catch (e) {
      console.error(e);
      alert(T[lang()].err);
    } finally {
      busy = false; btn.disabled = false; updateTexts();
    }
  }
  btn.addEventListener('click', exportPdf);
})();
