/*
 * AT-38 probe, run with `page.evaluate(code)`: describes the active element and whether the
 * focus ring (SPEC §13.1: a 4 px outline with a white halo) is showing on it.
 */
(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { id: 'body', focusVisible: false };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const cls = typeof el.className === 'string' ? el.className : el.className.baseVal || '';
  const id = (el.dataset && el.dataset.testid) || (cls ? '.' + cls.split(' ')[0] : el.tagName);
  return {
    id,
    text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30),
    focusVisible: el.matches(':focus-visible'),
    outlineStyle: cs.outlineStyle,
    outlineWidth: cs.outlineWidth,
    boxShadow: cs.boxShadow,
    visible: r.width > 0 && r.height > 0,
    inDialog: Boolean(el.closest('[role="dialog"]')),
  };
})();
