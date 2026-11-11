/* 星海社 · 个人空间（./space/<uid>/）
   ------------------------------------------------------------------
   用户 2026-10-13 的定案：「容器封顶 + 子页面分页」、整页「分档：主图 / 三栏目录 / 静区」。

   ⚠️ 这一轮修的是上一版的**两个结构性错误**：
     ① 左右不对称 —— 并排的两块各自为政、中间一个洞（实测星系行差 283px、第二行差 248px）。
        现在：右栏是**竖排的一段**（名册 + 在线时间），整行 stretch，末块 flex 吸收余高。
     ② 溢出没出口 —— 上一版每个容器都按着手上的 mock 条数摆死，没有一个想过 100+。
        现在：五组内容全部走同一套 **封顶 + 「全部 N →」+ 子页面分页**，
        条数从数据里数出来，不是写死的。

   分页组件：DOM 结构与样式（.pg__* 在 forum.css）**照抄 board.js 那一份**，
   但逻辑自己写 —— board.js 文件头自己写着「两个页面不共享 JS 工具，避免为一个页面改动另一个」，
   而且它那份 paginationHTML 内部的 pageURL 是板块路由专属、整个文件一加载就会跑自己的 render。

   ⚠️ 三条老纪律：动效 RM 下必须停成静止帧；坐标确定性；模板里的注释不许出现反引号。 */
(function space() {
  'use strict';
  const S = window.SPACE;
  if (!S) return;
  const V = S.viewer;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hueOf = (s) => [...s].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 360, 7);
  const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ICO = (k) => '<svg class="i" aria-hidden="true"><use href="#' + k + '"/></svg>';

  const BOARD = ['星图馆', '创作所', '观测台'];
  const BOARD_HUE = [218, 268, 196];
  const DAY = ['一', '二', '三', '四', '五', '六', '日'];

  /* 路由：./space/<uid>/[<组>/[<页>/]]
     ⚠️ **先读 query，再回落到 pathname** —— 与 board.js:57 / topic.js:44 同一套写法。
        Apache 的 RewriteRule 发生在**服务端**，浏览器地址栏还是干净的 ./space/1/works/，
        `location.search` 一直是空的。只读 query 的话子页面永远渲染成首页 ——
        而它还会返回 200，`curl` 看不出来（200 只说明文档在，不说明是那一个文档）。
        **这条是昨天的压力测试逼出来的**：三个子页 URL 跑出来全是首页的断言。 */
  function readRoute() {
    const q = new URLSearchParams(location.search);
    let u = (q.get('u') || '').trim();
    let s = (q.get('s') || '').trim();
    let p = (q.get('p') || '').trim();
    if (!s) {
      const m = location.pathname.match(/\/space\/([A-Za-z0-9_-]+)\/?(?:([a-z]+)\/?(?:(\d+)\/?)?)?$/);
      if (m) { u = u || m[1]; s = s || m[2] || ''; p = p || m[3] || ''; }
    }
    return { uid: u || '1', section: s, page: Math.max(1, parseInt(p, 10) || 1) };
  }
  const ROUTE = readRoute();
  const UID = ROUTE.uid;
  const SECTION = ROUTE.section;
  const PAGE = ROUTE.page;
  const PER_PAGE = 24;

  /* ══════════════════ 封顶表（**唯一事实来源**）══════════════════
     首页每个容器显示几条、每页多少条，全在这里。改数量只改这张表 ——
     上一版是把数量写进 HTML 模板里的（「六张一排放六张」），所以一加数据就散。 */
  const LIST = {
    works: { icon: 'k-mark',   title: '推过的作品',  unit: '部', cap: 4, get: () => S.works },
    saved: { icon: 'k-star4',  title: '收藏的帖子',  unit: '篇', cap: 4, get: () => S.saved },
    gal:   { icon: 'k-atlas',  title: 'galgame 履历', unit: '条', cap: 4, get: () => S.gal },
    picks: { icon: 'k-lockon', title: '推荐作品合集', unit: '部', cap: 6, get: () => S.picks },
    lines: { icon: 'k-zenith', title: '本命与名台词', unit: '条', cap: 3, get: () => S.honmei.lines },
  };

  /* ══════════════════ 封面：复用站内 coverGradient + .rec__cover::after ══════════════════ */
  const cov = (seed, hue) => '<span class="rec__cover" style="background:' + coverGradient(seed, hue) + '"></span>';

  /* ══════════════════ 单条渲染器：每种内容一种形态 ══════════════════ */
  const STATE = { done: ['读完', 'sp-gl__s--done'], playing: ['在读', 'sp-gl__s--run'], drop: ['搁置', 'sp-gl__s--drop'] };

  function workCard(w) {
    const badge = w.state === 'playing'
      ? '<span class="sp-post__b">在读 ' + w.prog + '%</span>'
      : w.state === 'drop'
        ? '<span class="sp-post__b sp-post__b--drop">搁置</span>'
        : '<span class="sp-post__b">' + ICO('k-star4') + w.score.toFixed(1) + '</span>';
    return '<a class="sp-post sp-post--work" href="#">'
      + '<span class="sp-post__cov">' + cov(w.seed, w.hue) + badge + '</span>'
      + '<span class="sp-post__tx">' + esc(w.title) + '</span>'
      + '<span class="sp-post__sub">' + esc(w.sub) + '</span></a>';
  }
  function postCard(t) {
    const tid = (typeof threadId === 'function') ? threadId(t.board, t.sec, t.i, t.title, t.author) : 't1001';
    return '<a class="sp-post" href="./topic/' + esc(tid) + '/">'
      + '<span class="sp-post__cov">' + cov(t.seed, t.hue) + '</span>'
      + '<span class="sp-post__tx">' + esc(t.title) + '</span>'
      + '<span class="sp-post__sub"><b style="--h:' + BOARD_HUE[t.board] + '">' + BOARD[t.board] + '</b>'
      + esc(t.author) + ' · ' + esc(t.time) + ' · ' + t.replies + ' 回复</span></a>';
  }
  function galRow(g) {
    const st = STATE[g.state] || STATE.done;
    const score = g.score != null
      ? '<span class="sp-gl__sc">' + g.score.toFixed(1) + '</span>'
      : '<span class="sp-gl__sc sp-gl__sc--run"><i style="--p:' + (g.prog || 0) + '%"></i><b>' + (g.prog || 0) + '%</b></span>';
    return '<li class="sp-gl__r">'
      + '<a class="sp-gl__a" href="./topic/' + (g.tid || 't' + (hueOf(g.title) % 9000 + 1000)) + '/">'
      +   '<time class="sp-gl__d">' + esc(g.date.slice(5).replace('-', '.')) + '</time>'
      +   '<span class="sp-gl__s ' + st[1] + '">' + st[0] + '</span>'
      +   '<span class="sp-gl__t">' + esc(g.title)
      +     (g.star ? '<svg class="sp-gl__fav" viewBox="0 0 24 24" aria-label="本命作品"><use href="#k-star4"/></svg>' : '') + '</span>'
      +   score + '</a>'
      + (g.line ? '<p class="sp-gl__line">' + esc(g.line) + '</p>' : '') + '</li>';
  }
  /* 推荐卡：**不排名次**（用户 2026-10-14：「不要分第一名第二名的」）——
     去掉角标与「第 1 名」那圈金边，只剩封面 + 标题 + 一句理由 + 我的评分。
     评分仍在（那是我给的，不是排名）。 */
  function pickCard(p) {
    return '<a class="sp-pick" href="#">' + cov(p.seed, p.hue)
      + '<span class="rec__veil sp-pick__veil"><b>' + esc(p.title) + '</b><span>' + esc(p.sub) + '</span></span>'
      + (p.score != null ? '<span class="sp-pick__sc">' + ICO('k-star4') + p.score.toFixed(1) + '</span>' : '')
      + '</a>';
  }
  function lineRow(l, i, arr) {
    return '<li><blockquote>' + esc(l.t) + '</blockquote><cite>' + esc(l.from) + '</cite></li>';
  }
  const RENDER = {
    works: (items) => '<div class="sp-grid sp-grid--4">' + items.map(workCard).join('') + '</div>',
    saved: (items) => '<div class="sp-grid sp-grid--4">' + items.map(postCard).join('') + '</div>',
    gal:   (items) => '<ul class="sp-gl">' + items.map(galRow).join('') + '</ul>',
    /* 一行 3 个、最多 2 行（封顶 6 见 LIST）；再多走「全部」子页。
   ⚠️ 用户 2026-10-14：「图太小也不是好事」—— 6 张挤一行那种 220px 的小卡不要。 */
    picks: (items) => '<div class="sp-grid sp-grid--3">' + items.map(pickCard).join('') + '</div>',
    lines: (items) => '<ol class="sp-hm__lines">' + items.map(lineRow).join('') + '</ol>',
  };

  /* ══════════════════ 分页（结构照抄 board.js，逻辑自己写）══════════════════ */
  function pageURL(n) {
    return './space/' + UID + '/' + SECTION + '/' + (n > 1 ? n + '/' : '');
  }
  function paginationHTML(pages, page) {
    if (pages <= 1) return '';
    const nums = [...new Set([1, 2, page - 1, page, page + 1, pages - 1, pages])]
      .filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    const items = [];
    nums.forEach((n, i) => {
      if (i && n - nums[i - 1] > 1) items.push('<li class="pg__gap" aria-hidden="true">…</li>');
      items.push(n === page
        ? '<li><a class="pg__n" href="' + pageURL(n) + '" aria-current="page" aria-label="第 ' + n + ' 页，当前页">' + n + '</a></li>'
        : '<li><a class="pg__n" href="' + pageURL(n) + '" aria-label="第 ' + n + ' 页">' + n + '</a></li>');
    });
    const chev = '<svg class="i pg__chev" aria-hidden="true"><use href="#i-chevron"/></svg>';
    const prev = page > 1
      ? '<a class="pg__step" href="' + pageURL(page - 1) + '" rel="prev">' + chev + '上一页</a>'
      : '<span class="pg__step is-off" aria-disabled="true">' + chev + '上一页</span>';
    const next = page < pages
      ? '<a class="pg__step pg__step--next" href="' + pageURL(page + 1) + '" rel="next">下一页' + chev + '</a>'
      : '<span class="pg__step pg__step--next is-off" aria-disabled="true">下一页' + chev + '</span>';
    return '<div class="pg__row">' + prev
      + '<ol class="pg__list">' + items.join('') + '</ol>' + next
      + '<form class="pg__jump" id="pgJump" aria-label="跳转到指定页" action="' + pageURL(page) + '">'
      +   '<label for="pgIn">跳至</label>'
      +   '<input id="pgIn" type="number" min="1" max="' + pages + '" step="1" inputmode="numeric"'
      +     ' value="' + page + '" aria-label="跳转到第几页">'
      +   '<span class="pg__of">/ ' + pages + ' 页</span>'
      +   '<button class="pg__go" type="submit">跳转</button>'
      + '</form></div>';
  }
  /* 跳页表单是**替换出来的**内容，事件要委托在稳定的祖先上（memories 2.114） */
  document.addEventListener('submit', (e) => {
    const f = e.target.closest && e.target.closest('.pg__jump');
    if (!f) return;
    e.preventDefault();
    const n = Math.max(1, parseInt((f.querySelector('input') || {}).value, 10) || 1);
    location.href = pageURL(n);
  });

  /* ══════════════════ ① 观测证 ══════════════════ */
  function idCard() {
    const m = V.mag;
    /* 星表盘（抄自 v3p topic 的 .gauge）：240° 的刻度盘，指针转到本帖星等，
       中间星芒的大小与辉光＝亮度。--a 是指针角度、--g 是 0~1 的亮度。 */
    const g = magnitudeGlow(m);
    const ang = -120 + (6.5 - m) / 5.9 * 240;
    const px = (deg, r) => (r * Math.sin(deg * Math.PI / 180)).toFixed(1);
    const py = (deg, r) => (-r * Math.cos(deg * Math.PI / 180)).toFixed(1);
    const track = 'M' + px(-120, 86) + ' ' + py(-120, 86) + 'A86 86 0 1 1 ' + px(120, 86) + ' ' + py(120, 86);
    const ticks = [6, 5, 4, 3, 2, 1].map((k) => {
      const d = -120 + (6.5 - k) / 5.9 * 240;
      return '<line x1="' + px(d, 78) + '" y1="' + py(d, 78) + '" x2="' + px(d, 92) + '" y2="' + py(d, 92) + '"/>'
        + '<text x="' + px(d, 66) + '" y="' + (parseFloat(py(d, 66)) + 4).toFixed(1) + '">' + k + '</text>';
    }).join('');
    return '<header class="sp-id">'
      + '<span class="sp-id__av" style="--ah:' + hueOf(V.name) + '" aria-hidden="true">' + esc([...V.name][0]) + '</span>'
      + '<div class="sp-id__who">'
      +   '<h1 class="sp-id__nm">' + esc(V.name) + '<span class="sp-id__kana">' + esc(V.kana) + '</span></h1>'
      +   '<p class="sp-id__sig">' + esc(V.sig) + '</p>'
      +   '<p class="sp-id__meta"><span>入社 ' + esc(V.joinedLabel) + '</span>'
      +     '<span>观测 <b>' + V.days + '</b> 天</span><span>最后在校 ' + esc(V.lastSeen) + '</span></p>'
      + '</div>'
      + '<div class="sp-id__mag" title="星等 ' + m + ' 等 · 越小越亮">'
      +   '<figure class="gauge is-in" style="--a:' + ang.toFixed(1) + 'deg;--g:' + g
      +     '" aria-label="星等 ' + m.toFixed(1) + '，越小越亮">'
      +     '<svg viewBox="-100 -100 200 200" aria-hidden="true">'
      +       '<path class="gauge__trk" d="' + track + '"/>'
      +       ticks
      +       '<g class="gauge__rays"><path d="M0-44c2 26 8 32 30 44-22 12-28 18-30 44-2-26-8-32-30-44 22-12 28-18 30-44z"/></g>'
      +       '<circle class="gauge__core" r="9"/>'
      +       '<g class="gauge__nd"><path d="M0-90l4 12h-8z"/></g>'
      +     '</svg>'
      +     '<figcaption><b>' + m.toFixed(1) + '</b><small>等 · 越小越亮</small></figcaption>'
      +   '</figure>'
      +   '<p class="sp-id__rank">全站第 <b>' + V.rank.toLocaleString() + '</b> 位 · 亮过 <b>' + V.brighter + '%</b> 的观测者</p>'
      + '</div>'
      + '<dl class="sp-id__stats">'
      +   '<div><dt>发帖</dt><dd>' + V.stats.posts + '</dd></div>'
      +   '<div><dt>回复</dt><dd>' + V.stats.replies.toLocaleString() + '</dd></div>'
      +   '<div><dt>被收藏</dt><dd>' + V.stats.saved + '</dd></div>'
      +   '<div><dt>被浏览</dt><dd>' + (V.stats.views / 1000).toFixed(1) + 'k</dd></div>'
      + '</dl></header>';
  }

  /* ══════════════════ ② 本周星系（主图） ══════════════════ */
  const RING = [94, 148, 204, 260];
  const CX = 380, CY = 348;          /* 圆心。viewBox 以它为中心算出来，所以它只是「盘心在哪」 */

  function star4(x, y, s, fill, op) {
    return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')"'
      + ' d="M0-1 L0.26-0.26 1 0 0.26 0.26 0 1-0.26 0.26-1 0-0.26-0.26Z"'
      + ' fill="' + fill + '" opacity="' + op + '"/>';
  }
  function formOf(mag, x, y) {
    const lux = Math.max(0, Math.min(1, (5.5 - mag) / 4.7));
    if (lux > 0.78) {
      return '<ellipse cx="' + x + '" cy="' + y + '" rx="17" ry="6.4" fill="none" stroke="#cfe0ff"'
        + ' stroke-opacity=".42" stroke-width="1" transform="rotate(-22 ' + x + ' ' + y + ')"/>'
        + '<circle cx="' + x + '" cy="' + y + '" r="13" fill="#fff1c9" opacity=".16"/>'
        + star4(x, y, 9.5, '#fff1c9', '.98');
    }
    if (lux > 0.5) return '<circle cx="' + x + '" cy="' + y + '" r="10" fill="#fff1c9" opacity=".14"/>' + star4(x, y, 7.2, '#fff1c9', '.95');
    if (lux > 0.22) return '<circle cx="' + x + '" cy="' + y + '" r="6.5" fill="#cfe0ff" opacity=".14"/>'
      + '<circle cx="' + x + '" cy="' + y + '" r="3.2" fill="#e9f0ff" opacity=".95"/>';
    return '<circle cx="' + x + '" cy="' + y + '" r="2.8" fill="#cfe0ff" opacity=".85"/>';
  }
  function fieldDots(n, seed, w, h) {
    let s = seed >>> 0, out = '';
    const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < n; i++) {
      out += '<circle cx="' + (r() * w).toFixed(1) + '" cy="' + (r() * h).toFixed(1) + '" r="'
        + (0.4 + r() * 0.95).toFixed(2) + '" fill="#cfe0ff" opacity="' + (0.12 + r() * 0.4).toFixed(2) + '"/>';
    }
    return out;
  }
  /* ── 倾斜视角 ──
     轨道是椭圆（ry = rx × K），整盘再绕中心转 TILT —— 与原型 _space.js 的伴星系同一套参数。
     ⚠️⚠️ 公转**不能用 rotate**：`rotate` 只能让星沿**正圆**走；要椭圆就得把星本身压扁、
         名字也跟着歪。我第一版就是图这个方便把轨道改成了正圆，把倾斜视角弄丢了（用户指出来了）。
         正解是 SMIL **`animateMotion` 沿椭圆路径平移** —— 星与名字既不旋转也不被压扁，
         倾斜是白拿的；RM 下不吐 animateMotion，改用算好的静态 translate 即可。 */
  const K = 0.55;          /* 椭圆扁度 ry = rx*K（原型是 0.40；太扁会让上下空掉一大截，见下） */
  const TILT = -33;        /* 整盘倾斜角（原型 -14；配合 K 一起把画面填满，并让两栏装得下右栏） */
  const DIAL_R = 292;
  const TR = Math.abs(TILT) * Math.PI / 180;
  const PAD = 26;          /* 刻度与日期字还要占一圈，viewBox 留这么多余量 */
  /* ⚠️⚠️ viewBox **由几何算出来**，不手写。
     手写 760×700 时实测内部图形 bbox 只有 616×263 —— **上下 62% 是空的**（各空 218 单位），
     用户一眼看出「左侧太多无效空间」。改成按刻度盘旋转后的外接矩形 + 余量来定，
     空多少由几何决定，改半径/倾斜角时不用再去手调 viewBox。
     旋转 θ 后的外接半高 = √((a·sinθ)² + (b·cosθ)²)。 */
  const EXT_X = DIAL_R + PAD;
  const EXT_Y = Math.sqrt(Math.pow(DIAL_R * Math.sin(TR), 2) + Math.pow(DIAL_R * K * Math.cos(TR), 2)) + PAD;
  const W = Math.round(EXT_X * 2), H = Math.round(EXT_Y * 2);
  /* 椭圆周长（Ramanujan 近似）。⚠️ 星等环的 dasharray 必须用它 ——
     按正圆 2πr 算的话，2.8 等会画成 77% 而不是 57%（第一版就是这么错的）。 */
  const peri = (a, b) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  /* 椭圆参数角上的点（**未旋转**坐标系；整盘倾斜由外层那一圈 rotate 统一给） */
  const ep = (rx, deg) => {
    const a = deg * Math.PI / 180;
    return [CX + rx * Math.cos(a), CY + rx * K * Math.sin(a)];
  };
  /* 一整圈椭圆路径，起点在 deg —— 给 animateMotion 用（对径点 = 2C − p，因为椭圆以 C 为中心） */
  const epPath = (rx, deg) => {
    const s = ep(rx, deg), o = [2 * CX - s[0], 2 * CY - s[1]];
    const A = ' A ' + rx + ' ' + (rx * K).toFixed(1) + ' 0 1 1 ';
    return 'M ' + s[0].toFixed(1) + ' ' + s[1].toFixed(1)
      + A + o[0].toFixed(1) + ' ' + o[1].toFixed(1)
      + A + s[0].toFixed(1) + ' ' + s[1].toFixed(1);
  };

  function buildGalaxy() {
    const g = S.galaxy;
    /* 一周七天的刻度盘 —— 也跟着椭圆走，这样星和它自己那一天的刻度在同一条半径上 */
    let dial = '<ellipse cx="' + CX + '" cy="' + CY + '" rx="' + DIAL_R + '" ry="' + (DIAL_R * K).toFixed(1)
      + '" fill="none" stroke="#cfe0ff" stroke-opacity=".12"/>';
    for (let d = 0; d < 7; d++) {
      const a0 = (d / 7) * 360 - 90, a1 = a0 + (14 / DIAL_R) * 57.3;
      const p = ep(DIAL_R, a0), q = ep(DIAL_R - 14, a0), l = ep(DIAL_R + 18, a0);
      /* 辐条：从中心指向那一天 —— 这就是第一版那条「你与他的连接」，在这里成了刻度盘的经线 */
      const sp = ep(52, a0);
      dial += '<line x1="' + sp[0].toFixed(1) + '" y1="' + sp[1].toFixed(1)
        + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1)
        + '" stroke="#cfe0ff" stroke-opacity=".07"/>'
        + '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1)
        + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '" stroke="#cfe0ff" stroke-opacity=".3"/>'
        + '<text class="sp-tx" x="' + l[0].toFixed(1) + '" y="' + (l[1] + 4).toFixed(1)
        + '" text-anchor="middle">' + DAY[d] + '</text>';
      void a1;
    }
    let rings = '';
    RING.forEach((r, i) => {
      rings += '<ellipse cx="' + CX + '" cy="' + CY + '" rx="' + r + '" ry="' + (r * K).toFixed(1)
        + '" fill="none" stroke="#cfe0ff" stroke-opacity="' + (0.26 - i * 0.045).toFixed(2) + '"/>';
    });
    let orbs = '';
    g.forEach((e, i) => {
      const r = RING[e.ring];
      /* 开普勒式：周期 ∝ 半径的 1.5 次方（内快外慢） */
      const dur = Math.round(64 * Math.pow(r / RING[0], 1.5));
      const st = ep(r, e.phase);
      orbs += '<g class="sp-orb" data-i="' + i + '" data-name="' + esc(e.name) + '" data-ring="' + e.ring + '"'
        + ' style="--a0:' + e.phase.toFixed(1) + 'deg;--dur:' + dur + 's"'
        /* ⚠️ 静态 translate 不能省：RM 下不吐 animateMotion，没有它九颗星会全挤在原点 */
        + (RM ? ' transform="translate(' + st[0].toFixed(1) + ' ' + st[1].toFixed(1) + ')"' : '') + '>'
        + (RM ? '' : '<animateMotion dur="' + dur + 's" repeatCount="indefinite"'
          + ' path="' + epPath(r, e.phase) + '"/>')
        /* 星与名字都在这个被平移的组里：两个都不旋转、不被压扁，名字始终正立 */
        +   '<g class="sp-orb__hit" tabindex="0" role="button" aria-label="伴星 ' + esc(e.name)
        +     ' · 星等 ' + e.mag.toFixed(1) + ' · 常驻 ' + BOARD[Object.keys(e.boards).map(Number)[0] || 0]
        +     ' · 本周' + DAY[e.day] + '最活跃 · 离你第 ' + (e.ring + 1) + ' 圈">'
        +     '<title>' + esc(e.name + ' · 星等 ' + e.mag.toFixed(1) + ' · 本周' + DAY[e.day] + '最活跃') + '</title>'
        +     '<circle cx="0" cy="0" r="16" fill="transparent"/>' + formOf(e.mag, 0, 0) + '</g>'
        +   '<text class="sp-mt" x="0" y="-22" text-anchor="middle">' + esc(e.name) + '</text>'
        + '</g>';
    });
    const meStar = '<g class="sp-me">'
      + '<ellipse class="sp-me__pulse" cx="' + CX + '" cy="' + CY + '" rx="34" ry="' + (34 * K).toFixed(1)
      + '" fill="#fff1c9" opacity=".14"/>'
      + '<ellipse cx="' + CX + '" cy="' + CY + '" rx="21" ry="' + (21 * K).toFixed(1) + '" fill="#fff1c9" opacity=".22"/>'
      + '<circle cx="' + CX + '" cy="' + CY + '" r="12" fill="#fff6dc" opacity=".98"/>'
      + star4(CX, CY, 15, '#fff1c9', '.9') + '</g>';
    const m = V.mag, RC = 50, cc = peri(RC, RC * K);
    /* 星等环 = **一圈暗轨 + 一段金弧**。
       ⚠️ 用户 2026-10-14：「为什么要有一个不完整的金黄色轨道？那个是干嘛的」——
          那是因为原来那圈「轨道」的透明度只有 .16，在深底上压根看不见，
          于是金弧看起来像一条**断掉的轨道**而不是一个「进度」。
          把它加亮到 .34，仪表就自己解释了：底圈是满量程，金弧是你走到哪。
       ⚠️ 弧长必须用**椭圆周长**算，不能用 2πr（见 peri() 的注释）。 */
    const ring = '<ellipse cx="' + CX + '" cy="' + CY + '" rx="' + RC + '" ry="' + (RC * K).toFixed(1)
      + '" fill="none" stroke="#cfe0ff" stroke-opacity=".34" stroke-width="2.6"/>'
      + '<ellipse class="sp-me__arc" cx="' + CX + '" cy="' + CY + '" rx="' + RC + '" ry="' + (RC * K).toFixed(1)
      + '" fill="none" stroke="var(--sky-gold)" stroke-width="2.6" stroke-linecap="round"'
      + ' stroke-dasharray="' + ((6.5 - m) / 6.5 * cc).toFixed(1) + ' ' + cc.toFixed(1)
      + '" transform="rotate(-90 ' + CX + ' ' + CY + ')"/>';
    /* 流星的位置**跟着 viewBox 走**（viewBox 是算出来的，写死坐标会飘到画外去）。
       起始点与行程都换算成 CSS 变量，keyframes 里用 var() 读。 */
    const VX = CX - EXT_X, VY = CY - EXT_Y;
    const mv = '--ma-x:' + (W * 0.80).toFixed(0) + 'px;--ma-y:' + (H * 0.72).toFixed(0) + 'px;'
      + '--mb-x:' + (-W * 0.78).toFixed(0) + 'px;--mb-y:' + (H * 0.76).toFixed(0) + 'px';
    const meteors = '<g class="sp-meteor sp-meteor--a" transform="translate(' + (VX + W * 0.08).toFixed(0)
      + ' ' + (VY + H * 0.10).toFixed(0) + ')" aria-hidden="true">'
      +   '<line x1="0" y1="0" x2="-86" y2="-51" stroke="url(#spMeteorGrad)" stroke-width="1.6" stroke-linecap="round"/>'
      +   '<circle cx="0" cy="0" r="1.9" fill="#ffffff" opacity=".9"/></g>'
      + '<g class="sp-meteor sp-meteor--b" transform="translate(' + (VX + W * 0.90).toFixed(0)
      + ' ' + (VY + H * 0.16).toFixed(0) + ')" aria-hidden="true">'
      +   '<line x1="0" y1="0" x2="70" y2="-42" stroke="url(#spMeteorGrad2)" stroke-width="1.4" stroke-linecap="round"/>'
      +   '<circle cx="0" cy="0" r="1.6" fill="#ffffff" opacity=".85"/></g>';
    return '<svg class="sp-sv sp-sv--gal" style="' + mv + '"'
      + ' viewBox="' + VX.toFixed(0) + ' ' + VY.toFixed(0) + ' ' + W + ' ' + H + '" role="img" aria-label="'
      + esc('本周星系：你在中心，' + g.length + ' 位本周热门用户是绕你公转的伴星。'
        + '轨道是一周七天的刻度盘，每颗星的起点是他本周最活跃的那天；半径越近表示他的常驻板块与你越重合。') + '">'
      + '<defs>'
      +   '<linearGradient id="spMeteorGrad" x1="0" y1="0" x2="1" y2="1">'
      +     '<stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>'
      +   '<linearGradient id="spMeteorGrad2" x1="1" y1="0" x2="0" y2="1">'
      +     '<stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>'
      + '</defs>'
      + '<g class="sp-field">' + fieldDots(240, 4821, W, H) + '</g>'
      /* 整盘倾斜：刻度盘 / 轨道 / 星 共用同一个旋转，所以彼此始终对得上 */
      + '<g transform="rotate(' + TILT + ' ' + CX + ' ' + CY + ')">'
      +   dial + rings + orbs + meStar + ring
      + '</g>'
      /* 流星不进倾斜组：它划过的是画面，不是轨道面 */
      + meteors + '</svg>';
  }
  /* ══════════════════ ③ 右栏：本周伴星 ＋ 在线时间（**合成一块**） ══════════════════
     用户 2026-10-14：「在线时间和本周伴星合成一个板块，和本周星系做左右对齐。
     右侧的本周伴星如果过少可以留空，如果过多可以显示纵向滚动，大部分时间不会有滚动条。」

     ⇒ 一块，内部两段：伴星名册（flex 吸收余高、可纵向滚）+ 分隔线 + 在线时间（固定高度）。
        名册 `flex: 1 1 auto; min-height: 0; overflow-y: auto` ——
        人少时它留空（用户认可），人多时它自己滚，其余两段不受影响。
        ⚠️ 高度由 `syncSide()` 钉死成左边那张图的高度（见那里的注释）。 */
  function sideBlock() {
    const p = S.peak;
    const label = '常在 ' + String(p.seg[0]).padStart(2, '0') + ':00 – '
      + String((p.seg[p.seg.length - 1] + 1) % 24).padStart(2, '0') + ':00';
    const rows = S.galaxy.map((e, i) => {
      const b = Object.keys(e.boards).map(Number)[0] || 0;
      return '<li class="sp-roster__r" data-i="' + i + '" tabindex="0">'
        + '<span class="sp-roster__i">' + (i + 1) + '</span>'
        + '<span class="sp-roster__av" style="--ah:' + hueOf(e.name) + '" aria-hidden="true">' + esc([...e.name][0]) + '</span>'
        + '<a class="sp-roster__nm" href="./space/1/">' + esc(e.name) + '</a>'
        + '<span class="sp-roster__bd" style="--h:' + BOARD_HUE[b] + '">' + BOARD[b] + '</span>'
        + '<span class="sp-roster__d">周' + DAY[e.day] + '</span>'
        + '<span class="sp-roster__m">' + e.mag.toFixed(1) + ' 等</span>'
        + '<span class="sp-roster__ring">第 ' + (e.ring + 1) + ' 圈</span></li>';
    }).join('');
    const cells = S.hours.map((v, h) => {
      const txt = h + ':00 · ' + ['不在', '偶尔', '零星', '常来', '常在'][v];
      return '<li class="sp-hr__c" data-v="' + v + '" title="' + txt + '">'
        + '<span class="sp-hr__b"></span><b class="sp-hr__h">' + h + '</b>'
        + '<span class="sp-hr__t">' + txt + '</span></li>';
    }).join('');
    return '<section class="sp-block sp-block--side">'
      + '<div class="sp-sec sp-sec--roster">'
      +   '<h2 class="sp-block__h">' + ICO('k-scope') + '本周伴星'
      +     '<span class="sp-block__n">' + S.week + ' 周 · ' + S.galaxy.length + ' 位</span></h2>'
      +   '<ul class="sp-roster" tabindex="0" aria-label="本周伴星，共 ' + S.galaxy.length + ' 位">' + rows + '</ul>'
      + '</div>'
      + '<div class="sp-sec sp-sec--hr">'
      +   '<h2 class="sp-block__h">' + ICO('k-dusk') + '在线时间'
      +     '<span class="sp-block__n">' + label + '</span></h2>'
      +   '<ul class="sp-hr" aria-label="一天 24 小时的在线强度，从不在到常在共五档">' + cells + '</ul>'
      +   '<p class="sp-hr__note"><span class="sp-hr__k">少</span>'
      +     '<i class="sp-hr__sw" data-v="0"></i><i class="sp-hr__sw" data-v="1"></i>'
      +     '<i class="sp-hr__sw" data-v="2"></i><i class="sp-hr__sw" data-v="3"></i><i class="sp-hr__sw" data-v="4"></i>'
      +     '<span class="sp-hr__k">多</span>'
      +     '<span class="sp-hr__tot">本周 <b>' + S.weekHours.toFixed(1) + '</b> 小时</span>'
      +   '</p>'
      + '</div></section>';
  }

  /* ══════════════════ ④ 容器：封顶预览 + 「全部 N →」 ══════════════════
     这是这一轮的核心修正：**条数从数据里数出来**，上限从封顶表来，
     超过上限才出出口，出口指向该组的子页面（带站里那套分页）。 */
  function moreLink(key, total) {
    const L = LIST[key];
    if (total <= L.cap) return '';
    return '<a class="sp-more" href="./space/' + UID + '/' + key + '/">全部 ' + total + ' ' + L.unit + ' →</a>';
  }
  /* ⚠️ 有出口时**不再单列「共 N …」** —— 「全部 6 部 →」里已经带着条数了。
     两样都写，在四栏目录那种 330px 宽的栏里会把表头挤成两行（第一版就是这样，
     「全部」掉到第二行去，白白吃掉一行高度）。 */
  function head(key, total) {
    const L = LIST[key];
    const more = moreLink(key, total);
    return '<h2 class="sp-block__h">' + ICO(L.icon) + L.title
      + (more ? more : '<span class="sp-block__n">共 ' + total + ' ' + L.unit + '</span>')
      + '</h2>';
  }
  function previewBlock(key) {
    const L = LIST[key];
    const all = L.get();
    const items = all.slice(0, L.cap);
    const empty = items.length === 0
      ? '<p class="sp-empty">还没有内容。</p>' : RENDER[key](items);
    return '<section class="sp-block sp-block--' + key + '">' + head(key, all.length) + empty
      + (all.length > L.cap ? '<p class="sp-tally">还有 ' + (all.length - L.cap) + ' ' + L.unit + '在「全部」里</p>' : '')
      + '</section>';
  }

  /* ══════════════════ ⑤ 子页面：某一组的「全部」 ══════════════════ */
  function sectionPage(key) {
    const L = LIST[key];
    if (!L) return '<p class="sp-empty">没有这一组。</p>';
    const all = L.get();
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    const page = Math.min(PAGE, pages);
    const items = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    return '<div class="sp-sechead">'
      + '<a class="sp-back" href="./space/' + UID + '/">← 回到 ' + esc(V.name) + ' 的空间</a>'
      + '<h1 class="sp-sechead__t">' + ICO(L.icon) + L.title + '</h1>'
      + '<p class="sp-sechead__n">共 <b>' + all.length + '</b> ' + L.unit + ' · 第 <b>' + page + '</b> / ' + pages + ' 页</p>'
      + '</div>'
      + '<section class="sp-block sp-block--full">' + RENDER[key](items) + '</section>'
      + paginationHTML(pages, page);
  }

  /* 本命：不走 previewBlock —— 它除了名台词列表还有头像那一行 */
  function honmeiBlock() {
    const H = S.honmei;
    return '<section class="sp-block sp-block--hm">'
      + head('lines', H.lines.length)
      + '<div class="sp-hm__top">'
      +   '<span class="sp-hm__av" style="--ah:' + H.char.hue + '" aria-hidden="true">' + esc([...H.char.name][0]) + '</span>'
      +   '<div><b class="sp-hm__nm">' + esc(H.char.name) + '</b>'
      +     '<span class="sp-hm__from">' + esc(H.char.from) + '</span></div>'
      +   '<span class="sp-hm__mk">' + esc(H.maker.name) + '<em>' + H.maker.works + ' 部全读完</em></span>'
      + '</div>'
      + RENDER.lines(H.lines.slice(0, LIST.lines.cap))
      + '<p class="sp-hm__note">' + esc(H.maker.note) + '</p></section>';
  }

  /* ══════════════════ ⑥ 整页组装：分档 ══════════════════
     档 1  主图 + 侧栏（名册 + 在线时间）   左 1.32fr / 右 1fr，整行 stretch
     档 2  四栏目录（作品/收藏/履历/本命）   等宽，各封顶 + 出口
     档 3  推荐合集 · **通栏**              3 张横条天然填不满半栏，做成一条带
     ⚠️ 上一版把推荐放在半栏里，和本命并排 —— 实测 173px vs 389px，底下空 216px，
        正是用户说的「左右不对称」，只是换了个位置复发。横条类内容要通栏，不能塞半栏。 */
  function homePage() {
    return idCard()
      /* ⚠️ 图的标题**提到通栏一行**，不留在左栏里。
         留在左栏时，左栏 = 标题 + 面板 + 图例，右栏 = 一张卡，两栏虽然等高，
         但**卡的上沿比深色面板高 50px**（正好是标题那一行）—— 看着还是错位的。
         提出来之后两栏从同一条线起。 */
      + '<div class="sp-herocap">'
      +   '<h2>本周星系</h2><p>半径 ＝ 离你多近 · 外圈 ＝ 一周七天</p></div>'
      + '<div class="sp-cols sp-cols--hero">'
      +   '<figure class="sp-plot">'
      +     '<div class="sp-plot__box">' + buildGalaxy() + '</div>'
      +     '<ul class="sp-plot__legend">'
      +       '<li><i class="sp-k sp-k--me"></i><span>你 · 星等 ' + V.mag.toFixed(1) + '（金环＝星等表）</span></li>'
      +       '<li><i class="sp-k sp-k--mate"></i><span>本周热门用户做伴星</span></li>'
      +       '<li><i class="sp-k sp-k--lk"></i><span>外圈刻度 ＝ 周一…周日</span></li>'
      +     '</ul></figure>'
      +   '<div class="sp-side">' + sideBlock() + '</div>'
      + '</div>'
      + '<div class="sp-cols sp-cols--dir">'
      +   previewBlock('works') + previewBlock('saved') + previewBlock('gal') + honmeiBlock()
      + '</div>'
      + '<div class="sp-band">' + previewBlock('picks') + '</div>'
      + '<p class="sp-weeknote">本周星系于 <b>' + S.week + '</b> 周由服务器分配 · 数据均为虚构 · 版式三 · 个人空间</p>';
  }

  /* ══════════════════ 渲染 + 接线 ══════════════════ */
  /* 右栏高度**钉死**成左边那张图的高度。
     为什么不能只靠 grid 的 align-items: stretch：那只是「把格子拉到行高」，
     而行高是**两侧内容取大**。名册一旦很长（50 位伴星），它就自己把行撑高，
     图下面反而空出来一大块 —— 正是用户要消掉的那种不对称。
     所以显式量一次图高、写进 --side-max，让名册在这一高度里滚。
     （纯 CSS 做不到：对侧元素的高度在 CSS 里读不到，百分比也解不开这个环。） */
  function syncSide() {
    const hero = document.querySelector('.sp-cols--hero');
    const col = document.querySelector('.sp-plot');
    const side = document.querySelector('.sp-side');
    if (!hero || !col || !side) return;
    /* ⚠️ 只在**并排**时才钉高度。≤1280 折成一栏后右栏堆在图底下，那时没有「左右」可比。 */
    const twoCol = getComputedStyle(hero).gridTemplateColumns.split(' ').length === 2;
    if (!twoCol) { side.style.maxHeight = ""; return; }

    const lane = Math.round(col.getBoundingClientRect().height);
    /* 先摘掉上限量一次**自然高**，再加回去 —— 否则量到的是上一次钉住的结果。 */
    side.style.maxHeight = '';
    const natural = Math.round(side.getBoundingClientRect().height);
    /* ⚠️ 允许右栏比图**高 ≤60px**。死抠「差 0」的话，两栏在最窄端（图最矮）
       右栏就装不下 9 行名册，只能滚 —— 而「等高」不该拿名册滚动来换。
       实测：1400 差 0；1281 差 12；再窄就折成一栏了。 */
    side.style.maxHeight = Math.max(lane, Math.min(natural, lane + 60)) + 'px';
  }

  function wire() {
    const svg = document.querySelector('.sp-sv--gal');
    if (!svg) return;
    const byIdx = {};
    svg.querySelectorAll('.sp-orb').forEach((o) => { byIdx[o.dataset.i] = o; });
    document.querySelectorAll('.sp-roster__r').forEach((row) => {
      const on = () => { const o = byIdx[row.dataset.i]; if (o) o.classList.add('is-hot'); };
      const off = () => { const o = byIdx[row.dataset.i]; if (o) o.classList.remove('is-hot'); };
      row.addEventListener('mouseenter', on); row.addEventListener('focus', on);
      row.addEventListener('mouseleave', off); row.addEventListener('blur', off);
    });
    /* 图上的星被指到时暂停公转（CSS 管不了 SMIL，所以用 JS 暂停） */
    svg.querySelectorAll('.sp-orb').forEach((o) => {
      const anis = o.querySelectorAll('animateTransform');
      if (!anis.length) return;
      const set = (run) => anis.forEach((a) => { try { run ? a.unpauseAnimations() : a.pauseAnimations(); } catch (e) { /* 忽略 */ } });
      o.addEventListener('mouseenter', () => set(false));
      o.addEventListener('mouseleave', () => set(true));
      o.addEventListener('focusin', () => set(false));
      o.addEventListener('focusout', () => set(true));
    });
  }

  function render() {
    const stage = document.getElementById('stage');
    if (!stage) return;
    stage.innerHTML = SECTION ? sectionPage(SECTION) : homePage();
    document.title = (SECTION ? LIST[SECTION].title + ' · ' : '') + V.name + ' 的个人空间 · 星海社';
    const crumb = document.getElementById('spCrumb');
    if (crumb) {
      crumb.innerHTML = SECTION
        ? '<a href="./space/' + UID + '/">' + esc(V.name) + '</a> › <b>' + esc(LIST[SECTION].title) + '</b>'
        : '<b>' + esc(V.name) + '</b>';
    }
    wire();
    syncSide();
  }
  /* 视口一变，图的宽高跟着变 ⇒ 右栏那个上限也要重算 */
  let sideT = 0;
  addEventListener('resize', () => { clearTimeout(sideT); sideT = setTimeout(syncSide, 120); });

  window.__SPACE = {
    render, LIST, galaxy: S.galaxy, week: S.week, RM, uid: UID, section: SECTION, page: PAGE,
  };
  render();
})();
