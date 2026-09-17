import type { PinPlacement } from '../types';

const SKIP_TAGS = new Set(['HTML', 'BR', 'SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'NOSCRIPT']);

// ---------------------------------------------------------------------------
// CSS selector helpers
// ---------------------------------------------------------------------------

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Build a selector unique enough to re-find this element after a layout change
 * (e.g. switching between desktop and mobile viewports).
 * Walks up the DOM tree and uses nth-of-type on each element so that cards/sections
 * in lists retain their exact index.
 */
export function buildUniqueSelector(el: Element, root: Document = el.ownerDocument): string {
  if (el.id) {
    const idSel = `#${cssEscape(el.id)}`;
    try {
      if (root.querySelectorAll(idSel).length === 1) return idSel;
    } catch {
      // fall through
    }
  }

  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== root.documentElement && current !== root.body) {
    let part = current.tagName.toLowerCase();

    if (current.id) {
      const idSel = `#${cssEscape(current.id)}`;
      try {
        if (root.querySelectorAll(idSel).length === 1) {
          parts.unshift(`${part}${idSel}`);
          break;
        }
      } catch {
        // ignore
      }
    }

    const parent = current.parentElement;
    if (parent) {
      // Use :nth-of-type so that list items / sibling cards are distinguished!
      const siblingsWithTag = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      );
      const index = siblingsWithTag.indexOf(current) + 1;
      part += `:nth-of-type(${index})`;
    }

    parts.unshift(part);
    current = parent;
  }

  return parts.join(' > ') || el.tagName.toLowerCase();
}

// ---------------------------------------------------------------------------
// Element hit-testing
// ---------------------------------------------------------------------------

/** Smallest painted element under a point in the iframe document. */
function pickTargetElement(doc: Document, x: number, y: number, viewportArea: number): Element | null {
  const stack =
    typeof doc.elementsFromPoint === 'function'
      ? doc.elementsFromPoint(x, y)
      : ([doc.elementFromPoint(x, y)].filter(Boolean) as Element[]);

  for (const el of stack) {
    if (!(el instanceof Element) || SKIP_TAGS.has(el.tagName) || el.tagName === 'BODY') continue;
    const rect = el.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area <= 0) continue;
    if (viewportArea > 0 && area >= viewportArea * 0.85) continue;
    return el;
  }

  return (
    stack.find(
      (el) => el instanceof Element && el.tagName !== 'BODY' && !SKIP_TAGS.has(el.tagName)
    ) ?? null
  );
}

export function elementAtClientPoint(
  iframe: HTMLIFrameElement,
  clientX: number,
  clientY: number
): Element | null {
  const doc = iframe.contentDocument;
  const iRect = iframe.getBoundingClientRect();
  if (!doc || iRect.width === 0 || iRect.height === 0) return null;
  const x = ((clientX - iRect.left) / iRect.width) * iframe.clientWidth;
  const y = ((clientY - iRect.top) / iRect.height) * iframe.clientHeight;
  return pickTargetElement(doc, x, y, iframe.clientWidth * iframe.clientHeight);
}

export function describeSelector(selector: string): string {
  const last = selector.split('>').pop()?.trim() ?? selector;
  return last.replace(/^[#.]/, '');
}

// ---------------------------------------------------------------------------
// Hover highlight (visual feedback only)
// ---------------------------------------------------------------------------

export function setHoverHighlight(doc: Document | null, el: Element | null): void {
  if (!doc) return;
  doc.querySelectorAll('[data-review-anchor-hover]').forEach((node) => {
    node.removeAttribute('data-review-anchor-hover');
  });
  el?.setAttribute('data-review-anchor-hover', 'true');
}

// ---------------------------------------------------------------------------
// Pin capture — stores element selector + text snippet + percentage fallback
// ---------------------------------------------------------------------------

/**
 * Record where the user clicked. Stores:
 *  - xPercent / yPercent as a document-relative percentage fallback
 *  - targetSelector + anchorX/Y so the pin tracks its element across
 *    viewport mode changes (desktop → tablet → mobile)
 *  - targetText snippet for unambiguous re-identification across DOM variations
 */
export function capturePinAtPoint(
  iframe: HTMLIFrameElement,
  clientX: number,
  clientY: number
): PinPlacement | null {
  const iRect = iframe.getBoundingClientRect();
  if (iRect.width === 0 || iRect.height === 0) return null;
  if (iframe.clientWidth === 0 || iframe.clientHeight === 0) return null;

  // Convert host-page viewport coords → iframe document coords
  const x = ((clientX - iRect.left) / iRect.width) * iframe.clientWidth;
  const y = ((clientY - iRect.top) / iRect.height) * iframe.clientHeight;

  const xPercent = clamp01(x / iframe.clientWidth) * 100;
  const yPercent = clamp01(y / iframe.clientHeight) * 100;

  const doc = iframe.contentDocument;
  const target = doc
    ? pickTargetElement(doc, x, y, iframe.clientWidth * iframe.clientHeight)
    : null;

  if (!target) {
    return { xPercent, yPercent };
  }

  // anchorX/Y = fractional offset within the element at click time
  const elRect = target.getBoundingClientRect();
  const anchorX = elRect.width > 0 ? clamp01((x - elRect.left) / elRect.width) : 0.5;
  const anchorY = elRect.height > 0 ? clamp01((y - elRect.top) / elRect.height) : 0.5;

  const textContent = (target.textContent || '').trim().slice(0, 80);

  return {
    xPercent,
    yPercent,
    targetSelector: buildUniqueSelector(target, target.ownerDocument),
    targetText: textContent || undefined,
    anchorX,
    anchorY
  };
}

// ---------------------------------------------------------------------------
// Pin resolution — find the element in the current layout and return its
// pixel position so the pin overlay can place the badge correctly.
// ---------------------------------------------------------------------------

function findAnchoredElement(
  doc: Document,
  selector: string,
  targetText?: string,
  fallback?: { left: number; top: number }
): Element | null {
  let matches: Element[] = [];
  try {
    matches = Array.from(doc.querySelectorAll(selector));
  } catch {
    // selector might be invalid
  }

  // If exact selector didn't match, or matched multiple, use targetText if available
  if (targetText && (matches.length === 0 || matches.length > 1)) {
    const textNormalized = targetText.toLowerCase();
    const textMatches = matches.filter(
      (m) => (m.textContent || '').trim().toLowerCase().includes(textNormalized)
    );
    if (textMatches.length === 1) {
      return textMatches[0];
    } else if (textMatches.length > 1) {
      matches = textMatches;
    } else if (matches.length === 0) {
      // Fallback: search anywhere in the document for elements matching text
      const allWithText = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, div, li, td, th')).filter(
        (el) => (el.textContent || '').trim().toLowerCase() === textNormalized
      );
      if (allWithText.length === 1) return allWithText[0];
      if (allWithText.length > 1) matches = allWithText;
    }
  }

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // Multiple matches: choose the one closest to relative fallback percentage
  if (fallback) {
    let best: Element | null = null;
    let bestDist = Infinity;
    for (const match of matches) {
      const rect = match.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(cx - fallback.left, cy - fallback.top);
      if (dist < bestDist) {
        bestDist = dist;
        best = match;
      }
    }
    return best;
  }

  return matches[0];
}

/**
 * Resolve a pin to { left, top } in the iframe/overlay coordinate space.
 *
 * - If the pin has a targetSelector (or targetText), we find the element in
 *   the current layout (which differs between desktop and mobile) and return
 *   its exact position.
 * - Falls back to percentage-based positioning if the element cannot be found.
 */
export function resolvePinPosition(
  iframe: HTMLIFrameElement,
  pin: PinPlacement
): { left: number; top: number } {
  const fallback = {
    left: (pin.xPercent / 100) * iframe.clientWidth,
    top: (pin.yPercent / 100) * iframe.clientHeight
  };

  const doc = iframe.contentDocument;
  if (!doc || (!pin.targetSelector && !pin.targetText)) return fallback;

  const el = findAnchoredElement(doc, pin.targetSelector || '', pin.targetText, fallback);
  if (!el) return fallback;

  const rect = el.getBoundingClientRect();
  const anchorX = pin.anchorX ?? 0.5;
  const anchorY = pin.anchorY ?? 0.5;

  return {
    left: rect.left + rect.width * anchorX,
    top: rect.top + rect.height * anchorY
  };
}

// ---------------------------------------------------------------------------
// Equality guard — avoids unnecessary React re-renders in the rAF loop
// ---------------------------------------------------------------------------

export function coordsEqual(
  a: Record<string, { left: number; top: number }>,
  b: Record<string, { left: number; top: number }>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const next = b[key];
    if (!next) return false;
    if (Math.abs(a[key].left - next.left) > 0.5 || Math.abs(a[key].top - next.top) > 0.5) {
      return false;
    }
  }
  return true;
}
