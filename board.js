/* 星海社 · 板块浏览页（./forum/<大板块>-<子板块>/[页码/]）
   与首页各持一份小工具：两个页面不共享 JS 工具，避免为一个页面改动另一个。 */

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (n, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

/* ---------- 板块头 title：格子条 filmstrip ----------
   同 index.html 那份（各页不共享 JS，所以这里带一份）。格子条自带一道弧（v2p 自己的
   二次贝塞尔拱 + 悬停流星），本页头部另有一条更宽的 ARC_HEAD —— 两者不同尺度，一条贴着标题、
   一条罩住整个头部（还带星点与小行星），所以都留着。 */
const ARC_FS = `<svg class="fs__arc" viewBox="0 28 1200 28" preserveAspectRatio="none" aria-hidden="true">
      <path class="orbit__line" d="M2 56 Q600 6 1198 56" fill="none" stroke="currentColor" stroke-width="1.5"
            vector-effect="non-scaling-stroke" stroke-linecap="round"/>
    </svg>`;
const SPARKS = `<span class="fs__sparks" aria-hidden="true"><i class="fs__spark"></i><i class="fs__spark fs__spark--b"></i></span>`;

function filmstrip(name, hue) {
  const chars = [...name];
  const tiles = chars.map((ch, i) =>
    `<span class="fs__t${i === 0 ? ' fs__t--deep' : ''}" style="--i:${i + 1}" aria-hidden="true">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`
  ).join('');
  const deep = (i, inner, extra = '') =>
    `<span class="fs__t fs__t--deep${extra}" style="--i:${i}" aria-hidden="true">${inner}</span>`;
  return `<h1 class="fs" style="--hue:${hue};--n:${chars.length + 2}" aria-label="${esc(name)}">
    <svg class="fs__tel" viewBox="0 0 76 75" aria-hidden="true"><use href="#i-telescope"/></svg>
    <span class="fs__wrap">${ARC_FS}${SPARKS}<span class="fs__bar">
      ${deep(0, '<svg viewBox="0 0 40 40"><use href="#i-telescope-tile"/></svg>')}
      ${tiles}
      ${deep(chars.length + 1, '<svg viewBox="0 0 24 24"><use href="#i-stars4"/></svg>', ' fs__t--cap')}
    </span></span>
  </h1>`;
}

/* 作者名 → 稳定色相（与首页同一套散列，同一作者在不同页面颜色一致） */
const hueOf = (s) => [...s].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 360, 7);
/* 光变/封面的种子：标题 + 作者 ⇒ 同一条帖每次拿到同一张封面 */
const seedOf = (t) => [...(t.title + t.author)].reduce((a, c) => a + c.codePointAt(0), 0);

const COVER_DIR = './covers/';
const COVER_MAX_IDX = 2;                 // covers/ 只生成到帖下标 2，再往后自然回落到渐变
const PAGE_SIZE = { card: 20, list: 20 };
const KEY = { view: 'hoshikai:board-view', sort: 'hoshikai:board-sort' };
const SORTS = { latest: '最新回复', posted: '发帖时间', mag: '星等' };
/* 标签配色 TAG_HUE 现在只在 shared/threads.js 里定义一份（本页加载了它），这里不再抄 */

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 隐私模式下写不了，忽略 */ } },
};

/* ---------- URL 解析 ----------
   线上走重写：./forum/1-1/2/ → board.html?b=1-1&p=2，浏览器地址栏不变，
   所以 query 优先、pathname 兜底（直连 board.html?b=1-1&p=2 也能用）。 */
function readRoute() {
  const q = new URLSearchParams(location.search);
  let b = q.get('b') || '';
  let p = q.get('p') || '';
  if (!b) {
    const m = location.pathname.match(/\/forum\/(\d+-\d+)\/?(?:(\d+)\/?)?$/);
    if (m) { b = m[1]; p = p || m[2] || ''; }
  }
  const v = /^([1-3])-([1-4])$/.exec(b);
  return {
    b,
    bi: v ? +v[1] - 1 : -1,
    si: v ? +v[2] - 1 : -1,
    page: Math.max(1, parseInt(p, 10) || 1),
  };
}

const route = readRoute();
const board = route.bi >= 0 ? FORUM.boards[route.bi] : null;
const section = board ? board.sections[route.si] : null;

/* 视图与排序存 localStorage；值不合法时退回默认，避免存量数据把页面渲染成空白 */
let view = store.get(KEY.view);
if (!(view in PAGE_SIZE)) view = 'card';
let sort = store.get(KEY.sort);
if (!(sort in SORTS)) sort = 'latest';
let curPages = 1;

const pageURL = (n) => `./forum/${route.b}/${n > 1 ? n + '/' : ''}`;

/* ---------- 顶栏导航 · 星位 + 发丝线（同 app.js 的写法，三页各一份） ---------- */
const NAV_CROSS = '<svg viewBox="-8 -8 16 16" aria-hidden="true"><path d="M-5 0H5M0-5V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" vector-effect="non-scaling-stroke"/></svg>';
const NAV_STAR4 = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-stars4"/></svg>';
$('#nav').innerHTML = [
  `<a href="./"><i>${NAV_CROSS}</i>首页</a>`,
  ...FORUM.boards.map((b, i) =>
    `<a href="./forum/${i + 1}-1/"${i === route.bi ? ' aria-current="page"' : ''}><i>${i === route.bi ? NAV_STAR4 : NAV_CROSS}</i>${esc(b.title)}</a>`),
  `<a href="./space/1/"><i>${NAV_CROSS}</i>个人空间</a>`,
  `<a href="./msg/"><i>${NAV_CROSS}</i>消息</a>`,
  `<a href="./#recommend"><i>${NAV_CROSS}</i>推荐</a>`,
].join('');

/* ---------- 星等 ---------- */
function magBadge(t, extra = '') {
  const m = magnitude(t.replies, t.views);
  const glow = magnitudeGlow(m);
  return `<span class="mag${extra}" style="--glowAmt:${glow}" title="星等 ${m} 等 · 越小越亮">${icon('star')}<b>${m}</b>等</span>`;
}

/* ---------- 缩略图 ----------
   covers/ 只到帖下标 2（36 张，与 data.js 的三条真帖一一对应）。
   下标超出的帖不挂 <img>：让它直接落在渐变底上，既没有 404 也没有空洞。
   is-fallback 会补一层程序化星点，免得渐变太空。 */
function thumbHTML(t, hue, cls) {
  const hasCover = t.idx <= COVER_MAX_IDX;
  const img = hasCover
    ? `<img src="${COVER_DIR}${board.id}-${route.si}-${t.idx}.svg" alt="" loading="lazy" decoding="async">`
    : '';
  return `<span class="thumb ${cls}${hasCover ? '' : ' is-fallback'}" style="background:${coverGradient(seedOf(t), hue)}">${img}</span>`;
}

/* 封面加载失败时退回渐变（与首页同一套竞态处理） */
function hydrateThumbs(root) {
  root.querySelectorAll('.thumb img').forEach((img) => {
    const fallback = () => {
      const box = img.closest('.thumb');
      if (!box) return;
      box.classList.add('is-fallback');
      img.remove();
    };
    img.addEventListener('error', fallback, { once: true });
    if (img.complete && img.naturalWidth === 0) fallback();
  });
}

/* ---------- 日期 ---------- */
const isoOf = (mins) => new Date(Date.now() - mins * 60000).toISOString();
const timeHTML = (t, cls) => `<time class="${cls}" datetime="${isoOf(t.mins)}">${esc(t.date)}</time>`;

/* ---------- 本地发的帖（演示站没有后端） ----------
   发帖页把新帖存进本机 `hoshikai:posts`。这里只取**当前子板块**的，按时间倒序排在最前面。
   ⚠️ `idx: 999` 是刻意的，不是随便填的：`thumbHTML` 用 `idx <= COVER_MAX_IDX`（＝2）判断挂不挂真图，
      999 会自动落到站里的兜底封面 —— 不需要给本地帖单独写一条分支。
   ⚠️ 本地帖**不可点**（见 cardHTML）：详情页只认 shared/ 里的帖，点进去只会落到
      「没有找到这个帖子」。与其给条死路，不如在卡片上标「本地」并且不给链接。 */
const LOCAL_KEY = 'hoshikai:posts';
function localPosts() {
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (e) { return []; }
  if (!Array.isArray(arr)) return [];
  const mine = route.bi + '-' + route.si;
  return arr.filter((p) => p && p.key === mine)
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .map((p) => ({
      tid: p.tid,
      /* 本地帖一律 `idx: 999` → 落站里的兜底封面。发帖页已经**砍掉选题图**那一步
         （封面是内容系统自动的，不该由发帖的人挑），所以这里没有 coverIdx 可读了。 */
      idx: 999,
      local: true,
      title: p.title, author: p.author,
      date: '刚刚', mins: 0, postedMins: 0,
      replies: 0, views: 0, hot: false,
      tags: p.tags, excerpt: String(p.body || '').slice(0, 70),
    }));
}

/* ---------- 卡片视图 ---------- */
function cardHTML(t, i) {
  const th = TAG_HUE[t.tags[0]] ?? 218;
  // 闪烁参数由标题推出：同一帖每次同一节奏，各帖互不相同
  const k = hueOf(t.title) / 360;
  /* 本地帖用 `<div class="tc__link">` 而不是 `<a>`，并且**不给** `--tw/--twd`
     （那是封面的呼吸动画，本地帖没有真封面，让它安静待着）。 */
  const open = t.local ? '<div class="tc__link">' : `<a class="tc__link" href="./topic/${t.tid}/">`;
  const close = t.local ? '</div>' : '</a>';
  const style = t.local ? `--i:${i}` : `--i:${i};--tw:${(5 + k * 4).toFixed(2)}s;--twd:${(-k * 7).toFixed(2)}s`;
  return `<article class="tc${t.local ? ' tc--local' : ''}" style="${style}">
  ${open}
    <span class="tc__cover">
      ${thumbHTML(t, board.hue, 'tc__thumb')}
      <span class="tc__chips">
        <span class="tag" style="--th:${th}">${esc(t.tags[0])}</span>
        ${t.local ? '<span class="badge">本地</span>' : (t.hot ? '<span class="badge">热</span>' : '')}
      </span>
      <span class="tc__mag">${magBadge(t)}</span>
    </span>
    <h3 class="tc__t">${esc(t.title)}</h3>
    <span class="tc__foot">
      <span class="av av--sm" style="--ah:${hueOf(t.author)}" aria-hidden="true">${esc([...t.author][0])}</span>
      <b class="by tc__by">${esc(t.author)}</b>
      ${timeHTML(t, 'tc__date')}
      <span class="pull">${icon('reply')}${t.replies}</span>
    </span>
  ${close}
</article>`;
}

/* ---------- 列表视图（首条略作突出）---------- */
function listHTML(t, i) {
  const th = TAG_HUE[t.tags[0]] ?? 218;
  const lead = i === 0;
  /* 同卡片视图：本地帖不给链接（详情页里没有它），用 div 保住那块外框的样式。 */
  return `<li class="tl${lead ? ' tl--lead' : ''}${t.local ? ' tl--local' : ''}" style="--i:${i}">
  ${t.local ? '<div class="tl__link">' : `<a class="tl__link" href="./topic/${t.tid}/">`}
    ${thumbHTML(t, board.hue, 'tl__thumb')}
    <span class="tl__body">
      <span class="tl__head">
        ${lead ? '<span class="tl__new">最新</span>' : ''}
        <h3 class="tl__t">${esc(t.title)}</h3>
      </span>
      <span class="tl__x">${esc(t.excerpt)}</span>
      <span class="tl__m">
        <span class="av av--sm" style="--ah:${hueOf(t.author)}" aria-hidden="true">${esc([...t.author][0])}</span>
        <b class="by">${esc(t.author)}</b>
        <i aria-hidden="true">·</i>
        ${timeHTML(t, 'tl__time')}
        <i aria-hidden="true">·</i>
        <span class="tag tag--sm" style="--th:${th}">${esc(t.tags[0])}</span>
        <span class="pull">${icon('reply')}${t.replies}</span>
        <span class="pull">${icon('eye')}${t.views.toLocaleString()}</span>
        ${magBadge(t)}
      </span>
    </span>
  ${t.local ? '</div>' : '</a>'}
</li>`;
}

/* ---------- 空态 ---------- */
const emptyHTML = `<div class="empty">
  <span class="empty__mark" aria-hidden="true">${icon('orbit')}</span>
  <p class="empty__t">这个板块还没有帖子</p>
  <p class="empty__d">开第一帖，把它点亮 —— 第一颗星总是从没有人写的地方开始的。</p>
  <a class="btn btn--solid" href="#">开第一帖</a>
</div>`;

/* ---------- 分页 ---------- */
function paginationHTML(pages, page) {
  if (pages <= 1) return '';
  const nums = [...new Set([1, 2, page - 1, page, page + 1, pages - 1, pages])]
    .filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const items = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) items.push('<li class="pg__gap" aria-hidden="true">…</li>');
    items.push(n === page
      ? `<li><a class="pg__n" href="${pageURL(n)}" aria-current="page" aria-label="第 ${n} 页，当前页">${n}</a></li>`
      : `<li><a class="pg__n" href="${pageURL(n)}" aria-label="第 ${n} 页">${n}</a></li>`);
  });
  const chev = '<svg class="i pg__chev" aria-hidden="true"><use href="#i-chevron"/></svg>';
  const prev = page > 1
    ? `<a class="pg__step" href="${pageURL(page - 1)}" rel="prev">${chev}上一页</a>`
    : `<span class="pg__step is-off" aria-disabled="true">${chev}上一页</span>`;
  const next = page < pages
    ? `<a class="pg__step pg__step--next" href="${pageURL(page + 1)}" rel="next">下一页${chev}</a>`
    : `<span class="pg__step pg__step--next is-off" aria-disabled="true">下一页${chev}</span>`;
  return `<div class="pg__row">
    ${prev}
    <ol class="pg__list">${items.join('')}</ol>
    ${next}
    <form class="pg__jump" id="pgJump" aria-label="跳转到指定页">
      <label for="pgIn">跳至</label>
      <input id="pgIn" type="number" min="1" max="${pages}" step="1" inputmode="numeric"
             value="${page}" aria-label="跳转到第几页">
      <span class="pg__of">/ ${pages} 页</span>
      <button class="pg__go" type="submit">跳转</button>
    </form>
  </div>`;
}

/* ---------- 排序 ----------
   显式带 idx 兜底：同一分钟内的多条帖也不能因为引擎差异而换序。 */
const CMP = {  latest: (a, b) => a.mins - b.mins || a.idx - b.idx,
  posted: (a, b) => a.postedMins - b.postedMins || a.idx - b.idx,
  mag: (a, b) => magnitude(a.replies, a.views) - magnitude(b.replies, b.views) || a.idx - b.idx,
};

/* ---------- 轨道系统 ----------
   海报墙上方的辅助弧（标题上方那条主弧已随版块头换成 v3p 的 bh：星盘 + 底部色相短线）。

   列数由 auto-fill 决定，所以窄屏塌成 2 列时星点自然变 2 个，不用写分支。
   viewBox 宽度取实测像素宽（1:1）：之前用固定 1000 宽 + preserveAspectRatio 时
   该属性没生效，星点与列错位了约 20%。 */
const ARC_GRID = `<svg class="orbit orbit--grid" viewBox="0 0 1200 46" aria-hidden="true">
      <path class="orbit__line" d="M2 43 Q600 -12 1198 43" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

const SVGNS = 'http://www.w3.org/2000/svg';

/* 大轨道（2026-11-06 换成 v3p 的版本）：
   弧横跨**整个栅格宽度**，星点落在**第一排卡片的实测中心**上。
   v2p 旧版是按 `gridTemplateColumns` 反算列中心 —— 卡片跨列、auto-fill 取整时就会错位；
   v3p 的做法是量真实元素，永远对得上。 */
function drawArc(svg, opts) {
  if (!svg || !opts.host) return;
  const host = opts.host;
  const hr = host.getBoundingClientRect();
  if (!hr.width) return;
  const W = Math.round(hr.width), H = 46, BASE = 40, APEX = -28;
  const yAt = (x) => BASE - (BASE - APEX) * 2 * (x / W) * (1 - x / W);
  const d = `M0 ${BASE} Q${(W / 2).toFixed(1)} ${APEX} ${W} ${BASE}`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  const line = svg.querySelector('.orbit__line');
  if (line) line.setAttribute('d', d);
  svg.querySelectorAll('.orbit__spark, .orbit__planet').forEach((n) => n.remove());

  /* 星点位置：
     · 卡片视图：**栅格各列的中心**（和首页同一套 —— 卡片跨列时按卡片算会变少）
     · 列表视图：第一条 .tl__link 的两个单元格（缩略图 / 正文） */
  let xs = [];
  if (opts.list) {
    const first = host.querySelector('.tl__link') || host.querySelector('.tl');
    if (first) xs = [...first.children].map((k) => { const r = k.getBoundingClientRect(); return r.left + r.width / 2 - hr.left; });
  } else {
    const csG = getComputedStyle(host);
    const cols = csG.gridTemplateColumns.split(' ').map(parseFloat).filter((n) => !isNaN(n));
    const gap = parseFloat(csG.columnGap) || 0;
    if (cols.length >= 2) { let acc = 0; cols.forEach((w) => { xs.push(acc + w / 2); acc += w + gap; }); }
  }
  xs.forEach((x, i) => {
    if (x < 0 || x > W) return;
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'orbit__spark');
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${yAt(x).toFixed(1)})`);
    g.style.transitionDelay = `${(0.32 + i * 0.07).toFixed(2)}s`;
    g.innerHTML = '<path d="M-5 0H5M0 -5V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
    svg.appendChild(g);
  });

  // 小行星：SMIL 无法用 CSS 关掉，所以只在允许动效时才注入
  if (!opts.reduce) {
    const p = document.createElementNS(SVGNS, 'g');
    p.setAttribute('class', 'orbit__planet');
    p.setAttribute('opacity', '.7');
    p.innerHTML = `<animateMotion dur="30s" repeatCount="indefinite" path="${d}"/><circle r="2.4" fill="currentColor"/>`;
    svg.appendChild(p);
  }
}

/* 画两条弧并把「描线 / 依次点亮」触发一次。resize 只重画，不重放动画。 */
let entrancePlayed = false;   /* 只有首次渲染播完整入场；翻页 / 切视图瞬时显示 */
function paintOrbits() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const grid = document.querySelector('.tgrid'), listEl = document.querySelector('.tlist');
  const svg = document.querySelector('.orbit--grid');
  if (svg && (grid || listEl)) drawArc(svg, { reduce, host: grid || listEl, list: !grid });
  const wrap = document.querySelector('.tgridwrap');
  const first = !entrancePlayed;
  /* 分页是**真实导航**（`<a href>`），每次翻页都重新执行本文件 —— 第 2 页起不该再空等 1s。
     首屏（第 1 页首次渲染）给完整「三段式」：轨道扫开 → 星点点亮 → 卡片从弧下抬起；
     翻页只给 0.25s 的快速错峰，仍排在轨道起步之后，但不等它扫完。 */
  const base = (first && route.page === 1) ? 1.0 : 0.25;
  /* ⚠️ 首次渲染要等一帧再挂类（过渡才有 from 态可插值）；后续渲染**同步**挂类 ——
     元素刚插入、样式还没算过，浏览器不会为它跑过渡，直接落在终态。 */
  const apply = () => {
    if (wrap) wrap.classList.add('is-drawn');
    if (grid) {
      // --dl 先落位再加 is-lit：类一加上动画就创建了，delay 必须在那之前就位
      const cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
      [...grid.querySelectorAll('.tc')].forEach((c, i) => {
        if (c.style.getPropertyValue('--dl')) return;   // resize 复用同一批节点：别改已跑完动画的相位
        const row = Math.floor(i / cols), col = i % cols;
        c.style.setProperty('--dl', (base + row * 0.08 + col * 0.04).toFixed(2) + 's');
      });
      grid.classList.add('is-lit');
    }
    /* 列表式也要点亮 —— 之前只有卡片网格有 is-lit，切到列表就成了一条条「啪」地出现 */
    const list = document.querySelector('.tlist');
    if (list) {
      // 列表式顺序点亮：每条间隔 0.026s（与旧的 calc 26ms 一致）
      [...list.querySelectorAll('.tl')].forEach((tl, i) => {
        if (tl.style.getPropertyValue('--dl')) return;
        tl.style.setProperty('--dl', (base + i * 0.026).toFixed(3) + 's');
      });
      list.classList.add('is-lit');
    }
    entrancePlayed = true;
  };
  if (first) requestAnimationFrame(apply);
  else apply();
}

let orbitRT;
addEventListener('resize', () => { clearTimeout(orbitRT); orbitRT = setTimeout(paintOrbits, 160); });

/* ---------- 渲染 ---------- */
function render() {
  const all = boardThreads(route.bi, route.si, THREAD_POOL_SIZE);
  /* 本地帖插在**排好序的最前面**：刚发的就该在最上面，不跟 CMP 的语义纠缠。 */
  const rows = localPosts().concat(all.slice().sort(CMP[sort]));
  const size = PAGE_SIZE[view];
  curPages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(route.page, curPages);
  const slice = rows.slice((page - 1) * size, page * size);

  const host = $('#topics');
  host.dataset.view = view;
  /* 两种视图都带大轨道（2026-11-06：用户「版块浏览帖子时的大轨道呢」= 切到列表视图后它没了） */
  host.innerHTML = slice.length
    ? (view === 'card'
      ? `<div class="tgridwrap">${ARC_GRID}<div class="tgrid">${slice.map(cardHTML).join('')}</div></div>`
      : `<div class="tgridwrap">${ARC_GRID}<ol class="tlist">${slice.map(listHTML).join('')}</ol></div>`)
    : emptyHTML;

  $('#pg').innerHTML = paginationHTML(curPages, page);
  $('#count').textContent = `共 ${rows.length} 帖 · 第 ${page} / ${curPages} 页`;
  document.documentElement.dataset.boardPage = String(page);
  /* 「发新帖」把当前子板块带过去，发帖页就不用再让人选一遍。
     ⚠️ 用 `route.b`（URL 形态、1 基，如 `1-1`），**不是** `route.bi/route.si`（0 基）——
        后端那个正则只认 `[1-3]-[1-4]`，拼成 `0-0` 会被当成非法值退回默认板块。 */
  const nt = $('#newTopic');
  if (nt && route.bi >= 0) nt.href = './compose/?b=' + route.b;
  hydrateThumbs(host);
  paintOrbits();
  /* 赫罗图跟着「本页显示哪些帖」一起变：亮的那批就是这一页 */
  hrDraw(rows, new Set(slice.map((t) => t.tid)));

  const jump = $('#pgJump');
  if (jump) {
    jump.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = parseInt($('#pgIn').value, 10);
      const n = Math.min(Math.max(1, Number.isFinite(v) ? v : 1), curPages);
      if (n === page) return;
      location.href = pageURL(n);
    });
  }
}

/* ---------- 板块头（2026-11-06 从 v3p 的 <header class="bh"> 搬来）----------
   左：区码 → **本站的格子条 + 望远镜**（标题）→ 副题；右：四个读数；背景压一只星盘。
   与 v3p 的差别只有一处：v3p 的 h1 是大字，这里保留 v2p 的 filmstrip —— 其余按 bh 抄。 */
function bhDialHTML() {
  const t = (r1, n, step, longEvery) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = i * step * Math.PI / 180;
      const rr = i % longEvery ? r1 - 8 : r1 - 20;
      s += `<line x1="${(300 + r1 * Math.cos(a)).toFixed(1)}" y1="${(300 + r1 * Math.sin(a)).toFixed(1)}"`
        + ` x2="${(300 + rr * Math.cos(a)).toFixed(1)}" y2="${(300 + rr * Math.sin(a)).toFixed(1)}"/>`;
    }
    return s;
  };
  const hours = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 - 90) * Math.PI / 180;
    return `<text x="${(300 + 252 * Math.cos(a)).toFixed(1)}" y="${(304 + 252 * Math.sin(a)).toFixed(1)}">${i * 2}h</text>`;
  }).join('');
  return `<svg class="bhd" viewBox="0 0 600 600" aria-hidden="true">
    <g class="bhd__o"><circle cx="300" cy="300" r="290"/><g class="bhd__t">${t(290, 72, 5, 6)}</g><g class="bhd__h">${hours}</g></g>
    <g class="bhd__i"><circle class="bhd__dash" cx="300" cy="300" r="214"/><circle cx="300" cy="300" r="150"/>
      <g class="bhd__t">${t(214, 24, 15, 3)}</g>
      <path class="bhd__pt" d="M300 86 l6 14 -6 -4 -6 4z"/></g>
    <ellipse class="bhd__ec" cx="300" cy="300" rx="270" ry="96" transform="rotate(-23.4 300 300)"/>
  </svg>`;
}

function renderHead() {
  $('#board').style.setProperty('--hue', board.hue);
  $('#board').setAttribute('aria-label', `${board.title} · ${board.subtitle} · ${section.title}`);
  const es = boardThreads(route.bi, route.si, THREAD_POOL_SIZE);
  const ms = es.map((t) => magnitude(t.replies, t.views)).sort((a, b) => a - b);
  const live = es.filter((t) => t.mins < 1440).length;
  const authors = new Set(es.map((t) => t.author)).size;
  const code = `${String(route.bi + 1).padStart(2, '0')}-${String(route.si + 1).padStart(2, '0')}`;

  $('#board').innerHTML = `
  <header class="bh">
    ${bhDialHTML()}
    <div class="bh__lead">
      <p class="bh__code"><span>SECTOR ${code}</span><span>${esc(board.title)} · ${esc(board.subtitle)}</span></p>
      ${filmstrip(section.title, board.hue)}
      <p class="bh__sub">${esc(section.subtitle)} · “${esc(board.quote)}”</p>
    </div>
    <dl class="bh__st">
      <div><dt>在册</dt><dd>${es.length}<small>帖</small></dd></div>
      <div><dt>今日有回复</dt><dd>${live}<small>帖</small></dd></div>
      <div><dt>中位星等</dt><dd>${ms[Math.floor(ms.length / 2)].toFixed(1)}<small>等</small></dd></div>
      <div><dt>发言者</dt><dd>${authors}<small>人</small></dd></div>
    </dl>
  </header>
  <!-- 子板块切换：顶部导航负责换大板块，这条负责换子板块 —— 12 个板块页互相可达。
       2026-11-06 用户：「版块切换放工具栏不好看」+「把它上面的小轨道删了」⇒ 回到版块头下方的独立一行，不带轨道。 -->
  <nav class="subtabs chaprow" aria-label="${esc(board.title)} 的子板块">
    ${board.sections.map((s, i) => `
      <a class="subtabs__t${i === route.si ? ' is-on' : ''}" href="./forum/${route.bi + 1}-${i + 1}/"
         ${i === route.si ? 'aria-current="page"' : ''}>${i === route.si ? icon('star') : ''}${esc(s.title)}</a>`).join('')}
  </nav>
  <section class="hr" id="hr" aria-labelledby="hrT">
    <div class="hr__h"><h2 id="hrT">本区赫罗图</h2><p>横轴 ＝ 最后一条回复距今（对数尺，越右越新）· 纵轴 ＝ 星等（越上越亮）· 点的大小 ＝ 回复数。亮着的是这一页的帖子，暗的是本区其余帖子。</p></div>
    <div class="hr__plot" id="hrPlot"></div>
  </section>`;

  $('#crumb').innerHTML = `
    <a href="./">首页</a>
    <span class="crumb__sep" aria-hidden="true">›</span>
    <a href="./forum/${route.bi + 1}-1/">${esc(board.title)}</a>
    <span class="crumb__sep" aria-hidden="true">›</span>
    <span class="crumb__cur" aria-current="page">${esc(section.title)}</span>`;

  /* 格子条自带的那条小弧靠 `.is-drawn` 描进来（`.js .orbit__line` 默认 dashoffset 1400 = 看不见）。
     ⚠️ 这个类原来挂在旧版块头上；换 bh 之后我把它一起删了 —— 小弧就只剩一条 1400 的虚影，
        用户 2026-11-06：「格子条上面的小轨道呢，怎么没了」。补回在 .bh 上。 */
  const bhEl = $('#board .bh');
  const drawFs = () => { if (bhEl) bhEl.classList.add('is-drawn'); };
  requestAnimationFrame(drawFs);
  setTimeout(drawFs, 200);   /* 后台标签页 rAF 会被节流，兜一次 */

  document.title = `${section.title} · ${board.title} · 星海社`;
}

/* ---------- 本区赫罗图（v3p 的 hrPlot 原样搬）----------
   横轴 ＝ 最后一条回复距今（对数尺，越右越新）· 纵轴 ＝ 星等（越上越亮）· 点大小 ＝ 回复数。
   viewBox 取实测像素宽（1:1，不拉伸 —— 站里的老规矩），容器一变就重画。 */
let hrIO = null;
function hrDraw(rows, shownSet) {
  const box = $('#hrPlot'), hr = $('#hr');
  if (!box) return;
  const es = rows && rows.length ? rows : [];
  if (!es.length) { box.innerHTML = ''; return; }
  const MAXM = Math.max(...es.map((t) => t.mins), 60);
  const lx = (m) => Math.log1p(m) / Math.log1p(MAXM);
  const xTicks = [[60, '1 小时'], [1440, '1 天'], [10080, '7 天'], [43200, '30 天']].filter(([m]) => m < MAXM);
  const W = Math.max(280, box.clientWidth), H = W < 600 ? 220 : 260;
  const L = 46, R = 14, T = 18, B = 34;
  const X = (m) => L + (1 - lx(m)) * (W - L - R);
  const Y = (mag) => T + (mag - .5) / 6.2 * (H - T - B);
  const dots = es.slice().sort((a, b) => shownSet.has(a.tid) - shownSet.has(b.tid)).map((t) => {
    const m = magnitude(t.replies, t.views), on = shownSet.has(t.tid);
    return `<circle class="hr__d${on ? ' is-on' : ''}${m <= 1.2 ? ' is-warm' : ''}"`
      + ` style="--dl:${((1 - X(t.mins) / W) * 1.2).toFixed(2)}s" data-tid="${esc(t.tid)}"`
      + ` cx="${X(t.mins).toFixed(1)}" cy="${Y(m).toFixed(1)}" r="${(2 + Math.sqrt(t.replies) * .42).toFixed(1)}"/>`;
  }).join('');
  box.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="本区 ${es.length} 帖的赫罗图">
    <rect class="hr__warm" x="${L}" y="${T}" width="${W - L - R}" height="${(Y(1.2) - T).toFixed(1)}"/>
    <g class="hr__g">${[1, 2, 3, 4, 5, 6].map((m) => `<line x1="${L}" x2="${W - R}" y1="${Y(m).toFixed(1)}" y2="${Y(m).toFixed(1)}"/><text x="${L - 8}" y="${(Y(m) + 4).toFixed(1)}" text-anchor="end">${m}</text>`).join('')}
      ${xTicks.map(([m, t]) => `<line x1="${X(m).toFixed(1)}" x2="${X(m).toFixed(1)}" y1="${T}" y2="${H - B}"/><text x="${X(m).toFixed(1)}" y="${H - B + 18}" text-anchor="middle">${t}</text>`).join('')}
      <text x="${W - R}" y="${H - B + 18}" text-anchor="end">此刻</text><text x="${L - 8}" y="${T - 2}" text-anchor="end">等</text></g>
    <g>${dots}</g><line class="hr__scan" style="--sw:${W - R - L}px" x1="${W - R}" x2="${W - R}" y1="${T}" y2="${H - B}"/></svg><div class="ch__tip" hidden></div>`;

  /* 进场：亮的星从「此刻」那一侧依次落下，扫描线从右扫到左（只播一次） */
  if (!hr.classList.contains('is-live')) {
    hr.classList.add('is-live');
    if (hrIO) hrIO.disconnect();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      hr.classList.add('is-in');
    } else {
      hrIO = new IntersectionObserver((ents) => ents.forEach((en) => {
        if (en.isIntersecting) { hr.classList.add('is-in'); hrIO.disconnect(); }
      }), { rootMargin: '0px 0px -8% 0px' });
      hrIO.observe(hr);
    }
  }

  const byTid = new Map(es.map((t) => [t.tid, t]));
  const tip = $('.ch__tip', box);
  const hl = (tid, on) => box.querySelectorAll(`.hr__d[data-tid="${tid}"]`).forEach((n) => n.classList.toggle('is-hl', on));
  box.onpointermove = (ev) => {
    const d = ev.target.closest('.hr__d');
    box.querySelectorAll('.hr__d.is-hl').forEach((n) => n.classList.remove('is-hl'));
    if (!d) { tip.hidden = true; box.style.cursor = ''; return; }
    const t = byTid.get(d.dataset.tid);
    hl(t.tid, true); box.style.cursor = 'pointer';
    tip.innerHTML = `<b>${esc(t.title)}</b><span>${magnitude(t.replies, t.views).toFixed(1)} 等 · ${t.replies} 回 · ${relTime(t.mins)}${shownSet.has(t.tid) ? '' : ' · 不在本页'}</span>`;
    tip.hidden = false;
    const r = box.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    tip.style.left = Math.max(4, Math.min(x + 14, r.width - tip.offsetWidth - 4)) + 'px';
    tip.style.top = (y > r.height / 2 ? y - tip.offsetHeight - 12 : y + 16) + 'px';
  };
  box.onpointerleave = () => { box.querySelectorAll('.hr__d.is-hl').forEach((n) => n.classList.remove('is-hl')); tip.hidden = true; };
  box.onclick = (ev) => { const d = ev.target.closest('.hr__d'); if (d) location.href = './topic/' + d.dataset.tid + '/'; };

  /* 反方向：指着列表里的一行，图上那颗星被圈出来（只绑一次） */
  const list = $('#topics');
  if (list && !list.__hrBound) {
    list.__hrBound = 1;
    list.addEventListener('pointerover', (ev) => {
      const row = ev.target.closest('[data-tid]');
      const b = $('#hrPlot'); if (!b) return;
      b.querySelectorAll('.hr__d.is-hl').forEach((n) => n.classList.remove('is-hl'));
      if (row) b.querySelectorAll(`.hr__d[data-tid="${row.dataset.tid}"]`).forEach((n) => n.classList.add('is-hl'));
    });
    list.addEventListener('pointerleave', () => {
      const b = $('#hrPlot'); if (b) b.querySelectorAll('.hr__d.is-hl').forEach((n) => n.classList.remove('is-hl'));
    });
  }

  let w0 = box.clientWidth;
  if (box.__hrRO) box.__hrRO.disconnect();
  box.__hrRO = new ResizeObserver(() => {
    if (Math.abs(box.clientWidth - w0) > 2) { w0 = box.clientWidth; hrDraw(rows, shownSet); }
  });
  box.__hrRO.observe(box);
}

/* ---------- 启动 ---------- */
if (!board || !section) {
  renderMissing();
} else {
  renderHead();

  const vCard = $('#vCard'), vList = $('#vList'), sel = $('#sortSel');
  const syncBar = () => {
    vCard.setAttribute('aria-pressed', String(view === 'card'));
    vList.setAttribute('aria-pressed', String(view === 'list'));
    sel.value = sort;
  };
  const setView = (v) => {
    if (v === view) return;
    view = v;
    store.set(KEY.view, v);
    syncBar();
    render();
    $('#board').scrollIntoView({ block: 'nearest', behavior: 'auto' });
  };

  vCard.addEventListener('click', () => setView('card'));
  vList.addEventListener('click', () => setView('list'));
  sel.addEventListener('change', () => {
    sort = sel.value in SORTS ? sel.value : 'latest';
    store.set(KEY.sort, sort);
    render();
  });

  syncBar();
  render();
}

/* 探针口子：`window.__BOARD`。
   「本地帖进列表」只有**重渲一次**才看得见效果，没有这个口子，探针就只能「真发一次再跳页」——
   而 CDP 那边拿不到跨页的返回值。与 `__MSG` / `__SEARCH` 同一做法：只读 + render，
   不暴露任何能改状态的写口。 */
window.__BOARD = { render, localPosts, route, view: () => view, sort: () => sort };
