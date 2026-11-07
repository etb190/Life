// appleEmoji.js — Render every emoji in the UI with iOS/Apple style artwork.
//
// Apple's emoji font can't be bundled (proprietary + ~100MB), so instead the
// DOM's emoji characters are swapped for matching PNG images from the
// `emoji-datasource-apple` CDN set. This makes emojis look identical on every
// platform (Windows "Segoe UI Emoji" and Android "Noto" get replaced with
// Apple artwork), including emoji inside engine-generated strings.
//
// React safety: text nodes are never re-parented or wrapped. React keeps its
// own text node; we only strip emoji characters from its data and insert the
// Apple-style <img> elements as inline siblings right after it. When React
// updates or removes a text node, a MutationObserver re-runs the swap or
// cleans up the sibling images, so reconciliation keeps working.

const CDN_BASE =
  'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/';

// Pictographic characters (covers flags, ZWJ sequences, skin tones) + keycaps.
const EMOJI_SCAN = /\p{Extended_Pictographic}|\u{20E3}/u;

let segmenter = null;
try {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  }
} catch {
  segmenter = null;
}

function splitGraphemes(str) {
  if (segmenter) {
    return Array.from(segmenter.segment(str), (s) => s.segment);
  }
  return Array.from(str);
}

// Elements/text contexts that must never be touched.
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT',
  'OPTION', 'TITLE', 'IMG', 'CANVAS', 'SVG',
]);

function insideSkippedHost(node) {
  for (let p = node; p; p = p.parentNode) {
    if (p.nodeType !== 1) continue;
    if (SKIP_TAGS.has(p.tagName)) return true;
    if (p.hasAttribute && p.hasAttribute('data-emoji-plain')) return true;
  }
  return false;
}

function codePointsStr(seg) {
  return Array.from(seg, (c) => c.codePointAt(0).toString(16));
}

// Build the CDN URLs to try, in order. emoji-datasource names files per the
// official sequence, so variation for `fe0f` (e.g. ❤️ = "2764-fe0f") matters:
// first try the text exactly as typed, then the fe0f variants.
function emojiImageUrls(seg) {
  const asIs = codePointsStr(seg).join('-');
  const urls = [`${CDN_BASE}${asIs}.png`];
  const stripped = codePointsStr(seg)
    .filter((hex) => hex !== 'fe0f')
    .join('-');
  if (stripped !== asIs) {
    urls.push(`${CDN_BASE}${stripped}.png`);
  } else {
    // Native macOS often needs a fe0f variant for default-text glyphs —
    // retry with fe0f appended after the first code point.
    const ids = Array.from(seg, (c) => c.codePointAt(0));
    const withFe0f = ids
      .flatMap((cp, i) => (i === 0 && cp !== 0xfe0f ? [cp, 0xfe0f] : [cp]))
      .map((cp) => cp.toString(16))
      .join('-');
    if (withFe0f !== asIs) urls.push(`${CDN_BASE}${withFe0f}.png`);
  }
  return urls;
}

function makeEmojiImage(seg) {
  const img = document.createElement('img');
  img.className = 'apple-emoji';
  img.alt = seg;
  img.draggable = false;
  img.setAttribute('data-apple-emoji', seg);
  const urls = emojiImageUrls(seg);
  let attempt = 0;
  img.onerror = () => {
    attempt += 1;
    if (attempt < urls.length) {
      img.src = urls[attempt];
      return;
    }
    // No Apple artwork for this glyph (rare) — fall back to the native emoji.
    img.onerror = null;
    if (img.parentNode) {
      img.parentNode.replaceChild(document.createTextNode(seg), img);
    }
  };
  img.src = urls[0];
  return img;
}

// text node -> { lastRaw: string, imgs: HTMLImageElement[] }
const tracked = new WeakMap();

function clearImgs(info) {
  for (const el of info.imgs) {
    if (el.parentNode) el.parentNode.removeChild(el);
  }
}

function sanitizeTextNode(node) {
  if (!node || node.nodeType !== 3 || insideSkippedHost(node)) return;
  const raw = node.data;
  if (!raw || !EMOJI_SCAN.test(raw)) return;

  const prev = tracked.get(node);
  if (prev && prev.lastRaw === raw) return; // already handled this content

  // Text may have changed to contain no emoji anymore (React updates) —
  // drop any images we added earlier.
  if (prev && prev.imgs) {
    const stillEmoji = EMOJI_SCAN.test(raw);
    if (!stillEmoji) {
      clearImgs(prev);
      node.data = raw;
      tracked.delete(node);
      return;
    }
  }

  const segs = splitGraphemes(raw);
  let plain = '';
  const emojis = [];
  for (const seg of segs) {
    if (EMOJI_SCAN.test(seg)) emojis.push(seg);
    else plain += seg;
  }

  if (prev && prev.imgs) clearImgs(prev);

  // React keeps ownership of this node — we just remove the emoji characters
  // (adjacent HTML whitespace collapses naturally) and add the artwork after it.
  node.data = plain;
  const frag = document.createDocumentFragment();
  for (const seg of emojis) frag.appendChild(makeEmojiImage(seg));
  if (frag.childNodes.length) node.after(frag);
  tracked.set(node, { lastRaw: raw, imgs: Array.from(frag.childNodes) });
}

function emojifyTree(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const n = walker.currentNode;
    // Cheap rejection to avoid grapheme-splitting every node in the app.
    if (n.data && EMOJI_SCAN.test(n.data)) nodes.push(n);
  }
  for (const n of nodes) sanitizeTextNode(n);
}

let observer = null;

function startObservers() {
  observer = new MutationObserver((mutations, obs) => {
    // Process synchronously (before paint) and ignore our own DOM changes made
    // while the observer is disconnected.
    obs.disconnect();
    try {
      // Delayed removals: React removing a text node should also remove the
      // images that were anchored to it (they are its siblings).
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const removed of m.removedNodes) {
            const info = tracked.get(removed);
            if (info && info.imgs) clearImgs(info);
          }
        }
      }
      const sources = new Set();
      for (const m of mutations) {
        if (m.type === 'characterData') sources.add(m.target);
        else if (m.type === 'childList') {
          for (const added of m.addedNodes) sources.add(added);
        }
      }
      for (const src of sources) {
        if (src.nodeType === 3) sanitizeTextNode(src);
        else if (src.nodeType === 1) emojifyTree(src);
      }
    } catch {
      // Never let emoji styling break the game.
    } finally {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

export function installAppleEmojis() {
  if (observer || typeof document === 'undefined') return;
  emojifyTree(document.body);
  startObservers();
}

export function uninstallAppleEmojis() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
