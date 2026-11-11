/* 星海社 · 站内搜索
   ══════════════════════════════════════════════════════════════════
   一列混排的普通搜索结果页。**这一页不画任何图形** —— 用户 2026-10-15：
   「搜索你就别搞这种星系图形了吧…看都看不懂，没什么意义啊」。

   ⚠️ **全部状态走 URL**：`?q=` 查询词 · `?k=` 类型 · `?s=` 排序 · `?p=` 页码。
      所以筛选 / 排序 / 翻页都是**真链接**（不是 button + 客户端状态）——
      可分享、可书签、后退键行为正确，而且没有「点了一下但 URL 没变」的暗状态。
      代价是每次点击都真刷新；一个只渲 20 行的静态页，这个代价是零。

   ⚠️ 三条空态要分清楚，别混成一个「什么都没找到」：
      ① 还没搜（没 q）      → 提示写个词
      ② 搜了但没有          → 说清怎么搜，给三条退路
      ③ 搜到了但这页没有    → 页码越界，把他送回第 1 页 */
(function search() {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (id, cls) => '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  /* 站里的星等徽章：构造与 app.js / board.js / topic.js / auth.js 四处逐字一致 */
  const magPill = (m) => '<span class="mag" style="--glowAmt:' + magnitudeGlow(m) + '" title="星等 ' + m + ' 等 · 越小越亮">'
    + ico('i-star') + '<b>' + m + '</b>等</span>';

  const KIND_ICO = { post: 'i-reply', work: 'i-book', user: 'i-user' };
  const KIND_TXT = { post: '帖子', work: '作品', user: '用户' };
  const SORTS = [['rel', '相关度'], ['mag', '星等'], ['time', '时间']];
  const PER = 20;
  const hue = (it) => (it.hue === undefined ? 218 : it.hue);

  /* ---------- 封面 ----------
     约定与 board.js 逐字同一套：`covers/<boardId>-<子板块>-<帖下标>.svg`，
     而且**只生成到帖下标 2** —— 下标超出的帖**不挂 `<img>`**，直接落在渐变底上：
     既没有 404，也没有空洞（board.js:104 那条注释就是这么写的，照抄）。
     `is-fallback` 会补一层程序化星点，免得渐变太素。
     ⚠️ 所以列表里绝大多数是**程序化封面**，不是真图。真图这一步是「把同名文件丢进 covers/」
        就能生效的 —— 别在这里改判据去猜文件在不在。 */
  const COVER_DIR = './covers/';
  const COVER_MAX_IDX = 2;
  const seedOf = (t) => [...(t.title + (t.author || ''))].reduce((a, c) => a + c.codePointAt(0), 0);
  /* 作者名 → 稳定色相：与 app.js / board.js / topic.js / auth.js 逐字同一个散列 */
  const hueOf = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 360, 7);

  /* 结果行左边那一格。三种结果给三种东西，因为它们是三种东西：
       帖子 → 真封面（有的话）／站里的兜底封面
       作品 → covers/ 里没有作品的图，一律兜底封面；色相由题名散列定，收在站里的冷色区
       用户 → **不用封面，用头像**（`.av`）—— 一个人不该配一张「作品封面」 */
  function thumbOf(r) {
    if (r.kind === 'user') {
      return '<span class="av srch-row__av" style="--ah:' + hueOf(r.title) + '" aria-hidden="true">'
        + esc([...r.title][0]) + '</span>';
    }
    const isPost = r.kind === 'post';
    const h = isPost ? r.hue : 196 + (hueOf(r.title) % 110);
    const hasCover = isPost && r.idx <= COVER_MAX_IDX;
    const img = hasCover
      ? '<img src="' + COVER_DIR + esc(r.boardId) + '-' + r.si + '-' + r.idx + '.svg" alt="" loading="lazy" decoding="async">'
      : '';
    return '<span class="thumb srch-row__ph' + (hasCover ? '' : ' is-fallback')
      + '" style="background:' + coverGradient(seedOf(r), h) + '">' + img + '</span>';
  }

  /* ══════════════════ 读 URL ══════════════════ */
  const P = new URLSearchParams(location.search);
  const Q = String(P.get('q') || '').trim();
  const K = ['post', 'work', 'user'].indexOf(P.get('k')) >= 0 ? P.get('k') : '';
  const S = SORTS.some(([k]) => k === P.get('s')) ? P.get('s') : 'rel';
  const PAGE = Math.max(1, parseInt(P.get('p'), 10) || 1);

  /* 造链接。**所有**链接都走这一个口子 —— 手拼字符串必然会漏掉某一维，
     于是「翻页之后筛选掉了」这种 bug 会静默存在，而且只在某一组参数下出现。 */
  function link(o) {
    const u = new URLSearchParams();
    const q = o.q !== undefined ? o.q : Q;
    const k = o.k !== undefined ? o.k : K;
    const s = o.s !== undefined ? o.s : S;
    const p = o.p !== undefined ? o.p : 1;
    if (q) u.set('q', q);
    if (k) u.set('k', k);
    if (s && s !== 'rel') u.set('s', s);
    if (p > 1) u.set('p', p);
    const str = u.toString();
    return './search/' + (str ? '?' + str : '');
  }

  /* ══════════════════ 排序 ══════════════════
     `SR.run(q)` 的原序就是**相关度序**。另两种只是换个次序，不改内容。 */
  const MAG = (it) => (it.mag === undefined ? 6.5 : it.mag);
  const MINS = (it) => (it.mins === undefined ? Infinity : it.mins);
  function ordered(rows) {
    const r = rows.slice();
    if (S === 'mag') r.sort((a, b) => MAG(a) - MAG(b) || b.score - a.score);
    else if (S === 'time') r.sort((a, b) => MINS(a) - MINS(b) || b.score - a.score);
    return r;
  }

  const hits = Q ? SR.run(Q) : [];
  const counts = SR.counts(hits);
  const filtered = K ? hits.filter((x) => x.kind === K) : hits;
  const all = ordered(filtered);
  const pages = Math.max(1, Math.ceil(all.length / PER));
  const page = Math.min(PAGE, pages);
  const rows = all.slice((page - 1) * PER, page * PER);

  /* ══════════════════ 结果行 ══════════════════ */
  /* 命中处高亮：**必须切在转义之前**，否则 esc 会把 mark 标签也转掉。 */
  function hl(text, q) {
    const t = String(text == null ? '' : text);
    if (!q) return esc(t);
    const i = t.toLowerCase().indexOf(String(q).toLowerCase());
    if (i < 0) return esc(t);
    return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + String(q).length)) + '</mark>' + esc(t.slice(i + String(q).length));
  }

  function rowHTML(r) {
    const isPost = r.kind === 'post';
    /* 第二行：这条**为什么**在这儿。只给分数不说命中位置，那行字就没有用。 */
    const sub = isPost
      ? '<i class="srch-row__bq" style="--h:' + hue(r) + '">' + esc(r.board) + ' / ' + esc(r.section) + '</i>'
        + '<span class="srch-row__by">' + hl(r.author, Q) + '</span>'
        + '<span>' + r.replies + ' 回复 · ' + r.views + ' 浏览</span>'
      : (r.kind === 'work'
        /* 日文名放副行，不拼在主标题后面 —— 「星霜叙事诗 · 星霜叙事詩」并排看着像打错了 */
        ? '<span class="srch-row__by">' + esc(r.jp) + '</span><span>' + esc(r.maker) + '</span><span>' + r.hours + ' 小时</span>'
        : '<span class="srch-row__by">' + r.n + ' 帖</span><span>常驻 '
          + esc((SR.FLAT.find((f) => f.key === r.key) || {}).title || '—') + '</span>');
    /* 右列只有帖子写时间 —— 作品/用户那两行不写：副行已经说完了，再写一遍是同一句话说两次 */
    const right = '<span class="srch-row__r">' + magPill(MAG(r))
      + (isPost ? '<span class="srch-row__x">' + esc(r.date) + '</span>' : '') + '</span>';
    /* 主标题点哪儿：
       · 帖子 → 站内帖子页
       · 作品 → **外链 VNDB**（§34.7：站里不做作品详情页；v17 是占位号）
       · 用户 → **不给链接**。站里没有用户主页（./space/<uid>/ 收的是数字 uid，
                而这批作者是名字），点进去只会搜到它自己 —— 与其做个假的，不如不做。 */
    const titleHTML = r.kind === 'work'
      ? '<a class="srch-row__t" href="https://vndb.org/v17" target="_blank" rel="noopener noreferrer" '
        + 'title="在 VNDB 查看（新窗口）">' + hl(r.title, Q) + '</a>'
      : (r.kind === 'user'
        ? '<span class="srch-row__t">' + hl(r.title, Q) + '</span>'
        : '<a class="srch-row__t" href="./topic/' + esc(r.id) + '/">' + hl(r.title, Q) + '</a>');
    return '<li class="srch-row" data-kind="' + r.kind + '" data-id="' + esc(r.id) + '">'
      + '<span class="srch-row__c">' + thumbOf(r) + '</span>'
      + titleHTML
      + right
      /* 类型那枚是**中性小标签**，不是金色 —— 金色留给「命中字段」，两个都金就看不出主次了。
         图标住在标签**里面**（它自己 aria-hidden），「这是作品不是帖子」由这行**文字**说出来。 */
      + '<span class="srch-row__s"><span class="srch-row__kind">' + ico(KIND_ICO[r.kind])
      + KIND_TXT[r.kind] + '</span>'
      + sub + '<i class="srch-row__hit">' + esc(r.hit) + '命中</i></span>'
      + '</li>';
  }

  /* ══════════════════ 分页（复用 forum.css 的 .pg__*，与板块页同一个件） ══════════════════ */
  function pager() {
    if (pages <= 1) return '';
    const nums = [...new Set([1, 2, page - 1, page, page + 1, pages - 1, pages])]
      .filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    const items = [];
    nums.forEach((n, i) => {
      if (i && n - nums[i - 1] > 1) items.push('<li class="pg__gap" aria-hidden="true">…</li>');
      items.push(n === page
        ? '<li><a class="pg__n" href="' + link({ p: n }) + '" aria-current="page" aria-label="第 ' + n + ' 页，当前页">' + n + '</a></li>'
        : '<li><a class="pg__n" href="' + link({ p: n }) + '" aria-label="第 ' + n + ' 页">' + n + '</a></li>');
    });
    const chev = '<svg class="i pg__chev" aria-hidden="true"><use href="#i-chevron"/></svg>';
    const prev = page > 1
      ? '<a class="pg__step" href="' + link({ p: page - 1 }) + '" rel="prev">' + chev + '上一页</a>'
      : '<span class="pg__step is-off" aria-disabled="true">' + chev + '上一页</span>';
    const next = page < pages
      ? '<a class="pg__step pg__step--next" href="' + link({ p: page + 1 }) + '" rel="next">下一页' + chev + '</a>'
      : '<span class="pg__step pg__step--next is-off" aria-disabled="true">下一页' + chev + '</span>';
    return '<div class="pg__row">' + prev + '<ol class="pg__list">' + items.join('') + '</ol>' + next + '</div>';
  }

  /* ══════════════════ 组装 ══════════════════ */
  function qBar() {
    return '<form class="srch-q" role="search" action="./search/" method="get">'
      + '<span class="srch-q__field">' + ico('i-search')
      + '<input class="srch-q__in" id="srchIn" type="search" name="q" value="' + esc(Q) + '" '
      + 'placeholder="搜索作品 / 帖子 / 用户" aria-label="站内搜索"></span>'
      + '<button class="srch-q__go" type="submit">搜一下</button>'
      + '<p class="srch-q__meta" id="srchMeta">' + metaText() + '</p></form>';
  }
  function metaText() {
    if (!Q) return '输入关键词 —— 帖子搜标题 / 标签 / 正文，作品搜中·日文名与品牌，用户搜星名。';
    if (!hits.length) return '「<b>' + esc(Q) + '</b>」一条也没找到';
    const tail = K ? '，其中' + KIND_TXT[K] + ' <b>' + counts[K] + '</b> 条' : '';
    return '「<b>' + esc(Q) + '</b>」找到 <b>' + hits.length + '</b> 条' + tail;
  }
  function bar() {
    const one = (k, txt, n) => {
      const on = K === k;
      return '<a class="srch-kind" href="' + link({ k: k, p: 1 }) + '" aria-current="' + on + '">'
        + (k ? ico(KIND_ICO[k]) : '') + txt + ' <b>' + n + '</b></a>';
    };
    return '<div class="srch-bar">'
      + '<div class="srch-kinds" role="group" aria-label="按类型筛选">'
      + one('', '全部', hits.length)
      + one('post', KIND_TXT.post, counts.post)
      + one('work', KIND_TXT.work, counts.work)
      + one('user', KIND_TXT.user, counts.user)
      + '</div>'
      + '<div class="srch-bar__r"><span>排序</span><div class="srch-sorts" role="group" aria-label="排序">'
      + SORTS.map(([k, t]) => '<a class="srch-sort" href="' + link({ s: k, p: 1 }) + '" aria-current="' + (S === k) + '">' + t + '</a>').join('')
      + '</div></div></div>';
  }
  function emptyState() {
    if (!Q) {
      return '<div class="srch-idle"><h2 class="srch-idle__h">想找什么？</h2>'
        + '<p>站里现在有 ' + SR.SIZES.posts + ' 条帖子、' + SR.SIZES.works + ' 部作品、' + SR.SIZES.users + ' 位观测者。</p></div>';
    }
    if (!hits.length) {
      return '<div class="srch-empty"><h2 class="srch-empty__h">没有「' + esc(Q) + '」这条星</h2>'
        + '<p>换个词试试 —— 帖子搜标题、标签和正文，作品搜中/日文名与品牌，用户搜星名。</p>'
        + '<div class="srch-empty__sug">试试：'
        + ['星', '银河', '夜狩', '夏空'].map((w) => '<a href="' + link({ q: w, k: '', p: 1 }) + '">' + esc(w) + '</a>').join('')
        + '</div></div>';
    }
    if (!all.length) {
      /* 搜得到、但这个类型筛完是空的（比如搜「星」再切到作品） */
      return '<div class="srch-empty"><h2 class="srch-empty__h">这一搜里没有' + KIND_TXT[K] + '</h2>'
        + '<p>「' + esc(Q) + '」一共找到 ' + hits.length + ' 条，但都属于别的类型。</p>'
        + '<div class="srch-empty__sug"><a href="' + link({ k: '', p: 1 }) + '">看全部 ' + hits.length + ' 条</a></div></div>';
    }
    if (!rows.length) {
      return '<div class="srch-empty"><h2 class="srch-empty__h">这一页是空的</h2>'
        + '<p>「' + esc(Q) + '」只有 ' + pages + ' 页。</p>'
        + '<div class="srch-empty__sug"><a href="' + link({ p: 1 }) + '">回到第 1 页</a></div></div>';
    }
    return '';
  }

  /* 「第 1–20 条 · 共 110 条」—— 翻到第 3 页的人需要知道自己在哪儿。 */
  const from = (page - 1) * PER + 1;
  const slice = rows.length
    ? '<p class="srch-slice">第 ' + from + '–' + (from + rows.length - 1) + ' 条 · 共 ' + all.length + ' 条'
      + (K ? '（' + KIND_TXT[K] + '）' : '') + '</p>'
    : '';

  const body = rows.length
    ? slice + '<ol class="srch-list" id="srchList">' + rows.map(rowHTML).join('') + '</ol>' + pager()
    : (Q ? bar() : '') + emptyState();

  const host = $('#srch');
  if (!host) { window.__ERR = (window.__ERR || '') + 'srch host missing | '; return; }
  host.innerHTML = '<nav class="srch-crumb" aria-label="面包屑"><a href="./">首页</a> › 站内搜索</nav>'
    + '<section class="srch">' + qBar() + (Q ? bar() : '') + body + '</section>';

  /* 顶栏那个搜索框现在是真的（页面里那份是同一件事的第二处，两处都通） */
  document.title = Q ? '「' + Q + '」的搜索结果 · 星海社' : '站内搜索 · 星海社';

  /* 探针口子。只读 —— 这一页没有任何客户端状态可以改，全在 URL 上。 */
  window.__SEARCH = { q: Q, kind: K, sort: S, page: page, pages: pages, per: PER,
    hits: hits.length, filtered: all.length, counts: counts, rows: rows, SR: SR };
})();
