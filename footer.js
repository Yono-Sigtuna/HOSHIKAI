/* 页脚 · 标题画面（v3p 首页 .title 整块照抄）
   结构在各页 footer 里是静态的；这里补齐由数据/几何决定的部分：
   ① 背景星盘 SVG（dialSVG）② 站点读数 + 日期 + 公告文案 ③ 星座连线 ④ 公告逐字打出
   ⚠️ 每页都加载；没有 .footer .title 或拿不到 FORUM 就直接退出，不报错。 */
(function footerTitle() {
  const box = document.querySelector('.footer .title');
  if (!box) return;
  const $ = (s, r) => (r || box).querySelector(s);
  const $$ = (s, r) => [].slice.call((r || box).querySelectorAll(s));
  const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- ① 背景星盘（与 v3p core.js 的 dialSVG 逐字相同） ---------- */
  const dial = $('.title__dial');
  if (dial) {
    const t = (r1, r2, n, step, longEvery) => Array.from({ length: n }, (_, i) => {
      const a = i * step * Math.PI / 180, rr = i % longEvery ? r1 - 8 : r1 - 20;
      return `<line x1="${(300 + r1 * Math.cos(a)).toFixed(1)}" y1="${(300 + r1 * Math.sin(a)).toFixed(1)}" `
        + `x2="${(300 + rr * Math.cos(a)).toFixed(1)}" y2="${(300 + rr * Math.sin(a)).toFixed(1)}"/>`;
    }).join('');
    const hours = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 - 90) * Math.PI / 180;
      return `<text x="${(300 + 252 * Math.cos(a)).toFixed(1)}" y="${(304 + 252 * Math.sin(a)).toFixed(1)}">${i * 2}h</text>`;
    }).join('');
    dial.setAttribute('viewBox', '0 0 600 600');
    dial.innerHTML = '<g class="dial__o"><circle cx="300" cy="300" r="290"/><g class="dial__t">' + t(290, 0, 72, 5, 6)
      + '</g><g class="dial__h">' + hours + '</g></g>'
      + '<g class="dial__i"><circle cx="300" cy="300" r="214" stroke-dasharray="2 7"/><circle cx="300" cy="300" r="150"/>'
      + '<g class="dial__t">' + t(214, 0, 24, 15, 3) + '</g>'
      + '<path d="M300 86 l6 14 -6 -4 -6 4z" class="dial__pt"/></g>'
      + '<ellipse class="dial__ec" cx="300" cy="300" rx="270" ry="96" transform="rotate(-23.4 300 300)"/>';
  }

  /* ---------- ② 数据 ---------- */
  if (typeof FORUM !== 'undefined' && FORUM.stats) {
    const st = FORUM.stats, ann = FORUM.announcement || {};
    const ld = $('[data-logdate]');
    if (ld) ld.textContent = FORUM.logDate || '';
    const tg = $('[data-tagline]');
    if (tg) tg.textContent = FORUM.tagline || '';
    $$('[data-stat]').forEach((el) => {
      const v = st[el.dataset.stat];
      if (typeof v === 'number') el.textContent = v.toLocaleString();
    });
    const tag = $('[data-ann-tag]');
    if (tag) tag.textContent = ann.tag || '';
    const at = $('[data-ann-title]');
    if (at) at.textContent = ann.title || '';
    const sr = $('[data-ann-body]');
    if (sr) sr.textContent = ann.body || '';

    /* ---------- ④ 公告逐字打出 ---------- */
    const tw = $('.tw'), win = $('.title__ann');
    if (tw && win && ann.body) {
      const full = ann.body;
      tw.dataset.text = full;
      if (RM) { tw.textContent = full; win.classList.add('is-done'); }
      else {
        let n = 0;
        const timer = setInterval(() => {
          n += 1; tw.textContent = full.slice(0, n);
          if (n >= full.length) { clearInterval(timer); win.classList.add('is-done'); }
        }, 38);
        win.addEventListener('click', (ev) => {
          if (ev.target.closest('a')) return;
          clearInterval(timer); tw.textContent = full; win.classList.add('is-done');
        });
      }
    }
  }

  /* ---------- ③ 菜单＝一条竖着的星座 ---------- */
  const wrapM = $('.menuw'), cst = $('.menu__cst');
  if (!wrapM || !cst) return;
  const drawCst = () => {
    const boxR = wrapM.getBoundingClientRect();
    const pts = $$('.menu .menu__i').map((el, i) => {
      const r = el.getBoundingClientRect();
      return [8 + (i % 2) * 7, r.top - boxR.top + r.height / 2];
    });
    if (!pts.length) return;
    const h = Math.ceil(boxR.height);
    cst.setAttribute('viewBox', `0 0 24 ${h}`);
    cst.setAttribute('height', h);
    cst.innerHTML = `<polyline class="menu__ln" points="${pts.map((p) => p.join(',')).join(' ')}"/>`
      + pts.map((p, i) => `<g class="menu__st" data-i="${i}" transform="translate(${p[0]} ${p[1]})">`
        + '<circle r="9" class="menu__halo"/><circle r="2.6"/>'
        + '<path d="M0-7c.4 3.6 1.6 4.8 7 7-5.4 2.2-6.6 3.4-7 7-.4-3.6-1.6-4.8-7-7 5.4-2.2 6.6-3.4 7-7z" class="menu__gl"/></g>').join('');
  };
  drawCst();
  addEventListener('resize', drawCst);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawCst);

  const lit = (i) => $$('.menu__st', cst).forEach((g) => g.classList.toggle('is-on', +g.dataset.i === i));
  $$('.menu .menu__i').forEach((el, i) => {
    el.addEventListener('pointerenter', () => lit(i));
    el.addEventListener('focus', () => lit(i));
  });
  const menu = $('.menu');
  if (!menu) return;
  menu.addEventListener('pointerleave', () => lit(-1));
  /* ↑↓ 在选项之间移动（galgame 标题画面的手感），Enter 原生就能触发 */
  menu.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    const l = $$('.menu a.menu__i'), i = l.indexOf(document.activeElement);
    if (i < 0) return;
    ev.preventDefault();
    l[(i + (ev.key === 'ArrowDown' ? 1 : l.length - 1)) % l.length].focus();
  });
})();
