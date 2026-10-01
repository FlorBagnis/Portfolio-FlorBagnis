/* Exportar portfolio a PDF — archivo autónomo.
   No modifica ni depende de tu código existente, solo lee <html lang> y data-theme. */
(function () {
  const socials = document.querySelector('.header-socials');
  if (!socials) return;

  const T = {
    es: { label: 'Exportar PDF', title: 'Exportar portfolio en PDF', file: 'Florencia Bagnis - Portfolio' },
    en: { label: 'Export PDF', title: 'Export portfolio as PDF', file: 'Florencia Bagnis - Portfolio (EN)' }
  };
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'es');

  // Botón
  const btn = document.createElement('button');
  btn.id = 'export-pdf';
  btn.type = 'button';
  btn.className = 'export-pdf-btn';
  btn.innerHTML = '<i class="fas fa-file-pdf"></i><span id="export-pdf-label"></span>';
  socials.appendChild(btn);

  function updateTexts() {
    const t = T[lang()];
    document.getElementById('export-pdf-label').textContent = t.label;
    btn.title = t.title;
    btn.setAttribute('aria-label', t.title);
  }
  updateTexts();

  // Tu applyLang() cambia <html lang>: lo escuchamos para traducir el botón
  new MutationObserver(updateTexts).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang']
  });

  // beforeprint / afterprint también cubren Ctrl+P
  const originalTitle = document.title;
  let hidden = [];

  window.addEventListener('beforeprint', () => {
    document.title = T[lang()].file; // nombre sugerido del archivo
    // si hay un filtro activo, mostrar todos los proyectos
    hidden = Array.from(document.querySelectorAll('.card.hide-card'));
    hidden.forEach(c => c.classList.remove('hide-card'));
    // forzar carga de imágenes lazy para que salgan en el PDF
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      img.dataset.wasLazy = '1';
      img.loading = 'eager';
    });
  });

  window.addEventListener('afterprint', () => {
    document.title = originalTitle;
    hidden.forEach(c => c.classList.add('hide-card'));
    hidden = [];
    document.querySelectorAll('img[data-was-lazy]').forEach(img => {
      img.loading = 'lazy';
      delete img.dataset.wasLazy;
    });
  });

  btn.addEventListener('click', () => window.print());
})();
