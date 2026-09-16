import type { PinPlacement } from '../types';

const SKIP_TAGS = new Set(['HTML', 'BR', 'SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'NOSCRIPT']);

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Build a selector unique enough to find this node again after layout/viewport changes.
 * Prefers a unique id, then an nth-of-type path.
 */
export function buildUniqueSelector(el: Element, root: Document = el.ownerDocument): string {
  if (el.id) {
    const idSel = `#${cssEscape(el.id)}`;
    try {
      if (root.querySelectorAll(idSel).length === 1) return idSel;
    } catch {
      // Invalid id for a selector; fall through to a path.
    }
  }

  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== root.documentElement) {
    let part = current.tagName.toLowerCase();

    if (current.id) {
      parts.unshift(`${part}#${cssEscape(current.id)}`);
      break;
    }

    const parent = current.parentElement;
    if (parent) {
      const sameTag = Array.from(parent.children).filter((child) => child.tagName === current!.tagName);
      if (sameTag.length > 1) {
        part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
      }
    }

    parts.unshift(part);
    current = parent;
  }

  return parts.join(' > ') || el.tagName.toLowerCase();
}

export function describeSelector(selector: string): string {
  const last = selector.split('>').pop()?.trim() ?? selector;
  return last.replace(/^[#.]/, '');
}

function iframePointFromClient(
  iframe: HTMLIFrameElement,
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  const rect = iframe.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * iframe.clientWidth,
    y: ((clientY - rect.top) / rect.height) * iframe.clientHeight
  };
}

/** Smallest painted element under a point, skipping full-viewport layout shells. */
export function pickTargetElement(doc: Document, x: number, y: number, viewportArea: number): Element | null {
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

  return stack.find((el) => el instanceof Element && el.tagName !== 'BODY' && !SKIP_TAGS.has(el.tagName)) ?? null;
}

export function elementAtClientPoint(
  iframe: HTMLIFrameElement,
  clientX: number,
  clientY: number
): Element | null {
  const doc = iframe.contentDocument;
  const point = iframePointFromClient(iframe, clientX, clientY);
  if (!doc || !point) return null;
  return pickTargetElement(doc, point.x, point.y, iframe.clientWidth * iframe.clientHeight);
}

export function getScrollParent(el: Element | null): HTMLElement | null {
  let current: HTMLElement | null = el instanceof HTMLElement ? el : (el?.parentElement ?? null);
  const view = current?.ownerDocument.defaultView;
  if (!view) return null;

  while (current) {
    const style = view.getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const scrollsY =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      current.scrollHeight > current.clientHeight + 1;
    const scrollsX =
      (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
      current.scrollWidth > current.clientWidth + 1;
    if (scrollsY || scrollsX) return current;
    current = current.parentElement;
  }
  return null;
}

export function listScrollableElements(doc: Document): HTMLElement[] {
  const found: HTMLElement[] = [];
  const view = doc.defaultView;
  if (!view) return found;
  const all = doc.querySelectorAll('body, body *');
  all.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const style = view.getComputedStyle(node);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const scrollsY =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1;
    const scrollsX =
      (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
      node.scrollWidth > node.clientWidth + 1;
    if (scrollsY || scrollsX) found.push(node);
  });
  return found;
}

export function capturePinAtPoint(
  iframe: HTMLIFrameElement,
  clientX: number,
  clientY: number
): PinPlacement | null {
  const point = iframePointFromClient(iframe, clientX, clientY);
  if (!point || iframe.clientWidth === 0 || iframe.clientHeight === 0) return null;

  const xPercent = Math.max(0, Math.min(100, (point.x / iframe.clientWidth) * 100));
  const yPercent = Math.max(0, Math.min(100, (point.y / iframe.clientHeight) * 100));

  const doc = iframe.contentDocument;
  const target = doc
    ? pickTargetElement(doc, point.x, point.y, iframe.clientWidth * iframe.clientHeight)
    : null;
  if (!target) {
    return { xPercent, yPercent };
  }

  const elRect = target.getBoundingClientRect();
  const anchorX = elRect.width > 0 ? clamp01((point.x - elRect.left) / elRect.width) : 0.5;
  const anchorY = elRect.height > 0 ? clamp01((point.y - elRect.top) / elRect.height) : 0.5;

  return {
    xPercent,
    yPercent,
    targetSelector: buildUniqueSelector(target, target.ownerDocument),
    anchorX,
    anchorY
  };
}

/** Bind a legacy percent-only pin to whatever element currently sits under it. */
export function inferElementAnchor(iframe: HTMLIFrameElement, pin: PinPlacement): PinPlacement {
  if (pin.targetSelector) {
    return {
      ...pin,
      anchorX: pin.anchorX ?? 0.5,
      anchorY: pin.anchorY ?? 0.5
    };
  }
  const doc = iframe.contentDocument;
  if (!doc) return pin;
  const x = (pin.xPercent / 100) * iframe.clientWidth;
  const y = (pin.yPercent / 100) * iframe.clientHeight;
  const target = pickTargetElement(doc, x, y, iframe.clientWidth * iframe.clientHeight);
  if (!target) return pin;
  const elRect = target.getBoundingClientRect();
  return {
    ...pin,
    targetSelector: buildUniqueSelector(target, doc),
    anchorX: elRect.width > 0 ? clamp01((x - elRect.left) / elRect.width) : 0.5,
    anchorY: elRect.height > 0 ? clamp01((y - elRect.top) / elRect.height) : 0.5
  };
}

function findAnchoredElement(
  doc: Document,
  selector: string,
  fallback: { left: number; top: number }
): Element | null {
  const matches = Array.from(doc.querySelectorAll(selector));
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  let best: Element | null = null;
  let bestDist = Infinity;
  for (const match of matches) {
    const rect = match.getBoundingClientRect();
    const contains =
      fallback.left >= rect.left &&
      fallback.left <= rect.left + rect.width &&
      fallback.top >= rect.top &&
      fallback.top <= rect.top + rect.height;
    if (contains) return match;
    const dist = Math.hypot(rect.left + rect.width / 2 - fallback.left, rect.top + rect.height / 2 - fallback.top);
    if (dist < bestDist) {
      bestDist = dist;
      best = match;
    }
  }
  return best;
}

export function resolvePinPosition(
  iframe: HTMLIFrameElement,
  pin: PinPlacement
): { left: number; top: number } {
  const fallback = {
    left: (pin.xPercent / 100) * iframe.clientWidth,
    top: (pin.yPercent / 100) * iframe.clientHeight
  };

  const doc = iframe.contentDocument;
  if (!doc || !pin.targetSelector) return fallback;

  const anchorX = pin.anchorX ?? 0.5;
  const anchorY = pin.anchorY ?? 0.5;

  let el: Element | null = null;
  try {
    el = findAnchoredElement(doc, pin.targetSelector, fallback);
  } catch {
    return fallback;
  }
  if (!el) return fallback;

  const rect = el.getBoundingClientRect();
  return {
    left: rect.left + rect.width * anchorX,
    top: rect.top + rect.height * anchorY
  };
}

export function setHoverHighlight(doc: Document | null, el: Element | null): void {
  if (!doc) return;
  doc.querySelectorAll('[data-review-anchor-hover]').forEach((node) => {
    node.removeAttribute('data-review-anchor-hover');
  });
  el?.setAttribute('data-review-anchor-hover', 'true');
}

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
