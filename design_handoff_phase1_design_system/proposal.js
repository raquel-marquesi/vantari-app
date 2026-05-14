// Pin → note interactions in the diagnóstico section
document.querySelectorAll('.pin').forEach(pin => {
  const id = pin.dataset.pin;
  const note = document.querySelector(`.diag-notes li[data-note="${id}"]`);
  pin.addEventListener('mouseenter', () => note?.classList.add('active'));
  pin.addEventListener('mouseleave', () => note?.classList.remove('active'));
  pin.addEventListener('click', () => {
    note?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    note?.classList.add('active');
    setTimeout(() => note?.classList.remove('active'), 2000);
  });
});

// Smooth scroll for TOC links
document.querySelectorAll('.cover-toc a').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  });
});
