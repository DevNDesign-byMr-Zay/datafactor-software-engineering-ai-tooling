/* ÆtherForge interaction guard: keeps command search stable while the SPA rerenders. */
document.addEventListener('input', event => {
  if (event.target?.id === 'globalSearch') event.stopImmediatePropagation();
}, true);
document.addEventListener('keydown', event => {
  const input = event.target;
  if (input?.id !== 'globalSearch' || event.key !== 'Enter') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const query = input.value.trim();
  const nav = document.querySelector('[data-page="modules"]');
  if (!nav) return;
  nav.click();
  requestAnimationFrame(() => {
    const field = document.querySelector('#moduleSearch');
    if (!field) return;
    field.value = query;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.focus();
  });
}, true);
