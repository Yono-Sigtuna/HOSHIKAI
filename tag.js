/* 星海社 · 标签归档页（./tag/<标签>/[页码/] 与 ./tag/）
   ------------------------------------------------------------------
   一个标签横穿十二个子板块 —— 这是它和板块页唯一的区别，也是这页存在的理由：
   板块页回答「这个板块里有什么」，标签页回答「同一条线索散落在哪些地方」。

   天文不另造：格子条 + 星团分布（三簇，每簇四颗，星点大小＝该子板块的帖数）
   + 站里的星等徽章与封面。分布图形是**真数据**，不是装饰图。

   与板块页各持一份小工具（站里惯例：页面之间不共享 JS 工具）。 */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (n, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

const ARC_FS = `<svg class="fs__arc" viewBox="0 28 1200 28" preserveAspectRatio="none" aria-hidden="true">
      <path class="orbit__line" d="M2 56 Q600 6 1198 56" fill="none" stroke="currentColor" stroke-width="1.5"
            vector-effect="non-scaling-stroke" stroke-linecap="round"/>
    </svg>`;
const SPARKS = `<span class="fs__sparks" aria-hidden="true"><i class="fs__spark"></i><i class="fs__spark fs__spark--b"></i></span>`;

function filmstrip(name, hue) {
  const chars = [...String(name)];
  const tiles = chars.map((ch, i) =>
    `<span class="fs__t${i === 0 ? ' fs__t--deep' : ''}" style="--i:${i + 1}" aria-hidden="true">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`
  ).join('');
  const deep = (i, inner, extra = '') =>
    `<span class="fs__t fs__t--deep${extra}" style="--i:${i}" aria-hidden="true">${inner}</span>`;
  return `<h1 class="fs tg__fs" style="--hue:${hue};--n:${chars.length + 2}" aria-label="${esc(name)}">
    <svg class="fs__tel" viewBox="0 0 76 75" aria-hidden="true"><use href="#i-telescope"/></svg>
    <span class="fs__wrap">${ARC_FS}${SPARKS}<span class="fs__bar">
      ${deep(0, '<svg viewBox="0 0 40 40"><use href="#i-telescope-tile"/></svg>')}
      ${tiles}
      ${deep(chars.length + 1, '<svg viewBox="0 0 24 24"><use href="#i-stars4"/></svg>', ' fs__t--cap')}
    </span></span>
  </h1>`;
}

const hueOf = (s) => [...s].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 360, 7);
const seedOf = (t) => [...(t.title + t.author)].reduce((a, c) => a + c.codePointAt(0), 0);

const COVER_DIR = './covers/';
const COVER_MAX_IDX = 2;
const PAGE_SIZE = { card: 20, list: 20 };
const KEY = { view: 'hoshikai:tag-view', sort: 'hoshikai:tag-sort' };
const SORTS = { latest: '最新回复', posted: '发帖时间', mag: '星等' };
const LOCAL_KEY = 'hoshikai:posts';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

/* ---------- URL ----------
   ./tag/<标签>/[页码/] 重写后是 tag.html?t=<标签>&p=<页码>；
   ErrorDocument 兜底或直连 tag.html 时 query 可能为空，所以 pathname 那条要留着。
   中文标签在 pathname 里是百分号编码，必须 decode 两次里的第一次（只解一次）。 */
function readRoute() {
  const q = new URLSearchParams(location.search);
  let t = q.get('t') || '';
  let p = q.get('p') || '';
  if (!t || !p) {
    const m = location.pathname.match(/\/tag\/([^/]+)\/?(?:(\d+)\/?)?$/);
    if (m) {
      if (!t) { try { t = decodeURIComponent(m[1]); } catch (e) { t = m[1]; } }
      p = p || m[2] || '';
    }
  }
  return { tag: String(t).trim(), page: Math.max(1, parseInt(p, 10) || 1) };
}

const route = readRoute();
const HEAT = (typeof tagHeat === 'function') ? tagHeat() : { rows: [], total: 0, countOf: () => 0, toMag: () => 0 };
const TAG_SET = new Set(HEAT.rows.map((r) => r[0]));
const tagURL = (g, n) => `./tag/${encodeURIComponent(g)}/${n > 1 ? n + '/' : ''}`;

/* ---------- 顶栏（与板块页同一份写法，三页各持一份） ---------- */
const NAV_CROSS = '<svg viewBox="-8 -8 16 16" aria-hidden="true"><path d="M-5 0H5M0-5V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" vector-effect="non-scaling-stroke"/></svg>';
$('#nav').innerHTML = [
  `<a href="./"><i>${NAV_CROSS}</i>首页</a>`,
  ...FORUM.boards.map((b, i) => `<a href="./forum/${i + 1}-1/"><i>${NAV_CROSS}</i>${esc(b.title)}</a>`),
  `<a href="./space/1/"><i>${NAV_CROSS}</i>个人空间</a>`,
  `<a href="./msg/"><i>${NAV_CROSS}</i>消息</a>`,
  `<a href="./#recommend"><i>${NAV_CROSS}</i>推荐</a>`,
].join('');

/* ---------- 全站帖池 ----------
   12 个子板块 × 72 条，再加本机发的帖（它们也有标签）。一次算好，翻页/切视图不再重算。 */
let POOL = null;
function localPosts() {
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (e) { return []; }
  if (!Array.isArray(arr)) return [];
  return arr.map((p) => {
    const m = /^(\d)-(\d)$/.exec(String(p.key || ''));
    if (!m) return null;
    return {
      tid: p.tid, idx: 999, local: true,
      title: p.title, author: p.author,
      date: '刚刚', mins: 0, postedMins: 0,
      replies: 0, views: 0, hot: false,
      tags: Array.isArray(p.tags) ? p.tags : [],
      excerpt: String(p.body || '').slice(0, 70),
      bi: +m[1], si: +m[2],
    };
  }).filter(Boolean);
}
function pool() {
  if (POOL) return POOL;
  const out = [];
  FORUM.boards.forEach((b, bi) => b.sections.forEach((sec, si) => {
    boardThreads(bi, si, THREAD_POOL_SIZE).forEach((t) => out.push(Object.assign({}, t, { bi, si })));
  }));
  POOL = out.concat(localPosts());
  return POOL;
}
const threadsOf = (tag) => pool().filter((t) => (t.tags || []).indexOf(tag) >= 0);

/* ---------- 星团分布 ----------
   三簇（三个大板块），每簇四颗（四个子板块），星点半径 ∝ √帖数（面积正比，读起来不夸张）。
   位置固定 → 同一个标签每次打开长相一致；<title> 给出子板块名与帖数。 */
const CST = [[16, 30], [38, 12], [60, 26], [82, 10]];
function distHTML(counts, tag) {
  const flat = counts.reduce((a, r) => a.concat(r), []);
  const max = Math.max(1, ...flat);
  const speak = FORUM.boards.map((b, bi) => b.sections
    .map((s, si) => counts[bi][si] ? `${s.title} ${counts[bi][si]} 帖` : '')
    .filter(Boolean).join('，')).filter(Boolean).join('；');
  const clusters = FORUM.boards.map((b, bi) => {
    const dots = counts[bi].map((n, si) => {
      const r = n ? 2.2 + 4.4 * Math.sqrt(n / max) : 1.5;
      return `<circle class="tg-cst__d${n ? '' : ' tg-cst__d--zero'}" cx="${CST[si][0]}" cy="${CST[si][1]}" r="${r.toFixed(2)}">`
        + `<title>${esc(b.sections[si].title)} · ${n} 帖</title></circle>`;
    }).join('');
    const line = `<polyline class="tg-cst__ln" points="${CST.map((p) => p.join(',')).join(' ')}"/>`;
    return `<div class="tg-cst">
      <svg class="tg-cst__svg" viewBox="0 0 96 42" aria-hidden="true">${line}${dots}</svg>
      <span class="tg-cst__nm">${esc(b.title)}</span>
    </div>`;
  }).join('');
  return `<div class="tg-dist" role="img" aria-label="「${esc(tag)}」在各子板块的分布：${esc(speak)}">
    <div class="tg-dist__row">${clusters}</div>
    <span class="tg-dist__legend">每颗星一个子板块，越大帖越多</span>
  </div>`;
}

/* ---------- 卡片 / 列表 ----------
   与板块页同形；区别只有一处：封面上的标签胶囊换成**板块**胶囊 —— 这一页的帖来自十二个板块，
   「它属于哪个板块」才是这里缺的信息，标签本身在页面标题里已经说过了。 */
function thumbHTML(t, hue, cls) {
  const b = FORUM.boards[t.bi];
  const hasCover = t.idx <= COVER_MAX_IDX;
  const img = hasCover ? `<img src="${COVER_DIR}${b.id}-${t.si}-${t.idx}.svg" alt="" loading="lazy" decoding="async">` : '';
  return `<span class="thumb ${cls}${hasCover ? '' : ' is-fallback'}" style="background:${coverGradient(seedOf(t), hue)}">${img}</span>`;
}
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
const isoOf = (mins) => new Date(Date.now() - mins * 60000).toISOString();
const timeHTML = (t, cls) => `<time class="${cls}" datetime="${isoOf(t.mins)}">${esc(t.date)}</time>`;
function magBadge(t, extra = '') {
  const m = magnitude(t.replies, t.views);
  return `<span class="mag${extra}" style="--glowAmt:${magnitudeGlow(m)}" title="星等 ${m} 等 · 越小越亮">${icon('star')}<b>${m}</b>等</span>`;
}
const boardChip = (t, extra = '') => {
  const b = FORUM.boards[t.bi];
  return `<span class="tg-bd${extra}" style="--bh:${b.hue}">${esc(b.title)}</span>`;
};

function cardHTML(t, i) {
  const b = FORUM.boards[t.bi];
  const k = hueOf(t.title) / 360;
  const open = t.local ? '<div class="tc__link">' : `<a class="tc__link" href="./topic/${t.tid}/">`;
  const close = t.local ? '</div>' : '</a>';
  const style = t.local ? `--i:${i}` : `--i:${i};--tw:${(5 + k * 4).toFixed(2)}s;--twd:${(-k * 7).toFixed(2)}s`;
  return `<article class="tc${t.local ? ' tc--local' : ''}" style="${style}">
  ${open}
    <span class="tc__cover">
      ${thumbHTML(t, b.hue, 'tc__thumb')}
      <span class="tc__chips">
        ${boardChip(t)}
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

function listHTML(t, i) {
  const b = FORUM.boards[t.bi];
  const lead = i === 0;
  return `<li class="tl${lead ? ' tl--lead' : ''}${t.local ? ' tl--local' : ''}" style="--i:${i}">
  ${t.local ? '<div class="tl__link">' : `<a class="tl__link" href="./topic/${t.tid}/">`}
    ${thumbHTML(t, b.hue, 'tl__thumb')}
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
        ${boardChip(t, ' tg-bd--sm')}
        <span class="pull">${icon('reply')}${t.replies}</span>
        <span class="pull">${icon('eye')}${t.views.toLocaleString()}</span>
        ${magBadge(t)}
      </span>
    </span>
  ${t.local ? '</div>' : '</a>'}
</li>`;
}

/* ---------- 排序 / 分页 ---------- */
const CMP = {
  latest: (a, b) => a.mins - b.mins || a.idx - b.idx,
  posted: (a, b) => a.postedMins - b.postedMins || a.idx - b.idx,
  mag: (a, b) => magnitude(a.replies, a.views) - magnitude(b.replies, b.views) || a.idx - b.idx,
};
function paginationHTML(pages, page, tag) {
  if (pages <= 1) return '';
  const nums = [...new Set([1, 2, page - 1, page, page + 1, pages - 1, pages])]
    .filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const items = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) items.push('<li class="pg__gap" aria-hidden="true">…</li>');
    items.push(n === page
      ? `<li><a class="pg__n" href="${tagURL(tag, n)}" aria-current="page" aria-label="第 ${n} 页，当前页">${n}</a></li>`
      : `<li><a class="pg__n" href="${tagURL(tag, n)}" aria-label="第 ${n} 页">${n}</a></li>`);
  });
  const chev = '<svg class="i pg__chev" aria-hidden="true"><use href="#i-chevron"/></svg>';
  const prev = page > 1
    ? `<a class="pg__step" href="${tagURL(tag, page - 1)}" rel="prev">${chev}上一页</a>`
    : `<span class="pg__step is-off" aria-disabled="true">${chev}上一页</span>`;
  const next = page < pages
    ? `<a class="pg__step pg__step--next" href="${tagURL(tag, page + 1)}" rel="next">下一页${chev}</a>`
    : `<span class="pg__step pg__step--next is-off" aria-disabled="true">下一页${chev}</span>`;
  return `<div class="pg__row">${prev}<ol class="pg__list">${items.join('')}</ol>${next}
    <form class="pg__jump" id="pgJump" aria-label="跳转到指定页">
      <label for="pgIn">跳至</label>
      <input id="pgIn" type="number" min="1" max="${pages}" step="1" inputmode="numeric" value="${page}" aria-label="跳转到第几页">
      <span class="pg__of">/ ${pages} 页</span>
      <button class="pg__go" type="submit">跳转</button>
    </form></div>`;
}

/* ---------- 视图状态 ---------- */
let view = store.get(KEY.view); if (!(view in PAGE_SIZE)) view = 'card';
let sort = store.get(KEY.sort); if (!(sort in SORTS)) sort = 'latest';
let curPages = 1;

/* ---------- 归档页 ---------- */
function renderArchive(tag) {
  const all = threadsOf(tag);
  const n = all.length;
  const hue = TAG_HUE[tag] != null ? TAG_HUE[tag] : 218;
  const rank = HEAT.rows.findIndex((r) => r[0] === tag) + 1;
  const counts = FORUM.boards.map((b) => b.sections.map(() => 0));
  all.forEach((t) => { counts[t.bi][t.si] += 1; });
  const hit = counts.reduce((a, r) => a + r.filter((v) => v > 0).length, 0);
  const newest = n ? Math.min(...all.map((t) => t.mins)) : 0;
  const mag = HEAT.toMag(n);

  const tagEl = $('#tag');
  tagEl.style.setProperty('--hue', hue);
  tagEl.setAttribute('aria-label', `标签 ${tag}`);
  tagEl.innerHTML = `
  <header class="bv__head tg__head">
    <div class="bv__lead">
      ${rank > 0 ? `<span class="bv__idx" aria-hidden="true">#${String(rank).padStart(2, '0')}</span>` : ''}
      ${filmstrip(tag, hue)}
      <p class="bv__sub tg__sub">
        <span class="mag" style="--glowAmt:${magnitudeGlow(mag)}">${icon('star')}<b>${mag}</b>等</span>
        <span>全站 ${n} 帖 · ${hit} 个子板块 · 最近一条 ${esc(relTime(newest))}</span>
      </p>
    </div>
    ${distHTML(counts, tag)}
  </header>`;

  $('#crumb').innerHTML = `<a href="./">首页</a>
    <span class="crumb__sep" aria-hidden="true">›</span>
    <a href="./tag/">标签</a>
    <span class="crumb__sep" aria-hidden="true">›</span>
    <span class="crumb__cur" aria-current="page">${esc(tag)}</span>`;

  const rows = all.slice().sort(CMP[sort]);
  const size = PAGE_SIZE[view];
  curPages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(route.page, curPages);
  const slice = rows.slice((page - 1) * size, page * size);

  const host = $('#topics');
  host.dataset.view = view;
  host.innerHTML = slice.length
    ? (view === 'card'
      ? `<div class="tgridwrap"><div class="tgrid">${slice.map(cardHTML).join('')}</div></div>`
      : `<ol class="tlist">${slice.map(listHTML).join('')}</ol>`)
    : `<div class="empty">
        <span class="empty__mark" aria-hidden="true">${icon('orbit')}</span>
        <p class="empty__t">这个标签下还没有帖子</p>
        <p class="empty__d">标签页收的是全站十二个板块的帖。换个标签看看，或者去板块里发第一帖。</p>
        <a class="btn btn--solid" href="./tag/">看看全部标签</a>
      </div>`;

  $('#pg').innerHTML = paginationHTML(curPages, page, tag);
  $('#count').textContent = `共 ${rows.length} 帖 · 第 ${page} / ${curPages} 页`;
  $('#bar').hidden = false;

  /* 相关标签：这些帖里还挂了哪些标签，按共现次数排 */
  const co = new Map();
  all.forEach((t) => (t.tags || []).forEach((g) => { if (g !== tag) co.set(g, (co.get(g) || 0) + 1); }));
  const rel = [...co].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const relBox = $('#rel');
  relBox.hidden = rel.length === 0;
  $('#relH').textContent = `常和「${tag}」一起出现的标签`;
  $('#relRow').innerHTML = rel.map(([g, c]) =>
    `<a class="tag tg-rel__t" style="--th:${TAG_HUE[g] != null ? TAG_HUE[g] : 218}" href="${tagURL(g, 1)}">${esc(g)}<i>${c}</i></a>`).join('');

  hydrateThumbs(host);
  const grid = host.querySelector('.tgrid');
  const list = host.querySelector('.tlist');
  const wrap = host.querySelector('.tgridwrap');
  /* `.js .tgrid .tc { opacity:0 }` 要等到 is-lit 才亮；rAF 在后台标签页会被节流/暂停，
     所以再加一个定时器兜底 —— 卡片不能靠「有没有排到帧」才决定要不要出现。 */
  const light = () => {
    if (grid) grid.classList.add('is-lit');
    if (list) list.classList.add('is-lit');
    const head = $('.tg__head');
    if (head) head.classList.add('is-drawn');   // 格子条上方那条弧（.fs__arc）
    if (wrap) wrap.classList.add('is-drawn');
  };
  requestAnimationFrame(light);
  setTimeout(light, 220);

  document.title = `${tag} · 标签 · 星海社`;

  const jump = $('#pgJump');
  if (jump) {
    jump.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = parseInt($('#pgIn').value, 10);
      const t = Math.min(Math.max(1, Number.isFinite(v) ? v : 1), curPages);
      if (t === page) return;
      location.href = tagURL(tag, t);
    });
  }
}

/* ---------- 标签索引（./tag/） ----------
   12 座真实星座 + 「没分族」的零星点。
   每座按真实骨架画（双子两串、猎户腰带、天龙的蜿蜒、天琴平行四边形、仙女长链、
   天鹅十字、北斗、金牛 V、小熊小北斗、仙后 W、飞马大方框、天蝎钩）。
   没分族的标签（这里是被抽出来当「情绪尘埃」的 9 个形容词）不隐藏：
   它们在星座之间的空隙里各占一颗星，照常带名字、可点。
   画布比视口大（可拖动），201 个名字按实测宽度做矩形碰撞。窄屏只给列表。 */
const CONSTELLATIONS = [
  { id: 'gemini', name: '双子座', en: 'Gemini', hue: 322, tags: [
    '恋爱','纯爱','乙女','青春','校园','治愈','日常','家族','旅行','音乐题材','动画化','轻小说','全年龄','短篇','线性',
  ], figure: {
    pts: [[.22,.08],[.18,.40],[.26,.76],[.78,.08],[.82,.42],[.74,.78],[.50,.58]],
    edges: [[0,1],[1,2],[3,4],[4,5],[1,6],[4,6]],
  } },
  { id: 'orion', name: '猎户座', en: 'Orion', hue: 218, tags: [
    '悬疑','推理','科幻','奇幻','恐怖','战斗','王道','群像','猎奇','历史','职场','致郁','单元剧','多结局','长篇',
  ], figure: {
    pts: [[.50,.06],[.30,.24],[.70,.21],[.40,.48],[.50,.51],[.60,.49],[.34,.82],[.66,.78]],
    edges: [[0,1],[0,2],[1,3],[2,5],[3,4],[4,5],[3,6],[5,7]],
  } },
  { id: 'draco', name: '天龙座', en: 'Draco', hue: 268, tags: [
    '序章','终章','外传','前作','续作','系列','世界观','伏笔','结局','剧透','无剧透','番外','联动',
    '角色','女主','男主','配角','声优','剧本','作画','设定集','设定考','考据',
  ], figure: {
    pts: [[.10,.16],[.26,.30],[.42,.20],[.56,.34],[.50,.54],[.62,.70],[.78,.80],[.90,.70],[.84,.54],[.70,.48]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]],
  } },
  { id: 'lyra', name: '天琴座', en: 'Lyra', hue: 196, tags: [
    '配乐','主题曲','片尾曲','插入歌','歌词','翻唱','演奏','歌单','音声','音乐合集','广播剧','原声','OST',
  ], figure: {
    pts: [[.50,.06],[.34,.34],[.66,.31],[.42,.62],[.60,.80]],
    edges: [[0,1],[0,2],[1,3],[3,4],[4,2]],
  } },
  { id: 'andromeda', name: '仙女座', en: 'Andromeda', hue: 300, tags: [
    '同人作品','同人图','同人文','二创','临摹','短打','连载','完结','插画','画集','原画','分镜','草稿','线稿','上色',
    'CG','背景','UI','同人志','立绘',
  ], figure: {
    pts: [[.14,.52],[.34,.42],[.54,.36],[.74,.30],[.86,.14],[.60,.62]],
    edges: [[0,1],[1,2],[2,3],[3,4],[2,5]],
  } },
  { id: 'cygnus', name: '天鹅座', en: 'Cygnus', hue: 152, tags: [
    '汉化组','多语言','校对','润色','术语表','汉化测试','编码','字库','字体','脚本','解包','移植补丁','补丁','重制','修订',
  ], figure: {
    pts: [[.50,.05],[.50,.32],[.50,.60],[.50,.92],[.10,.50],[.90,.44]],
    edges: [[0,1],[1,2],[2,3],[4,1],[1,5]],
  } },
  { id: 'ursa', name: '大熊座', en: 'Ursa Major', hue: 240, tags: [
    '引擎',"Ren'Py",'KiriKiri','安卓','Win11','兼容','优化','打包','压缩','补丁制作','录屏','剪辑','字幕','压制','直播',
  ], figure: {
    pts: [[.06,.56],[.22,.52],[.36,.48],[.50,.56],[.66,.50],[.80,.62],[.64,.74],[.50,.72]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,3]],
  } },
  { id: 'taurus', name: '金牛座', en: 'Taurus', hue: 44, tags: [
    '资源分享','求物','存档区','资源失效','搬运','合集','首发','整合包','免安装','绿色版','镜像','补档','分流','秒传',
    '网盘','磁力','种子','校验','解压',
  ], figure: {
    pts: [[.50,.30],[.34,.42],[.50,.54],[.66,.42],[.10,.16],[.90,.12]],
    edges: [[0,1],[1,2],[2,3],[3,0],[1,4],[3,5]],
  } },
  { id: 'aquila', name: '天鹰座', en: 'Aquila', hue: 100, tags: [
    '安装','修正补丁','通关档','全解锁','修改器','攻略本','设定资料','攻略','答疑','求助',
    '表格','流程图','工具','技术向','图文教程',
  ], figure: {
    pts: [[.50,.30],[.38,.34],[.62,.32],[.50,.55],[.30,.62],[.70,.58],[.50,.80]],
    edges: [[1,0],[0,2],[0,3],[3,4],[3,5],[3,6]],
  } },
  { id: 'cassiopeia', name: '仙后座', en: 'Cassiopeia', hue: 180, tags: [
    '新人','报到','自荐','招募','组队','合作','企划','约稿','建议','反馈','举报','申诉','版务','公告','悬赏','接单',
  ], figure: {
    pts: [[.08,.34],[.30,.72],[.50,.40],[.70,.74],[.92,.38]],
    edges: [[0,1],[1,2],[2,3],[3,4]],
  } },
  { id: 'pegasus', name: '飞马座', en: 'Pegasus', hue: 12, tags: [
    '投票','问卷','周年','抽奖','交换','互助','试玩','内测','众筹','周边','展子','线下','聚会','联机','语音','活动',
  ], figure: {
    pts: [[.30,.30],[.65,.22],[.70,.55],[.35,.62],[.85,.30],[.82,.70]],
    edges: [[0,1],[1,2],[2,3],[3,0],[1,4],[2,5]],
  } },
  { id: 'scorpius', name: '天蝎座', en: 'Scorpius', hue: 350, tags: [
    '讨论','情报','杂谈','评测','感想','简评','吐槽','怀旧','冷门','神作',
  ], figure: {
    pts: [[.10,.20],[.24,.36],[.38,.48],[.52,.60],[.66,.70],[.78,.84],[.70,.94]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]],
  } },
];
/* 没分族的标签：不隐藏，散在星座之间当「零星的点」。
   这里挑的是 9 个情绪形容词 —— 它们本来就是跨题材的，不属于任何一座。 */
const LOOSE_TAGS = ['感动','催泪','烧脑','轻松','搞笑','黑暗','温馨','压抑','后劲大'];
const GROUP_OF = new Map();
CONSTELLATIONS.forEach((c) => c.tags.forEach((t) => GROUP_OF.set(t, c.id)));
const GROUP_NAME = new Map(CONSTELLATIONS.map((c) => [c.id, c.name]));
const SUMMER = ['lyra', 'cygnus', 'aquila'];

/* 真实天区：每座中心的大致赤经（小时）/赤纬（度）。
   先用等距圆柱投影铺开，再把挤在一起的座做最小位移拉开（保留左右/上下关系）。 */
const REAL_SKY = {
  orion: [5.6, 2], gemini: [7.0, 22], taurus: [4.5, 17],
  ursa: [11.0, 50], cassiopeia: [1.0, 60], andromeda: [0.8, 37],
  pegasus: [22.7, 20], cygnus: [20.5, 42], lyra: [18.8, 37], aquila: [19.7, 3],
  scorpius: [16.8, -30], draco: [17.0, 65],
};
const RA0 = 19.2, DEC0 = 33;
const RING = ['gemini', 'orion', 'cassiopeia', 'draco', 'scorpius', 'ursa', 'pegasus', 'taurus', 'andromeda'];

function indexStars(rows) {
  const N = rows.length;
  const max = rows[0][1], min = rows[N - 1][1];
  const span = Math.max(1, max - min);
  return rows.map(([g, n], i) => ({
    g, n, i,
    r: 2.2 + 6.2 * Math.sqrt((n - min) / span),
    tw: (4.5 + ((i * 41) % 50) / 10).toFixed(2),
    td: (-((i * 29) % 90) / 10).toFixed(1),
  }));
}

function groupRadius(id) {
  const c = CONSTELLATIONS.find((x) => x.id === id);
  const n = c ? c.tags.length : 10;
  return Math.min(150, Math.sqrt((n * 760 * 2.0 + 14000) / Math.PI));
}
const LOOSE_R = 62;
function figSize(id) {
  const c = CONSTELLATIONS.find((x) => x.id === id);
  const n = c ? c.tags.length : 10;
  return Math.round(50 + Math.sqrt(n) * 13);
}

/* 12 座按 4×3 网格铺满画布；每座再加一点确定性抖动，避免看起来像表格 */
function groupCenters(FW, FH) {
  return realCenters(FW, FH);
}

/* 等距圆柱投影：赤经差 ±12h 铺满横向 90%，赤纬 ±90° 铺满纵向 90% */
function realCenters(FW, FH) {
  const m = new Map();
  Object.keys(REAL_SKY).forEach((id) => {
    const [ra, dec] = REAL_SKY[id];
    let dh = (((ra - RA0 + 12) % 24) + 24) % 24 - 12;
    m.set(id, [FW * (0.5 + (dh / 12) * 0.40), FH * (0.5 - ((dec - DEC0) / 90) * 0.42)]);
  });
  /* 真实天区里冬季三座、北天三座是挤在一起的；这里只做最小位移，保留相对方位 */
  const ids = [...m.keys()];
  const cap = new Map(ids.map((id) => [id, groupRadius(id)]));
  const base = new Map(ids.map((id) => [id, m.get(id).slice()]));
  for (let it = 0; it < 520; it++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = m.get(ids[i]), b = m.get(ids[j]);
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const d = Math.hypot(dx, dy) || .001;
        const need = cap.get(ids[i]) + cap.get(ids[j]) + 130;
        if (d < need) {
          const push = (need - d) / 2 * 0.8;
          const ux = dx / d, uy = dy / d;
          a[0] -= ux * push; a[1] -= uy * push;
          b[0] += ux * push; b[1] += uy * push;
        }
      }
    }
    ids.forEach((id) => {
      const p = m.get(id), q = base.get(id), c = cap.get(id), pad = 14;
      p[0] += (q[0] - p[0]) * 0.02;
      p[1] += (q[1] - p[1]) * 0.02;
      p[0] = Math.min(FW - c - pad, Math.max(c + pad, p[0]));
      p[1] = Math.min(FH - c - pad, Math.max(c + pad, p[1]));
    });
    /* 强约束：赤经差 ≥3h 的座保持左右次序；赤纬差 ≥25° 的座保持南北次序。
       松弛只允许在弱方向上互相让位，不能把「天蝎在南、双子在东」这种关系弄丢。 */
    const dhOf = (id) => {
      const [ra] = REAL_SKY[id];
      return ((((ra - RA0 + 12) % 24) + 24) % 24) - 12;
    };
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = m.get(ids[i]), b = m.get(ids[j]);
        const dh = dhOf(ids[i]) - dhOf(ids[j]);
        if (Math.abs(dh) >= 0.8) {
          const left = dh < 0 ? a : b, right = dh < 0 ? b : a;
          if (left[0] > right[0] - 24) {
            const mid = (left[0] + right[0]) / 2;
            left[0] = mid - 12; right[0] = mid + 12;
          }
        }
        const dd = REAL_SKY[ids[i]][1] - REAL_SKY[ids[j]][1];
        if (Math.abs(dd) >= 25) {
          const north = dd > 0 ? a : b, south = dd > 0 ? b : a;
          if (north[1] > south[1] - 24) {
            const mid = (north[1] + south[1]) / 2;
            north[1] = mid - 12; south[1] = mid + 12;
          }
        }
      }
    }
  }
  return m;
}
/* 没分族的星放到「离所有星座最远」的空档里：粗网格里按最近距离从大到小取 9 个 */
function looseCenters(FW, FH, centers) {
  const pts = [];
  const cs = [...centers.values()];
  for (let gy = 1; gy <= 4; gy++) {
    for (let gx = 1; gx <= 5; gx++) {
      const x = FW * gx / 6, y = FH * gy / 5;
      let best = Infinity;
      cs.forEach((c) => { best = Math.min(best, Math.hypot(c[0] - x, c[1] - y)); });
      pts.push({ x, y, d: best });
    }
  }
  pts.sort((a, b) => b.d - a.d || a.x - b.x || a.y - b.y);
  return pts.slice(0, 9).map((p) => [p.x, p.y]);
}

function sizeField(host) {
  const field = host.querySelector('.neb__field');
  const vw = host.clientWidth, vh = host.clientHeight;
  // 真实天区：横纵都放大，给星座之间留出更大的间隔
  const fw = Math.max(1700, Math.round(vw * 1.4));
  const fh = Math.round(vh * 1.25);
  field.style.width = fw + 'px';
  field.style.height = fh + 'px';
  return { fw, fh };
}

/* 把名字按实测宽度塞进画布。返回成功落位的个数。 */
function packNebula(host) {
  if (!host || host.hidden) return 0;
  const field = host.querySelector('.neb__field');
  if (!field) return 0;
  const FW = field.clientWidth, FH = field.clientHeight;
  if (!FW || !FH) return 0;
  const anchors = [...field.querySelectorAll('.neb__s')];
  const PAD = 14, GAP = 6, CELL = 64;
  const cells = new Map();
  const each = (r, fn) => {
    const x0 = Math.floor(r.x / CELL), x1 = Math.floor((r.x + r.w) / CELL);
    const y0 = Math.floor(r.y / CELL), y1 = Math.floor((r.y + r.h) / CELL);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) fn(x + ',' + y);
  };
  const add = (r) => each(r, (k) => {
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(r);
  });
  const hit = (r) => {
    let bad = false;
    each(r, (k) => {
      const list = cells.get(k);
      if (!list) return;
      for (const q of list) {
        if (r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y) { bad = true; return; }
      }
    });
    return bad;
  };
  const centers = groupCenters(FW, FH);
  const loose = looseCenters(FW, FH, centers);
  centers.forEach(([cx, cy], gid) => {
    const half = figSize(gid) * 0.34;
    add({ x: cx - half, y: cy - half, w: half * 2, h: half * 2 });
  });
  const phase = new Map();
  const looseSeen = new Map();
  const TWIST = 0.06, GROW = 4.6;
  let placed = 0;
  anchors.forEach((a) => {
    a.classList.remove('is-unplaced');
    const gid = a.getAttribute('data-group') || 'loose';
    const isLoose = gid === 'loose';
    let key = gid, c, capR;
    if (isLoose) {
      const k = looseSeen.get('k') || 0;
      looseSeen.set('k', k + 1);
      c = loose[(k % loose.length)];
      key = 'loose#' + (k % loose.length);
      capR = LOOSE_R;
    } else {
      c = centers.get(gid) || [FW / 2, FH / 2];
      capR = groupRadius(gid);
    }
    const w = Math.ceil(a.offsetWidth), h = Math.ceil(a.offsetHeight);
    let th = phase.get(key) || 0;
    let ok = false;
    for (let t = th; t < 900; t += TWIST) {
      const r = 8 + GROW * t;
      if (r > capR) break;
      const x = c[0] + Math.cos(t) * r - w / 2;
      const y = c[1] + Math.sin(t) * r - h / 2;
      if (x < PAD || y < PAD || x + w > FW - PAD || y + h > FH - PAD) continue;
      const box = { x: x - GAP / 2, y: y - GAP / 2, w: w + GAP, h: h + GAP };
      if (hit(box)) continue;
      add(box);
      a.style.left = x.toFixed(1) + 'px';
      a.style.top = y.toFixed(1) + 'px';
      phase.set(key, t + TWIST);
      placed += 1;
      ok = true;
      break;
    }
    if (!ok) a.classList.add('is-unplaced');
  });
  host.dataset.placed = String(placed);
  drawWeb(host);
  return placed;
}

/* 星座图：真实骨架、区域虚线、座名；相邻的座用淡虚线连起来。零星点不画任何圈子。 */
function drawWeb(host) {
  const field = host.querySelector('.neb__field');
  const svg = host.querySelector('.neb__web');
  if (!field || !svg) return;
  const FW = field.clientWidth, FH = field.clientHeight;
  if (!FW || !FH) return;
  const fRect = field.getBoundingClientRect();
  const anchors = [...field.querySelectorAll('.neb__s')].filter((a) => !a.classList.contains('is-unplaced'));
  const byG = new Map();
  const boxes = new Map();
  anchors.forEach((a) => {
    const b = { x: parseFloat(a.style.left) || 0, y: parseFloat(a.style.top) || 0, w: a.offsetWidth, h: a.offsetHeight };
    boxes.set(a, b);
    const g = a.getAttribute('data-group') || 'loose';
    if (!byG.has(g)) byG.set(g, []);
    byG.get(g).push(a);
  });
  const centers = groupCenters(FW, FH);
  let out = '';

  /* 外圈九座相邻连淡虚线；中间三座连成夏日大三角（更亮一点） */
  out += '<g class="neb__web-links">';
  const linkPts = (a, b) => {
    const p = centers.get(a), q = centers.get(b);
    if (!p || !q) return '';
    return `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}" stroke="currentColor" stroke-opacity=".13" stroke-width="1" stroke-dasharray="3 8"/>`;
  };
  RING.forEach((id, i) => { out += linkPts(id, RING[(i + 1) % RING.length]); });
  SUMMER.forEach((id, i) => {
    const p = centers.get(id), q = centers.get(SUMMER[(i + 1) % SUMMER.length]);
    out += `<line class="neb__tri" x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}"/>`;
  });
  const triPts = SUMMER.map((id) => centers.get(id));
  const tcx = (triPts[0][0] + triPts[1][0] + triPts[2][0]) / 3;
  const tcy = (triPts[0][1] + triPts[1][1] + triPts[2][1]) / 3;
  out += `<text class="neb__aster" x="${tcx.toFixed(1)}" y="${(tcy - 6).toFixed(1)}" text-anchor="middle">夏日大三角</text>`;
  out += '</g>';

  const figures = [];
  CONSTELLATIONS.forEach((c) => {
    const list = byG.get(c.id) || [];
    const ctr = centers.get(c.id);
    const fs = figSize(c.id);
    const pts = c.figure.pts.map(([u, v]) => [ctr[0] + (u - 0.5) * fs, ctr[1] + (v - 0.5) * fs]);
    let figSvg = '';
    c.figure.edges.forEach(([i, j]) => {
      figSvg += `<line class="neb__fig-line" x1="${pts[i][0].toFixed(1)}" y1="${pts[i][1].toFixed(1)}" x2="${pts[j][0].toFixed(1)}" y2="${pts[j][1].toFixed(1)}"/>`;
    });
    pts.forEach(([x, y]) => {
      figSvg += `<circle class="neb__fig-star" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2"/>`;
    });

    const xs = [], ys = [];
    list.forEach((a) => { const b = boxes.get(a); xs.push(b.x, b.x + b.w); ys.push(b.y, b.y + b.h); });
    pts.forEach(([x, y]) => { xs.push(x); ys.push(y); });
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    figures.push({
      c, pts, ctr,
      ex: (minX + maxX) / 2, ey: (minY + maxY) / 2,
      erx: (maxX - minX) / 2 + 12, ery: (maxY - minY) / 2 + 12,
      minY, figSvg,
      nameX: (minX + maxX) / 2, nameY: Math.max(16, minY - 10),
    });
  });

  /* 座名避让 */
  const labelRects = anchors.map((a) => boxes.get(a));
  const nameRects = [];
  figures.forEach((f) => {
    const w = f.c.name.length * 14 + 10;
    const overlapOf = (x, y) => {
      const r = { x: x - w / 2 - 2, y: y - 12, w: w + 4, h: 15 };
      let sum = 0;
      labelRects.concat(nameRects).forEach((q) => {
        const ox = Math.max(0, Math.min(r.x + r.w, q.x + q.w) - Math.max(r.x, q.x));
        const oy = Math.max(0, Math.min(r.y + r.h, q.y + q.h) - Math.max(r.y, q.y));
        sum += ox * oy;
      });
      return sum;
    };
    const inPanel = (x, y) => x - w / 2 >= 8 && x + w / 2 <= FW - 8 && y >= 16 && y <= FH - 8;
    let best = null;
    for (const dy of [0, -12, -24, -36, -48, -64, -80, -100, -120, 18, 34, 52]) {
      for (let dx = 0; dx <= 360; dx += 24) {
        const xs2 = dx === 0 ? [0] : [dx, -dx];
        for (const ox of xs2) {
          const x = f.nameX + ox, y = f.nameY + dy;
          if (!inPanel(x, y)) continue;
          const ov = overlapOf(x, y);
          if (!best || ov < best.ov) best = { x, y, ov };
          if (ov === 0) break;
        }
        if (best && best.ov === 0) break;
      }
      if (best && best.ov === 0) break;
    }
    if (best) { f.nameX = best.x; f.nameY = best.y; }
    nameRects.push({ x: f.nameX - w / 2, y: f.nameY - 11, w, h: 13 });
  });

  figures.forEach((f) => {
    out += `<g class="neb__cst" style="--gh:${f.c.hue}" data-cst="${f.c.id}" data-en="${f.c.en}" data-cx="${f.ctr[0].toFixed(1)}" data-cy="${f.ctr[1].toFixed(1)}">`
      + `<ellipse class="neb__cst-ring" cx="${f.ex.toFixed(1)}" cy="${f.ey.toFixed(1)}" rx="${f.erx.toFixed(1)}" ry="${f.ery.toFixed(1)}"/>`
      + f.figSvg
      + `<text class="neb__cst-nm" x="${f.nameX.toFixed(1)}" y="${f.nameY.toFixed(1)}" text-anchor="middle">${esc(f.c.name)}</text>`
      + '</g>';
  });

  svg.setAttribute('viewBox', `0 0 ${FW} ${FH}`);
  svg.innerHTML = out;
}

/* ---------- 拖动 ----------
   画布 1.6 倍视口，初始居中；拖动平移、夹边、拖过 4px 吞点击；方向键也能平移；
   Tab 聚焦到画布外的星会把画布移过去。 */
function initPan(host) {
  const field = host.querySelector('.neb__field');
  const pan = { tx: 0, ty: 0, drag: null, moved: false };
  const clamp = () => {
    const vw = host.clientWidth, vh = host.clientHeight;
    const fw = field.clientWidth, fh = field.clientHeight;
    pan.tx = Math.min(0, Math.max(vw - fw, pan.tx));
    pan.ty = Math.min(0, Math.max(vh - fh, pan.ty));
  };
  const apply = () => { field.style.transform = `translate(${pan.tx.toFixed(1)}px, ${pan.ty.toFixed(1)}px)`; };
  const center = () => {
    pan.tx = (host.clientWidth - field.clientWidth) / 2;
    pan.ty = (host.clientHeight - field.clientHeight) / 2;
    clamp(); apply();
  };
  host.__pan = { pan, center, apply, clamp };
  center();

  host.addEventListener('pointerdown', (e) => {
    if (e.button && e.button !== 0) return;
    pan.drag = { x: e.clientX, y: e.clientY, tx: pan.tx, ty: pan.ty };
    pan.moved = false;
    host.classList.add('is-drag');
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
  });
  host.addEventListener('pointermove', (e) => {
    if (!pan.drag) return;
    const dx = e.clientX - pan.drag.x;
    const dy = e.clientY - pan.drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) pan.moved = true;
    pan.tx = pan.drag.tx + dx;
    pan.ty = pan.drag.ty + dy;
    clamp(); apply();
  });
  const end = () => {
    if (!pan.drag) return;
    pan.drag = null;
    host.classList.remove('is-drag');
    if (pan.moved) {
      host.__swallowClick = true;
      setTimeout(() => { host.__swallowClick = false; }, 0);
    }
  };
  host.addEventListener('pointerup', end);
  host.addEventListener('pointercancel', end);
  host.addEventListener('click', (e) => {
    if (host.__swallowClick) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  host.addEventListener('keydown', (e) => {
    const step = 60;
    const map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    pan.tx += d[0]; pan.ty += d[1];
    clamp(); apply();
  });

  field.addEventListener('focusin', (e) => {
    const a = e.target.closest('.neb__s');
    if (!a) return;
    const r = a.getBoundingClientRect(), hb = host.getBoundingClientRect();
    const m = 40;
    if (r.left < hb.left + m) pan.tx += hb.left + m - r.left;
    if (r.right > hb.right - m) pan.tx -= r.right - (hb.right - m);
    if (r.top < hb.top + m) pan.ty += hb.top + m - r.top;
    if (r.bottom > hb.bottom - m) pan.ty -= r.bottom - (hb.bottom - m);
    clamp(); apply();
  });
}

function renderIndex() {
  const rows = HEAT.rows;
  const total = HEAT.total;
  const N = rows.length;
  const stars = indexStars(rows);
  const VK = 'hoshikai:tag-index-view';
  const narrow = innerWidth < 1020;
  let mode = narrow ? 'list' : store.get(VK);
  if (mode !== 'map' && mode !== 'list') mode = 'map';

  $('#tag').style.setProperty('--hue', 218);
  $('#tag').innerHTML = `
  <header class="bv__head tg__head">
    <div class="bv__lead">
      ${filmstrip('全部标签', 218)}
      <p class="bv__sub tg__sub"><span>${N} 个标签 · 共 ${total} 帖</span></p>
    </div>
  </header>
  <div class="tg-find">
    <label class="search tg-find__in" for="tgFind">
      <svg class="i" aria-hidden="true"><use href="#i-search"/></svg>
      <input id="tgFind" type="search" placeholder="按名字找标签" aria-label="按名字找标签" autocomplete="off">
    </label>
    <span class="tg-find__n" id="tgFindN" aria-live="polite">${N} 个标签</span>
    <div class="seg tg-view" role="group" aria-label="标签浏览方式"${narrow ? ' hidden' : ''}>
      <button class="seg__b" id="tgMap" type="button" aria-pressed="${mode === 'map'}">星图</button>
      <button class="seg__b" id="tgList" type="button" aria-pressed="${mode === 'list'}">列表</button>
    </div>
  </div>
  <div class="neb" id="neb" role="list" tabindex="0"
       aria-label="标签星图：十二座真实星座，可拖动；没分族的标签散在星座之间"
       ${mode === 'map' ? '' : ' hidden'}>
    <div class="neb__field" id="nebField">
      <svg class="neb__web" aria-hidden="true"></svg>
      ${stars.map((s) => `
      <a class="neb__s${s.i < 12 ? ' is-core' : s.i < 64 ? ' is-mid' : ''}" role="listitem" href="${tagURL(s.g, 1)}"
         data-name="${esc(s.g)}" data-group="${GROUP_OF.get(s.g) || 'loose'}"
         style="--r:${s.r.toFixed(2)}px;--h:${TAG_HUE[s.g] != null ? TAG_HUE[s.g] : 218};--tw:${s.tw}s;--td:${s.td}s"
         title="${esc(s.g)} · ${s.n} 帖 · 星等 ${HEAT.toMag(s.n)} 等"
         aria-label="第 ${s.i + 1} 名 ${esc(s.g)}，${s.n} 帖">
        <i class="neb__dot" aria-hidden="true"></i>
        <span class="neb__nm" aria-hidden="true">${esc(s.g)}</span>
      </a>`).join('')}
    </div>
  </div>
  <p class="neb__legend" id="nebLegend"${mode === 'map' ? '' : ' hidden'}>真实天区：按赤经赤纬投影，夏日大三角居中，挤在一起的座做了最小位移 · 拖动看全 · 没分族的标签散在星座之间（零星的点）</p>
  <ol class="tg-list" id="tgListBox"${mode === 'list' ? '' : ' hidden'}>
    ${rows.map(([g, n], i) => `
    <li class="tg-row" data-name="${esc(g)}">
      <a class="tg-row__a" href="${tagURL(g, 1)}">
        <b class="tg-row__i">${String(i + 1).padStart(2, '0')}</b>
        <span class="tg-row__t">${esc(g)}</span>
        <span class="tg-row__n">${n} 帖</span>
        <span class="mag" style="--glowAmt:${magnitudeGlow(HEAT.toMag(n))}">${icon('star')}<b>${HEAT.toMag(n)}</b>等</span>
      </a>
    </li>`).join('')}
  </ol>`;

  $('#crumb').innerHTML = `<a href="./">首页</a>
    <span class="crumb__sep" aria-hidden="true">›</span>
    <span class="crumb__cur" aria-current="page">标签</span>`;
  $('#bar').hidden = true;
  $('#topics').innerHTML = '';
  $('#pg').innerHTML = '';
  $('#rel').hidden = true;
  const drawHead = () => { const head = $('.tg__head'); if (head) head.classList.add('is-drawn'); };
  requestAnimationFrame(drawHead);
  setTimeout(drawHead, 220);

  const find = $('#tgFind');
  const rowEls = [...document.querySelectorAll('.tg-row')];
  const mapBtn = $('#tgMap'), listBtn = $('#tgList');
  const neb = $('#neb'), legend = $('#nebLegend'), listBox = $('#tgListBox');
  let starsEls = [...document.querySelectorAll('.neb__s')];

  const layout = () => {
    sizeField(neb);
    packNebula(neb);
    if (neb.__pan) neb.__pan.center();
  };

  const apply = () => {
    const q = find.value.trim().toLowerCase();
    let shown = 0;
    starsEls.forEach((a) => {
      const hit = !q || a.getAttribute('data-name').toLowerCase().indexOf(q) >= 0;
      a.classList.toggle('is-dim', !hit);
      a.classList.toggle('is-found', !!q && hit);
      a.tabIndex = hit ? 0 : -1;
      if (hit) shown += 1;
    });
    rowEls.forEach((li) => {
      const hit = !q || li.getAttribute('data-name').toLowerCase().indexOf(q) >= 0;
      li.hidden = !hit;
    });
    if (mode === 'list') shown = rowEls.filter((li) => !li.hidden).length;
    $('#tgFindN').textContent = q ? `${shown} 个匹配` : `${N} 个标签`;
  };

  const setMode = (m) => {
    if (m === mode) return;
    mode = m;
    store.set(VK, m);
    neb.hidden = m !== 'map';
    legend.hidden = m !== 'map';
    listBox.hidden = m !== 'list';
    mapBtn.setAttribute('aria-pressed', String(m === 'map'));
    listBtn.setAttribute('aria-pressed', String(m === 'list'));
    if (m === 'map') layout();
    apply();
  };
  mapBtn.addEventListener('click', () => setMode('map'));
  listBtn.addEventListener('click', () => setMode('list'));
  find.addEventListener('input', apply);

  if (mode === 'map') {
    initPan(neb);
    layout();
  }
  apply();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (mode === 'map') layout(); });
  }
  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (mode === 'map') layout(); }, 180);
  });

  document.title = '全部标签 · 星海社';
}

/* ---------- 标签不存在 ---------- */
function renderMissing(tag) {
  $('#tag').innerHTML = '';
  $('#bar').hidden = true;
  $('#topics').innerHTML = `<div class="empty">
    <span class="empty__mark" aria-hidden="true">${icon('orbit')}</span>
    <p class="empty__t">没有找到「${esc(tag)}」这个标签</p>
    <p class="empty__d">标签只能从站里的帖子来。去全部标签里挑一个，或者用搜索找你想看的东西。</p>
    <a class="btn btn--solid" href="./tag/">看看全部标签</a>
    <a class="btn btn--ghost" href="./search/">站内搜索</a>
  </div>`;
  $('#pg').innerHTML = '';
  $('#rel').hidden = true;
  $('#crumb').innerHTML = `<a href="./">首页</a>
    <span class="crumb__sep" aria-hidden="true">›</span>
    <a href="./tag/">标签</a>
    <span class="crumb__sep" aria-hidden="true">›</span>
    <span class="crumb__cur" aria-current="page">${esc(tag)}</span>`;
  document.title = '标签不存在 · 星海社';
}

/* ---------- 启动 ---------- */
if (!route.tag) {
  renderIndex();
} else if (!TAG_SET.has(route.tag)) {
  renderMissing(route.tag);
} else {
  renderArchive(route.tag);
  const vCard = $('#vCard'), vList = $('#vList'), sel = $('#sortSel');
  const syncBar = () => {
    vCard.setAttribute('aria-pressed', String(view === 'card'));
    vList.setAttribute('aria-pressed', String(view === 'list'));
    sel.value = sort;
  };
  vCard.addEventListener('click', () => {
    if (view === 'card') return;
    view = 'card'; store.set(KEY.view, view); syncBar(); renderArchive(route.tag);
  });
  vList.addEventListener('click', () => {
    if (view === 'list') return;
    view = 'list'; store.set(KEY.view, view); syncBar(); renderArchive(route.tag);
  });
  sel.addEventListener('change', () => {
    sort = sel.value in SORTS ? sel.value : 'latest';
    store.set(KEY.sort, sort);
    renderArchive(route.tag);
  });
  syncBar();
}

/* 探针口子：只读 + 重渲，与 __BOARD / __SEARCH 同一做法 */
window.__TAG = {
  route,
  view: () => view,
  sort: () => sort,
  threads: () => (route.tag ? threadsOf(route.tag) : []),
  heat: () => HEAT,
  groups: () => CONSTELLATIONS.map((c) => ({ id: c.id, name: c.name, n: c.tags.length })),
  render: () => (route.tag ? renderArchive(route.tag) : renderIndex()),
};
