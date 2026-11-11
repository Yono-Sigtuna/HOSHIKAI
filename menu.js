/* 星海社 · 顶栏「论坛 ▾」下拉（把三个天区收进一个入口）
   ==================================================================
   用户 2026-11-02：从下拉原型里选定「星图窗 · 下划线」那一版，采用。

   做法是**运行时接管**：本文件在页面自己的脚本之后加载，把 `#nav` 里那三个天区链接
   （`./forum/X-1/`、首页的 `#board-N`）换成**一个**「论坛 ▾」入口 + 一块星图面板。
   ⇒ 十四个页面不需要各改一遍 HTML，只在末尾多两行 include。

   面板走站里观测窗的皮：52px 经纬网 + 板底；行与行差 4% 墨色；
   hover 只在**名字下方长一条金发丝线**（用户选的那一版），整行底不动。 */
(function navMenu() {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const F = (typeof FORUM !== 'undefined' && FORUM) || window.FORUM;
  const nav = $('#nav');
  if (!F || !nav) return;

  /* ── 找到那三个天区链接（首页是页内锚点，其余页是真路径）── */
  const links = [].slice.call(nav.querySelectorAll('a'));
  const isBoard = (a) => {
    const h = a.getAttribute('href') || '';
    return /^(?:\.\/|\/)?forum\/\d+-\d+\/$/.test(h) || /^(?:\.\/)?#board-\d+$/.test(h);
  };
  const board = links.filter(isBoard);
  if (board.length < 2) return;                    /* 结构不对就什么都不做，别硬塞 */

  const wasCurrent = board.some((a) => a.hasAttribute('aria-current'));
  const anchor = board[0];
  const parent = anchor.parentNode;

  /* ── 触发器：包一层 span 好把面板定位在上面；里面仍是 <a>，这样 `.nav a` 的样式与
        hud.js 的罗盘（它数 `#nav a`）都照常工作 ── */
  const CROSS = '<svg viewBox="-8 -8 16 16" aria-hidden="true"><path d="M-5 0H5M0-5V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" vector-effect="non-scaling-stroke"/></svg>';
  const STAR4 = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg>';
  const wrap = document.createElement('span');
  wrap.className = 'nav-drop';
  wrap.innerHTML = '<a class="nav__trig" href="./forum/1-1/"'
    + (wasCurrent ? ' aria-current="page"' : '')
    + ' aria-haspopup="true" aria-expanded="false" aria-controls="navPanel">'
    + '<i>' + (wasCurrent ? STAR4 : CROSS) + '</i>论坛'
    + '<svg class="nav__car" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></a>';

  parent.insertBefore(wrap, anchor);
  board.forEach((a) => a.remove());

  /* ⚠️ 面板**挂在 body 上**，不在 `#nav` 里：
       hud.js 的罗盘用 `#nav a` 数「有哪几站」，面板里 12 个链接会被它当成导航项。
       挂在 body 之后用 fixed 定位跟着触发器走，顺带绕开顶栏的粘性/层叠。 */
  const panel = document.createElement('div');
  panel.className = 'nav__panel';
  panel.id = 'navPanel';
  panel.hidden = true;
  document.body.appendChild(panel);
  panel.innerHTML = '<p class="nav__top">十二天区 · 按象限分</p><div class="nav__cols">'
    + F.boards.map((b, bi) => '<section class="nav__col" style="--bh:' + b.hue + '">'
      + '<p class="nav__hd"><span class="nav__star" aria-hidden="true"></span>' + esc(b.title)
      + '<i>' + b.sections.length + '</i></p><ul>'
      + b.sections.map((s, si) => '<li><a class="nav__a" href="./forum/' + (bi + 1) + '-' + (si + 1) + '/">'
        + '<b>' + esc(s.title) + '</b><span>' + esc(s.subtitle) + '</span></a></li>').join('')
      + '</ul></section>').join('')
    + '</div>';

  const trig = $('.nav__trig', wrap);
  function place() {
    const r = trig.getBoundingClientRect();
    const w = panel.offsetWidth || 800;
    const left = Math.min(Math.max(12, r.left - 30), Math.max(12, innerWidth - w - 12));
    panel.style.left = Math.round(left) + 'px';
    /* 顶栏是粘性的、触发器贴在栏内底部：面板要落在**整条顶栏**下面，
       否则会压住那条金色收口线，看着像挂在栏上而不是从栏里翻下来 */
    const bar = document.querySelector('.topbar');
    const floor = bar ? bar.getBoundingClientRect().bottom : r.bottom;
    panel.style.top = Math.round(Math.max(r.bottom, floor) + 8) + 'px';
  }
  function open() {
    panel.hidden = false;
    place();
    trig.setAttribute('aria-expanded', 'true');
    wrap.classList.add('is-open');
  }
  function close() {
    panel.hidden = true;
    trig.setAttribute('aria-expanded', 'false');
    wrap.classList.remove('is-open');
  }

  trig.addEventListener('click', (e) => {
    /* 点入口只开合面板；要去论坛就点面板里的条目（否则「点一下就跳走」很难用） */
    if (trig.getAttribute('href')) e.preventDefault();
    if (panel.hidden) open(); else close();
  });
  trig.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && panel.hidden) { e.preventDefault(); open(); }
  });
  /* ── 开合：入口和面板是**两棵树**（面板挂在 body 上），鼠标从入口挪进面板时
        会先触发入口的 mouseleave。所以关闭做成一个可以取消的计时器，面板进来就取消；
        真到点时再确认一次「指针是否还在两者之内」，否则 8px 的缝会把窗关掉。 */
  function isHot() {
    return wrap.matches(':hover') || panel.matches(':hover')
      || wrap.contains(document.activeElement) || panel.contains(document.activeElement);
  }
  function scheduleClose() {
    clearTimeout(wrap._t);
    wrap._t = setTimeout(() => { if (!isHot()) close(); }, 220);
  }
  function cancelClose() { clearTimeout(wrap._t); }

  wrap.addEventListener('mouseenter', () => { cancelClose(); open(); });
  wrap.addEventListener('mouseleave', scheduleClose);
  panel.addEventListener('mouseenter', cancelClose);
  panel.addEventListener('mouseleave', scheduleClose);
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target) && !panel.contains(e.target)) close(); });
  window.addEventListener('resize', () => { if (!panel.hidden) place(); });
  window.addEventListener('scroll', () => { if (!panel.hidden) close(); }, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { close(); trig.focus(); }
  });
})();
