/* Shadow Rep — "Hunter's rations": the food app's Diary shows the three food quests for today, right at the top.
   It reads only the food app's OWN data (the signed-in person's diary and goals, through the same-origin API
   with their own session cookie) — nothing is sent anywhere, nothing is stored. The rules are the same as the
   gym app's daily quests (apps/gym/frontend/src/custom/levelup-config.js): MIN_MEAL_ITEMS and proteinHitRatio.
   Only in the System skin; silent if the data can't be read. */
(function () {
  'use strict';
  var BASE = (window.__NT_CONFIG__ && window.__NT_CONFIG__.basePath) || '';
  var MIN_MEAL_ITEMS = 3, PROTEIN_RATIO = 0.9;
  var XP = { meals: 20, protein: 20, water: 10 };
  var root = null, timer = null, inflight = false, last = null;

  function isoToday() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function sys() { return document.documentElement.getAttribute('data-skin') === 'system'; }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && isFinite(+v) ? +v : 0); }
  function getJson(path) {
    return fetch(BASE + path, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  function compute(diary, settings) {
    var items = (diary && diary.items) || [], water = (diary && diary.water) || [];
    var protein = 0, i;
    for (i = 0; i < items.length; i++) protein += num(items[i].nutrition && (items[i].nutrition.proteins != null ? items[i].nutrition.proteins : items[i].nutrition.protein)) * (items[i].quantity != null ? num(items[i].quantity) : 1);
    var ml = 0;
    for (i = 0; i < water.length; i++) ml += num(water[i].amount);
    var goals = (settings && settings.goals) || {};
    var pGoal = num(goals.proteins != null ? goals.proteins : goals.protein);
    var wGoal = num(settings && settings.waterGoalMl);
    var q = [{ id: 'meals', label: 'Log your meals', detail: Math.min(items.length, MIN_MEAL_ITEMS) + '/' + MIN_MEAL_ITEMS + ' foods', frac: items.length / MIN_MEAL_ITEMS, done: items.length >= MIN_MEAL_ITEMS, xp: XP.meals }];
    if (pGoal > 0) q.push({ id: 'protein', label: 'Hit your protein target', detail: Math.round(protein) + '/' + Math.round(pGoal) + ' g', frac: protein / (pGoal * PROTEIN_RATIO), done: protein >= pGoal * PROTEIN_RATIO, xp: XP.protein });
    if (wGoal > 0) q.push({ id: 'water', label: 'Drink your water', detail: Math.round(ml) + '/' + Math.round(wGoal) + ' ml', frac: ml / wGoal, done: ml >= wGoal, xp: XP.water });
    return q;
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function render(quests) {
    var host = document.querySelector('.page-shell.diary-page .diary-content');
    if (!host || !sys()) { if (root && root.parentNode) root.parentNode.removeChild(root); return; }
    if (!root) { root = el('div', 'card sr-rations'); root.setAttribute('role', 'group'); root.setAttribute('aria-label', "Hunter's rations"); }
    if (root.parentNode !== host || host.firstChild !== root) host.insertBefore(root, host.firstChild);

    var done = quests.filter(function (x) { return x.done; }).length;
    var sig = JSON.stringify(quests.map(function (x) { return [x.id, x.detail, x.done]; }));
    if (root.getAttribute('data-sig') === sig) return;
    root.setAttribute('data-sig', sig);
    root.textContent = '';

    var head = el('div', 'sr-r-head');
    head.appendChild(el('span', 'sr-r-tag', "Hunter's rations"));
    head.appendChild(el('span', 'sr-r-count', done + '/' + quests.length));
    root.appendChild(head);

    quests.forEach(function (x) {
      var row = el('div', 'sr-r-row' + (x.done ? ' done' : ''));
      var chk = el('span', 'sr-r-chk', x.done ? '✓' : ''); chk.setAttribute('aria-hidden', 'true');
      var txt = el('div', 'sr-r-txt');
      txt.appendChild(el('div', 'sr-r-label', x.label));
      txt.appendChild(el('div', 'sr-r-detail', x.detail));
      var bar = el('div', 'sr-r-bar'); bar.setAttribute('aria-hidden', 'true');
      var fill = el('i'); fill.style.width = Math.max(0, Math.min(100, Math.round(x.frac * 100))) + '%'; bar.appendChild(fill);
      txt.appendChild(bar);
      row.appendChild(chk); row.appendChild(txt); row.appendChild(el('span', 'sr-r-xp', '+' + x.xp + ' XP'));
      root.appendChild(row);
    });
    if (quests.length && done === quests.length) root.appendChild(el('div', 'sr-r-all', 'All rations secured. Well done.'));
  }

  function refresh() {
    if (inflight || !sys() || !document.querySelector('.page-shell.diary-page')) { if (root && !document.querySelector('.page-shell.diary-page') && root.parentNode) root.parentNode.removeChild(root); return; }
    inflight = true;
    Promise.all([getJson('/api/diary/' + isoToday()), getJson('/api/settings')]).then(function (r) {
      last = compute(r[0], r[1]); render(last);
    }).catch(function () { /* not signed in, or the app is busy: show nothing */ }).then(function () { inflight = false; });
  }
  function soon(ms) { clearTimeout(timer); timer = setTimeout(refresh, ms || 1200); }

  // the Diary page is created and destroyed by the app, so watch for it; edits sync to the server shortly after a tap
  new MutationObserver(function (m) {
    for (var i = 0; i < m.length; i++) if (!(root && root.contains(m[i].target))) { if (document.querySelector('.page-shell.diary-page')) { if (!root || !root.isConnected) soon(250); } return; }
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', function () { soon(400); });
  document.addEventListener('click', function () { soon(1600); }, true);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) soon(300); });
  setInterval(function () { if (!document.hidden) refresh(); }, 30000);
  soon(600);
})();
