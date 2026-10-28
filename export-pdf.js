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
    .kawaii-modal, .gif-toggle-btn, .gif-zoom-btn, .project-filters, #export-pdf, #copy-email-btn,
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

  const BLOCK_SEL = '.card, .github-calendar-card, .contact-grid, footer, p, li, h1, h2, h3, h4, img, .summary-pill, .tech-title, .group-sub';

  /* Capturas de los GIFs para el PDF: el primer cuadro de cada uno (antes de darle play),
     ya recortado al tamaño de la caja, igual que se hace con la foto de perfil.
     En el celular el "poster" a veces no llegó a cargarse (la descarga en segundo plano falla o no termina):
     en ese caso se descarga el GIF completo, se decodifica el primer cuadro y se usa ese. */
  // Celular / pantalla chica: ahí se usa el método nuevo para los GIFs. En PC todo queda como en el código original.
  const isMobileDevice = () => window.innerWidth < 800 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const fullGifCache = {};
  function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
  }
  // Devuelve algo dibujable en un canvas ({ src, w, h, close }) a partir del GIF completo
  async function decodeFullGif(url) {
    if (!url) return null;
    if (!fullGifCache[url]) {
      fullGifCache[url] = (async () => {
        const r = await fetchWithTimeout(url, 25000);
        if (!r.ok) throw new Error('fetch');
        return await r.blob();
      })().catch(() => null);
    }
    const blob = await fullGifCache[url];
    if (!blob) return null;
    try {
      if (window.createImageBitmap) {
        const bmp = await createImageBitmap(blob);
        return { src: bmp, w: bmp.width, h: bmp.height, close: () => { try { bmp.close(); } catch (_) {} } };
      }
    } catch (_) {}
    try {
      const u = URL.createObjectURL(blob);
      const im2 = new Image();
      await new Promise(res => { im2.onload = im2.onerror = res; im2.src = u; });
      if (im2.decode) { try { await im2.decode(); } catch (_) {} }
      URL.revokeObjectURL(u);
      if (im2.naturalWidth) return { src: im2, w: im2.naturalWidth, h: im2.naturalHeight, close: () => {} };
    } catch (_) {}
    return null;
  }

  async function gifPosterShots() {
    const shots = [];
    try { if (window.prepareGifPostersForPrint) await window.prepareGifPostersForPrint(); } catch (_) {}
    const isMobile = isMobileDevice();
    const conts = Array.from(document.querySelectorAll('.media-container'));
    for (const c of conts) {
      let data = null;
      let fb = null;
      try {
        const im = c.querySelector('img.project-media');
        if (im) {
          // 1) el poster que ya tiene la página
          let ok = false;
          if (im.getAttribute('src')) {
            try { if (im.decode) await im.decode(); } catch (_) {}
            ok = im.naturalWidth > 0;
          }
          let drawable = null, nw = 0, nh = 0;
          if (ok) { drawable = im; nw = im.naturalWidth; nh = im.naturalHeight; }
          else {
            // 2) plan B: bajar el GIF completo y tomar su primer cuadro
            fb = await decodeFullGif(im.dataset.gif);
            if (fb) { drawable = fb.src; nw = fb.w; nh = fb.h; }
          }
          const r = c.getBoundingClientRect();
          const ratio = (r.width && r.height) ? r.width / r.height : 1873 / 862;
          const W = isMobile ? 1800 : 2000, H = Math.round(W / ratio);
          const cv2 = document.createElement('canvas');
          cv2.width = W; cv2.height = H;
          const ctx = cv2.getContext('2d');
          if (isMobile) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); }   // celular: GIFs con transparencia sobre blanco
          if (drawable && nw) {
            const k = Math.max(W / nw, H / nh);
            const dw = nw * k, dh = nh * k;
            ctx.drawImage(drawable, (W - dw) / 2, (H - dh) / 2, dw, dh);
          } else {
            // 3) último recurso: que no quede el recuadro vacío (se muestra el nombre del proyecto)
            const g = ctx.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, '#fbcfe8'); g.addColorStop(1, '#f9a8d4');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#9d174d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '700 ' + Math.round(H / 8) + 'px system-ui, sans-serif';
            ctx.fillText((im.alt || '') + ' ✿', W / 2, H / 2);
          }
          data = cv2.toDataURL('image/jpeg', 0.9);
          cv2.width = cv2.height = 0;   // libera memoria (importante en iOS)
        }
      } catch (_) { data = null; }
      if (fb) fb.close();
      shots.push(data);
    }
    return shots;
  }

  async function exportPdf() {
    if (busy) return;
    busy = true; btn.disabled = true; updateTexts();

    // Abrir la ventana YA (dentro del click) para que el navegador no la bloquee;
    // cuando el PDF esté listo se carga ahí.
    // Colores del tema actual (claro/oscuro): se leen de la propia página para que coincidan exactos
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const rs = getComputedStyle(document.documentElement), bsy = getComputedStyle(document.body);
    const cv = n => rs.getPropertyValue(n).trim();
    const solid = c => (c && !/^rgba\(.*,\s*0\)$|^transparent$/.test(c)) ? c : '';
    // Modo oscuro: colores fijos de tu portfolio (fondo casi negro, tarjetas ciruela oscuro y texto fucsia como el título).
    // Modo claro: se leen de la página.
    const C = dark ? {
      bg:     '#0f0a0d',
      ink:    '#f472b6',
      card:   '#2d1624',
      accent: cv('--rosa-brillante') || '#ec4899'
    } : {
      bg:     solid(bsy.backgroundColor) || solid(rs.backgroundColor) || '#ffd6e3',
      ink:    bsy.color || '#4a1d3d',
      card:   cv('--card-bg') || '#ffffff',
      accent: cv('--rosa-brillante') || '#ec4899'
    };

    let win = null;
    try {
      win = window.open('', '_blank');
      if (win) {
        win.document.write(
          '<!doctype html><html lang="' + lang() + '" style="color-scheme:' + (dark ? 'dark' : 'light') + '"><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<title>' + T[lang()].doc + '</title>' +
          '<style>' +
          '*{box-sizing:border-box}' +
          'body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;' +
          'background:' + C.bg + ';color:' + C.ink + ';font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:24px;text-align:center}' +
          '.flor{font-size:54px;line-height:1;color:' + C.accent + ';animation:g 3s linear infinite}' +
          '@keyframes g{to{transform:rotate(360deg)}}' +
          'h1{margin:0;font-size:22px;font-weight:800}' +
          '.track{width:min(420px,86vw);height:18px;border-radius:999px;background:' + C.card + ';border:2px solid ' + C.accent + ';overflow:hidden;' +
          'box-shadow:0 6px 18px rgba(236,72,153,' + (dark ? '.35' : '.25') + ')}' +
          '.fill{height:100%;width:100%;border-radius:999px;transform-origin:left center;transform:scaleX(.04);' +
          'background:linear-gradient(90deg,#f9a8d4,' + C.accent + ',#f9a8d4);background-size:200% 100%;' +
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

      const gifShots = await gifPosterShots();

      progress(win, 0.85, T[lang()].s3, 14);
      await new Promise(r => setTimeout(r, 60)); // deja pintar la barra antes de la captura pesada
      const bg = getComputedStyle(document.body).backgroundColor;
      const container = document.querySelector('.container');
      const links = [];
      const blocks = []; // bloques que no conviene cortar entre páginas
      const gifSlots = []; // recuadros de GIFs (solo celular)
      const mobileGifs = isMobileDevice();

      // escala segura (iOS/Safari limita el tamaño del canvas)
      const approxH = container.scrollHeight + 100;
      const scale = Math.max(1, Math.min(2, Math.sqrt(16e6 / (1000 * approxH))));

      // Foto de perfil: se recorta (cover + centrada) en un canvas cuadrado ANTES de capturar.
      // En el celular html2canvas calcula mal "background-size: cover" y la foto salía agrandada/desplazada.
      let fotoData = null;
      try {
        const fotoEl = document.querySelector('.foto-perfil');
        const m = fotoEl && /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(fotoEl).backgroundImage);
        if (m) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise(r => { img.onload = img.onerror = r; img.src = m[1]; });
          if (img.naturalWidth) {
            const S = 600, cv = document.createElement('canvas');
            cv.width = cv.height = S;
            const k = Math.max(S / img.naturalWidth, S / img.naturalHeight);
            const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
            cv.getContext('2d').drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);
            fotoData = cv.toDataURL('image/jpeg', 0.92);
          }
        }
      } catch (_) { fotoData = null; }

      const canvas = await window.html2canvas(container, {
        scale, backgroundColor: bg, useCORS: true, logging: false, windowWidth: 1000,
        onclone: (doc, el) => {
          const st = doc.createElement('style'); st.textContent = HIDE_CSS; doc.head.appendChild(st);
          // mostrar TODOS los proyectos (el filtro de la página deja solo "Destacados" y oculta los demás grupos)
          doc.querySelectorAll('.project-group.hide-card, .card.hide-card').forEach(c => c.classList.remove('hide-card'));

          // quitar formulario de consultas + desplegable del clon
          markFormBlocks(doc);
          doc.querySelectorAll('[data-pdf-hide]').forEach(n => n.remove());

          // GIFs
          doc.querySelectorAll('.media-container').forEach((c, i) => {
            const im = c.querySelector('img.project-media');
            const cvs = c.querySelector('canvas.project-media');
            if (cvs) cvs.remove();
            c.querySelectorAll('.gif-zoom-btn, .gif-toggle-btn').forEach(b => b.remove());
            if (mobileGifs) {
              // Celular: se deja el recuadro vacío y se anota dónde está; la imagen se pinta después sobre la captura
              // (en iPhone html2canvas no dibujaba estas imágenes)
              if (im) { im.removeAttribute('srcset'); im.removeAttribute('src'); im.style.visibility = 'hidden'; }
              gifSlots.push({ i, node: c });
            } else if (im && gifShots[i]) {
              // PC: igual que el código original (primer cuadro ya recortado dentro de la captura)
              im.removeAttribute('srcset');
              im.src = gifShots[i];
              im.style.cssText += ';object-fit:fill;width:100%;height:100%;';
            }
          });

          // foto de perfil ya recortada: cuadrada, sin "cover" que recalcular
          const fp = doc.querySelector('.foto-perfil');
          if (fp && fotoData) {
            fp.style.cssText += ';width:180px;height:180px;background-image:url("' + fotoData + '") !important;' +
              'background-size:100% 100% !important;background-position:0 0 !important;background-repeat:no-repeat !important;';
          }

          el.style.cssText += ';width:1000px;max-width:none;margin:0;padding:48px 40px;background:' + bg + ';';
          const base = el.getBoundingClientRect();
          // bloques "indivisibles": tarjetas, párrafos, títulos, etc. (posiciones relativas al contenedor)
          el.querySelectorAll(BLOCK_SEL).forEach(b => {
            const r = b.getBoundingClientRect();
            if (r.height < 2) return;
            const isHead = /^H[1-4]$/.test(b.tagName) && !b.closest('.card');
            // un título se queda pegado a lo que sigue (no queda solo al final de una página)
            blocks.push({ top: r.top - base.top, bottom: r.bottom - base.top + (isHead ? 110 : 0) });
          });
          gifSlots.forEach(g => {
            const r = g.node.getBoundingClientRect();
            g.x = r.left - base.left; g.y = r.top - base.top; g.w = r.width; g.h = r.height; g.node = null;
          });
          el.querySelectorAll('a[href]').forEach(a => {
            const href = a.href;
            if (!/^(https?:|mailto:)/.test(href) || href === doc.location.href + '#') return;
            const r = a.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) links.push({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height, url: href });
          });
        }
      });

      // Pintar los primeros cuadros de los GIFs directo sobre la captura (de a uno, para cuidar la memoria en iOS)
      {
        const ctx = canvas.getContext('2d');
        const rr = (x, y, w, h, r) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
        };
        for (const g of gifSlots) {
          const data = gifShots[g.i];
          if (!(g.w > 0) || !(g.h > 0)) continue;
          // fondo rosa debajo: si la imagen llega a dibujarse lo tapa por completo; si no, el recuadro no queda en blanco
          ctx.save();
          rr(g.x * scale, g.y * scale, g.w * scale, g.h * scale, 12 * scale);
          ctx.clip();
          const gr = ctx.createLinearGradient(g.x * scale, g.y * scale, (g.x + g.w) * scale, (g.y + g.h) * scale);
          gr.addColorStop(0, '#fbcfe8'); gr.addColorStop(1, '#f9a8d4');
          ctx.fillStyle = gr;
          ctx.fillRect(g.x * scale, g.y * scale, g.w * scale, g.h * scale);
          ctx.restore();
          if (!data) continue;
          try {
            const im = new Image();
            await new Promise(res => { im.onload = im.onerror = res; im.src = data; });
            if (im.decode) { try { await im.decode(); } catch (_) {} }
            if (!im.naturalWidth) continue;
            ctx.save();
            rr(g.x * scale, g.y * scale, g.w * scale, g.h * scale, 12 * scale);
            ctx.clip();
            ctx.drawImage(im, g.x * scale, g.y * scale, g.w * scale, g.h * scale);
            ctx.restore();
            im.src = '';
          } catch (_) {}
        }
      }

      progress(win, 0.96, T[lang()].s4, 2);
      const w = canvas.width / scale, totalH = canvas.height / scale;

      // ---- Paginado tipo A4 (vertical), cortando en espacios libres y no por la mitad de una tarjeta ----
      const pageH = Math.round(w * 1.4142);   // proporción A4
      const M = 28;                           // margen arriba y abajo de cada página
      const usable = pageH - M * 2;
      const pages = [];
      let y0 = 0;
      while (y0 < totalH - 1) {
        let end = y0 + usable;
        if (end >= totalH) { pages.push([y0, totalH]); break; }
        for (let guard = 0; guard < 400; guard++) {
          const hit = blocks.find(b => b.top > y0 + usable * 0.25 && b.top < end && b.bottom > end && (b.bottom - b.top) <= usable);
          if (!hit) break;
          end = hit.top;
        }
        pages.push([y0, end]);
        y0 = end;
      }

      const [br, bgc, bb] = ((bg.match(/\d+(\.\d+)?/g) || [255, 255, 255]).slice(0, 3)).map(Number);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: [w, pageH], hotfixes: ['px_scaling'] });

      pages.forEach(([a0, a1], i) => {
        if (i > 0) pdf.addPage([w, pageH], 'p');
        pdf.setFillColor(br, bgc, bb);
        pdf.rect(0, 0, w, pageH, 'F');
        const sy = Math.round(a0 * scale);
        const sh = Math.max(1, Math.min(canvas.height - sy, Math.round((a1 - a0) * scale)));
        const part = document.createElement('canvas');
        part.width = canvas.width; part.height = sh;
        const ctx = part.getContext('2d');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, part.width, part.height);
        ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
        pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', 0, M, w, sh / scale);
        part.width = part.height = 0; // libera memoria
      });

      // links clickeables, ubicados en la página que les corresponde
      links.forEach(l => {
        pages.forEach(([a0, a1], i) => {
          const top = Math.max(l.y, a0), bot = Math.min(l.y + l.h, a1);
          if (bot - top > 1) { pdf.setPage(i + 1); pdf.link(l.x, M + top - a0, l.w, bot - top, { url: l.url }); }
        });
      });
      pdf.setPage(1);
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
