/* Shadow Rep — renames the visible branding of the food app (NutriTrace) without touching its code.
   Loaded by the proxy (see nginx.conf.template). It only changes what a person SEES: the product name in
   headings/messages/titles, the logo images and the browser-tab icon. Credit and licence lines (anything
   mentioning TraceApps, AGPL, licence, GitHub) are deliberately left exactly as they are. */
(function () {
  'use strict';
  var FROM = 'NutriTrace';
  var TO = 'Shadow Rep Food';
  var BASE = (window.__NT_CONFIG__ && window.__NT_CONFIG__.basePath) || '';
  var ICONS = BASE + '/_sr/icons/';
  var KEEP = /TraceApps|AGPL|[Ll]icen[cs]e|github\.com|CookTrace/;

  var NEEDS = /NutriTrace|\bTrace\b/;   // the product name, its tagline, and its feature name "Trace" (the AI assistant)

  function swap(s) {
    s = s.split(FROM).join(TO);
    s = s.replace(/Trace Every Bite\s*[—–-]\s*Personal Nutrition Tracker/g, 'Fuel the rep. Track every bite.').replace(/Trace Every Bite/g, 'Fuel the rep');
    return s.replace(/\bTrace\b/g, 'Rep');
  }

  function fixAttrs(el) {
    var names = ['alt', 'title', 'placeholder', 'aria-label'];
    for (var i = 0; i < names.length; i++) {
      var v = el.getAttribute(names[i]);
      if (v && NEEDS.test(v) && !KEEP.test(v)) el.setAttribute(names[i], swap(v));
    }
  }

  function fixImage(img) {
    // every logo-like image the app shows carries its product name as alt text
    var alt = img.getAttribute('alt') || '';
    var src = img.getAttribute('src') || '';
    if (alt.indexOf(FROM) !== -1 || alt.indexOf(TO) !== -1 || /\/icons\/(logo|icon-\d+)\.png/.test(src)) {
      var want = ICONS + 'logo.png';
      if (src !== want) img.setAttribute('src', want);
    }
  }

  function walk(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      var v = node.nodeValue;
      if (v && NEEDS.test(v) && !KEEP.test(v)) node.nodeValue = swap(v);
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') return;
    if (tag === 'IMG') fixImage(node);
    fixAttrs(node);
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  function fixTitle() {
    if (document.title && NEEDS.test(document.title)) document.title = swap(document.title);
  }

  // browser-tab / home-screen icons: replace the app's own <link>s with ours (unique URL, so no stale cache)
  function fixIcons() {
    var old = document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="shortcut icon"]');
    for (var i = 0; i < old.length; i++) if (!old[i].hasAttribute('data-sr')) old[i].parentNode.removeChild(old[i]);
    if (document.querySelector('link[data-sr]')) return;
    var defs = [['icon', 'image/png', '512x512', 'icon-512.png'], ['icon', 'image/png', '192x192', 'icon-192.png'], ['apple-touch-icon', '', '192x192', 'icon-192.png']];
    defs.forEach(function (d) {
      var l = document.createElement('link');
      l.rel = d[0]; if (d[1]) l.type = d[1]; l.sizes = d[2]; l.href = ICONS + d[3]; l.setAttribute('data-sr', '1');
      document.head.appendChild(l);
    });
  }

  var pending = new Set(), scheduled = false;
  function flush() {
    scheduled = false;
    pending.forEach(function (n) { if (n.isConnected !== false) walk(n); });
    pending.clear();
    fixTitle();
  }
  function queue(n) {
    pending.add(n);
    if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
  }

  function start() {
    fixIcons();
    walk(document.documentElement);
    fixTitle();
    var mo = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'childList') { for (var j = 0; j < r.addedNodes.length; j++) queue(r.addedNodes[j]); if (r.target === document.head || r.target.tagName === 'TITLE') fixTitle(); }
        else if (r.type === 'characterData') queue(r.target);
        else if (r.type === 'attributes') queue(r.target);
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['alt', 'title', 'placeholder', 'aria-label', 'src'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  // Hunter's rations header on the Diary (separate file, same folder)
  var rs = document.createElement('script'); rs.src = BASE + '/_sr/rations.js?v=1'; rs.defer = true; document.head.appendChild(rs);
})();
