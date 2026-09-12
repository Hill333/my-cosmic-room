/*
 * AT-34 audit, run inside the page with `page.evaluate(code)` (the e2e project has no DOM
 * types, so browser code lives here as plain JS). Returns:
 *   targets: every enabled, visible, focusable control with its size in stage px
 *   text:    every visible run of text (and symbol icons) with its contrast ratio against the
 *            composited background of its ancestors (WCAG 2.x relative luminance)
 * Backgrounds behind a gradient or image are reported as `unknown` rather than guessed;
 * disabled controls are skipped (inactive components carry no contrast requirement);
 * the dev-only slot overlay is ignored.
 */
(() => {
  const viewport = document.querySelector('.stage-viewport');
  const scale = Number((viewport && viewport.dataset.scale) || 1);

  const parse = (str) => {
    const m = /rgba?\(([^)]+)\)/.exec(str || '');
    if (!m) return null;
    const parts = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  };
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const ratio = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  /** Composites `top` (with alpha) over the opaque `bottom`. */
  const over = (top, bottom) => {
    const a = top[3];
    return [
      Math.round(top[0] * a + bottom[0] * (1 - a)),
      Math.round(top[1] * a + bottom[1] * (1 - a)),
      Math.round(top[2] * a + bottom[2] * (1 - a)),
      1,
    ];
  };
  const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (cs.opacity === '0') return false;
      if (n.classList.contains('slot-debug')) return false;
    }
    return true;
  };

  /** Background behind `el`: the ancestors' background colours composited bottom-up. */
  const backgroundOf = (el) => {
    const layers = [];
    let unknown = false;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const c = parse(cs.backgroundColor);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        if (!(c && c[3] >= 1)) unknown = true;
      }
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
      if (n === document.body) break;
    }
    if (unknown) return null;
    let bg = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
    return bg;
  };

  const opacityOf = (el) => {
    let o = 1;
    for (let n = el; n && !n.classList.contains('stage'); n = n.parentElement) {
      o *= Number(getComputedStyle(n).opacity);
    }
    return o;
  };

  const describe = (el) =>
    (el.dataset && el.dataset.testid) ||
    (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') ||
    el.tagName.toLowerCase();

  // --- Targets -------------------------------------------------------------------------------
  const targets = [];
  for (const el of document.querySelectorAll(
    'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )) {
    if (el.disabled || el.getAttribute('aria-hidden') === 'true') continue;
    if (el.tabIndex < 0 && el.tagName !== 'BUTTON') continue;
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    targets.push({
      id: describe(el),
      text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30),
      w: Math.round(r.width / scale),
      h: Math.round(r.height / scale),
    });
  }

  // --- Text ----------------------------------------------------------------------------------
  // Emoji plus the variation selector and joiner (written as escapes so nothing is invisible).
  const EMOJI = new RegExp('^[\\p{Extended_Pictographic}\\uFE0F\\u200D\\s]+$', 'u');
  const LETTERS = /[\p{L}\p{N}]/u;
  const text = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.nodeValue.replace(/\s+/g, ' ').trim();
    if (!value) continue;
    const el = node.parentElement;
    if (!el || el.closest('svg, script, style, .slot-debug')) continue;
    if (!isVisible(el)) continue;
    if (EMOJI.test(value)) continue; // coloured glyphs, not text
    const control = el.closest('button, [role="button"]');
    if (control && control.disabled) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    const bg = backgroundOf(el);
    const kind = LETTERS.test(value) ? 'text' : 'symbol';
    if (!fg) continue;
    if (!bg) {
      text.push({ id: describe(el), text: value.slice(0, 40), kind, ratio: null, bg: 'unknown' });
      continue;
    }
    const effective = over([fg[0], fg[1], fg[2], fg[3] * opacityOf(el)], bg);
    text.push({
      id: describe(el),
      text: value.slice(0, 40),
      kind,
      size: Math.round(parseFloat(cs.fontSize)),
      ratio: Math.round(ratio(effective, bg) * 100) / 100,
      fg: hex(effective),
      bg: hex(bg),
    });
  }

  return { scale, targets, text };
})();
