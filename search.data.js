/* 星海社 · 站内搜索的索引与匹配
   ────────────────────────────────────────────────
   三类可搜：**帖子 / 作品 / 用户**（顶栏那个框的 placeholder 就是这么写的）。
   数据全部来自 shared/，本文件**一个字节都不改它们**（§10 硬约束：shared/*.js 只可追加）。

   ⚠️ 确定性是硬要求：同一个 q 每次必须得到**同一批、同一序**的结果。
      否则翻页会串 —— 与 threads.js 的「前缀稳定」同一条理由。
      做法：匹配与排序**全部**只用结果自身的字段（score / mag / mins / id），
      不用 Math.random、不用 Set/Map 的插入序以外的东西。

   暴露：window.SR = { FLAT, posts, works, users, all, run(q), counts(rows), bySection(rows), DEMO, SIZES } */
const SR = (function () {
  const FLAT = flatSections();
  const MAXW = TP_WORKS.length;

  /* ---------- ① 帖子：12 个子板块 × 整池 ---------- */
  const posts = [];
  FLAT.forEach((sec) => {
    boardThreads(sec.boardIndex, sec.sectionIndex, THREAD_POOL_SIZE).forEach((t) => {
      posts.push({
        kind: 'post',
        id: t.tid,
        title: t.title,
        author: t.author,
        excerpt: t.excerpt,
        tags: t.tags || [],
        board: sec.boardTitle,
        section: sec.title,
        key: sec.key,
        bi: sec.boardIndex,
        si: sec.sectionIndex,
        /* 封面要用的两个字段：文件名是 covers/<boardId>-<si>-<idx>.svg
           （与 board.js 的 coverSrc 同一套约定）。idx 同时决定「有没有真封面」——
           covers/ 只生成到帖下标 2，再往后是站里的程序化兜底封面。 */
        boardId: sec.boardId,
        idx: t.idx,
        hue: sec.boardHue,
        mins: t.mins,
        replies: t.replies,
        views: t.views,
        mag: magnitude(t.replies, t.views),
      });
    });
  });

  /* ---------- ② 作品：shared/topic.js 的 TP_WORKS ---------- */
  const works = TP_WORKS.map((w, i) => ({
    kind: 'work',
    id: 'w' + (i + 1),
    title: w.cn,          // 列表里用中文名当主标题
    jp: w.jp,
    maker: w.maker,
    hours: w.hours,
    /* 作品没有「回复数」，用时长折算一个可比的星等 —— 站里的尺是「越小越亮」，
       所以时长越短越亮（短篇更容易被推完，这是站内「推过的作品」那张表的读法）。 */
    mag: Math.round(Math.max(0.6, Math.min(6.5, 6.5 - (w.hours - 14) / 30)) * 10) / 10,
  }));

  /* ---------- ③ 用户：帖子作者聚合 ----------
     ⚠️ 这里**不能**在排序里再 `posts.filter(...)`：那会把 864 条帖子扫 O(用户数 × 板块数 × 864) 遍。
        先在一次遍历里把「作者 × 子板块」的计数摊平成 Map，主板块直接查。 */
  const uMap = new Map();
  const pairCount = new Map();               /* '作者|板块key' → 条数 */
  posts.forEach((p) => {
    let u = uMap.get(p.author);
    if (!u) { u = { kind: 'user', id: 'u:' + p.author, title: p.author, n: 0, last: p.mins, keys: [] }; uMap.set(p.author, u); }
    u.n++;
    if (p.mins < u.last) u.last = p.mins;
    const pk = p.author + '|' + p.key;
    const c = (pairCount.get(pk) || 0) + 1;
    pairCount.set(pk, c);
    if (c === 1) u.keys.push(p.key);         /* 只在这一对第一次出现时记 key */
  });
  const users = [...uMap.values()].map((u) => {
    /* 主板块：发帖最多的那个子板块（并列取 key 小的，保证确定性）—— 行上要写「他常在哪里」 */
    let best = '', bestN = -1;
    u.keys.forEach((k) => {
      const n = pairCount.get(u.title + '|' + k) || 0;
      if (n > bestN || (n === bestN && k < best)) { bestN = n; best = k; }
    });
    return {
      ...u,
      /* 用发帖量折算星等：发得越多越亮（与站里「观测者」那张表的读法一致） */
      mag: Math.round(Math.max(0.6, Math.min(6.5, 6.5 - u.n / 14)) * 10) / 10,
      key: best || '0-0',
    };
  });

  const all = posts.concat(works, users);

  /* ---------- 匹配 ----------
     score 0~1：**越大越贴**。同时记下「命中的是哪个字段」（hit），
     因为结果行必须能说出「这条为什么在这儿」—— 只给分数不说位置，那行字就没有用。 */
  const norm = (s) => String(s == null ? '' : s).toLowerCase();

  function scoreOne(it, q) {
    const Q = norm(q);
    if (!Q) return 0;

    if (it.kind === 'work') {
      const cn = norm(it.title), jp = norm(it.jp), mk = norm(it.maker);
      if (cn === Q) return 1;
      if (cn.indexOf(Q) === 0 || jp === Q) return 0.96;
      if (cn.indexOf(Q) > 0 || jp.indexOf(Q) >= 0) return 0.9;
      if (mk.indexOf(Q) >= 0) return 0.66;
      return 0;
    }

    if (it.kind === 'user') {
      const n = norm(it.title);
      if (n === Q) return 1;
      if (n.indexOf(Q) === 0) return 0.92;
      if (n.indexOf(Q) > 0) return 0.8;
      return 0;
    }

    /* 帖子：标题 > 标签 > 摘要 > 作者 */
    const ti = norm(it.title), ex = norm(it.excerpt), au = norm(it.author);
    if (ti === Q) return 1;
    if (ti.indexOf(Q) === 0) return 0.95;
    if (ti.indexOf(Q) > 0) return 0.88;
    if (it.tags.some((g) => norm(g) === Q)) return 0.82;
    if (it.tags.some((g) => norm(g).indexOf(Q) >= 0)) return 0.7;
    if (au.indexOf(Q) >= 0) return 0.62;
    if (ex.indexOf(Q) >= 0) return 0.55;
    return 0;
  }

  /* 命中字段名（给结果行显示用）。与 scoreOne 的分支**必须一一对应**，
     否则行上会写「标题命中」而分数其实来自摘要。 */
  function hitOf(it, q) {
    const Q = norm(q);
    if (it.kind === 'work') {
      if (norm(it.title).indexOf(Q) >= 0 || norm(it.jp).indexOf(Q) >= 0) return '题名';
      return '品牌';
    }
    if (it.kind === 'user') return '用户名';
    if (norm(it.title).indexOf(Q) >= 0) return '标题';
    if (it.tags.some((g) => norm(g).indexOf(Q) >= 0)) return '标签';
    if (norm(it.author).indexOf(Q) >= 0) return '作者';
    return '正文';
  }

  /* run(q, opts) → 结果数组。
     排序：**先按相关度，再按星等**（同分时亮的在前），最后按 id 兜底保证全序。
     这就是「结果强弱」那根轴的次序 —— 三版里画出来的半径／密度必须与它**同一序**，
     否则图和列表各说各话（§32.3 那条：元素量必须跟数据量对得上）。

     ⚠️ 比较器写成具名函数。之前一版把它压成 `a||b||c ? x : y` 的单行 ——
        `||` 比 `?:` 结合得紧，整条链会变成三元的**判断项**，排序静默全错。 */
  function cmp(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    if (a.mag !== b.mag) return a.mag - b.mag;
    const am = a.mins === undefined ? Infinity : a.mins;
    const bm = b.mins === undefined ? Infinity : b.mins;
    if (am !== bm) return am - bm;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }

  function run(q, opts) {
    const o = opts || {};
    const Q = String(q == null ? '' : q).trim();
    if (!Q) return [];
    const rows = [];
    all.forEach((it) => {
      const s = scoreOne(it, Q);
      if (s > 0) rows.push({ ...it, score: s, hit: hitOf(it, Q) });
    });
    rows.sort(cmp);
    if (o.kind) return rows.filter((r) => r.kind === o.kind);
    return rows;
  }

  const bySection = (rows) => {
    const m = new Map();
    rows.forEach((r) => {
      if (r.kind !== 'post') return;
      m.set(r.key, (m.get(r.key) || 0) + 1);
    });
    return m;
  };
  const counts = (rows) => ({
    post: rows.filter((r) => r.kind === 'post').length,
    work: rows.filter((r) => r.kind === 'work').length,
    user: rows.filter((r) => r.kind === 'user').length,
  });

  /* 演示用：给三条轴各一个「装得满」的默认查询。
     挑法（实测，不是拍脑袋）：'星' 命中面最广 → 用来演 V1 的盘；
     '的' 太普适、'夜' 假名多，都不如 '星' 稳。*/
  const DEMO = '星';

  return { FLAT, posts, works, users, all, run, counts, bySection, hitOf, norm, DEMO,
           SIZES: { posts: posts.length, works: works.length, users: users.length, worksAll: MAXW } };
})();
