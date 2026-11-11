/* 星海社 · 个人空间（./space/<uid>/）
   ------------------------------------------------------------------
   ⚠️ 纪律：人名 / 作品名 / 板块名 / 帖子标题**一律取自 shared/data.js 站内既有数据**，
      这一份里没有一个是新造的。唯一「算出来」的东西是本周星系的名单与热度，
      算法写在下面 deriveGalaxy() 里，可复现。
   ⚠️ 星等沿用站里的标度（shared/threads.js:401，0.6–6.5，**越小越亮**）。
   ------------------------------------------------------------------ */
window.SPACE = (() => {
  /* ⚠️ shared/data.js 里写的是 `const FORUM = {...}` —— 顶层 const 在传统脚本里是
     **全局词法绑定**，不是 window 的属性。所以 `window.FORUM` 恒为 undefined，
     本文件第一版就栽在这里：一开就抛，window.SPACE 永远不存在，页面只剩空壳（截图里
     顶栏在、正文全空）。取它必须用裸名，或者两种写法都兜一下。 */
  const F = (typeof FORUM !== 'undefined' && FORUM) || window.FORUM;

  /* ══════════ 观测者本人 ══════════ */
  const viewer = {
    uid: 1,
    name: '夜狩',
    kana: 'よるかり',
    sig: '先看完，再说话。',
    joined: '2025-08-30',
    joinedLabel: '2025 年 8 月 30 日',
    days: 412,
    lastSeen: '2 分钟前',
    /* 星等（越小越亮）。2.8 等 ≈ 站内「很活跃」那一档；站里最热的标签是 0.8 等。 */
    mag: 2.8,
    rank: 1204,
    brighter: 91,
    stats: { posts: 214, replies: 1847, saved: 92, views: 46210 },
  };

  /* ══════════ 在线时间 · 一天 24 小时的热力（0–4）══════════
     不是随机数：手写死，每次渲染一样，截图可比、探针可断言。
     形状＝一个熬夜看 gal 的人：22 点到凌晨 1 点是高峰，白天几乎不在。 */
  const hours = [
    4, 3, 1, 0, 0, 0, 0, 0, 0, 0,     /* 00–09 */
    1, 1, 1, 1, 1, 1, 2, 2, 2, 3,     /* 10–19 */
    3, 3, 4, 4,                        /* 20–23 */
  ];
  /* ⚠️ 阈值取 **4（＝「常在」这一级本身）**，不是 3。
     取 3 会把「常来」也算进去，窗口从 19:00 一直拖到 02:00（七个小时），
     而这一档的语义就是「常在」—— 拿 4 才和格子上的档位对得上：22:00 – 01:00。 */
  const PEAK_V = 4;
  const peakOf = (arr) => {
    let best = 0;
    arr.forEach((v, i) => { if (v > arr[best]) best = i; });
    let s = best, e = best, k = 0;
    while (k++ < 24 && arr[(s + 23) % 24] >= PEAK_V) s = (s + 23) % 24;
    k = 0;
    while (k++ < 24 && arr[(e + 1) % 24] >= PEAK_V) e = (e + 1) % 24;
    const seg = [];
    for (let i = s, n = 0; n < 24; i = (i + 1) % 24, n++) { seg.push(i); if (i === e) break; }
    return { best, seg };
  };
  const peak = peakOf(hours);
  const hourTotal = hours.reduce((a, b) => a + b, 0);
  /* 24 格折成「本周约几小时」：把 0–4 的档位折成 0–1.25 小时/天，再乘 7 */
  const weekHours = Math.round(hours.reduce((a, b) => a + b * 0.3125, 0) * 7 / 7 * 10) / 10;

  /* ══════════ 本周星系 ══════════
     用户 2026-10-13：「服务器每周会分配一个星系，每个 uid 都会有几个其他用户
     （本周热门用户）做伴星。越热门的用户星越特别，自己的星也要特别。」

     ⚠️ 演示站没有服务器，所以这里**按 ISO 周确定性派生** —— 同一周内刷新多少次名单都一样，
        下一周自动换一批。接入后端时只需要把这个函数换成一次 GET。
     ① 作者池：全站帖子 + 最新回复流里出现过的作者，去重，去掉自己和 anonymous；
     ② 热度（星等）：由他在站内出现的次数折算到站里那条 0.8–5.5 标度；
     ③ 离你的距离：你常驻哪个板块，那个板块的作者就越靠内（见 affinity）；
     ④ 活跃日：演示站按名字散列定，后端接入后换成真实统计。 */
  function isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 86400000 + 1) / 7);
  }
  const hash = (s) => [...String(s)].reduce((a, c) => (a * 33 + c.codePointAt(0)) >>> 0, 5381);

  const pool = new Map();                       /* name -> { name, boards:{}, posts, heat } */
  const bump = (name, board, replies) => {
    if (!name || name === 'anonymous' || name === viewer.name) return;
    const e = pool.get(name) || { name, boards: {}, posts: 0, heat: 0 };
    e.boards[board] = (e.boards[board] || 0) + 1;
    e.posts += 1;
    e.heat += (replies || 1) + 1;
    pool.set(name, e);
  };
  F.boards.forEach((b, bi) => b.sections.forEach((s) => s.threads.forEach((t) => bump(t.author, bi, t.replies))));
  F.latestReplies.forEach((r) => bump(r.author, r.board, 1));

  /* 你本人的板块分布 —— 就从上面那套数据里数出来（星图馆 3 次：两条帖 + 一条回复流） */
  const me = { boards: {}, posts: 0 };
  F.boards.forEach((b, bi) => b.sections.forEach((s) => s.threads.forEach((t) => {
    if (t.author === viewer.name) { me.boards[bi] = (me.boards[bi] || 0) + 1; me.posts += 1; }
  })));
  F.latestReplies.forEach((r) => { if (r.author === viewer.name) me.boards[r.board] = (me.boards[r.board] || 0) + 1; });
  const meTotal = Object.values(me.boards).reduce((a, b) => a + b, 0) || 1;

  const MAXHEAT = Math.max(...[...pool.values()].map((e) => e.heat), 1);
  const MINHEAT = Math.min(...[...pool.values()].map((e) => e.heat), 0);
  const week = isoWeek(new Date());
  const list = [...pool.values()]
    .map((e) => {
      /* ③ 离你多近：他的板块分布 · 你的板块分布（越重合越靠内） */
      let aff = 0;
      Object.keys(e.boards).forEach((b) => { aff += (me.boards[b] || 0) / meTotal * e.boards[b]; });
      return {
        name: e.name,
        boards: e.boards,
        posts: e.posts,
        /* ② 星等：站内出现次数越多越亮 —— 与站里 tagHeat 那条 0.8–5.5 同一个口径 */
        mag: +(0.8 + (MAXHEAT - e.heat) / Math.max(1, MAXHEAT - MINHEAT) * 4.7).toFixed(1),
        aff: +aff.toFixed(2),
        /* ④ 本周最活跃的一天（0=周一 … 6=周日） */
        day: hash(e.name + 'w' + week) % 7,
        seed: hash(e.name) % 1000,
      };
    })
    /* 本周名单：按「名字 + 周数」散列排序后取前 9 —— 同周可复现，跨周自动换 */
    .sort((a, b) => (hash(a.name + '#' + week) - hash(b.name + '#' + week)))
    .slice(0, 9)
    /* 排完再按「离你多近」定轨道，这样名单是周的、半径是关系的，两件事不混 */
    .sort((a, b) => (b.aff - a.aff) || (a.mag - b.mag))
    .map((e, i, arr) => Object.assign(e, {
      ring: 0,                                  /* 由外向内分配，见下 */
      order: i,
      total: arr.length,
    }));
  /* 四圈：按 aff 降序，前 2 / 3 / 4 分位。aff 全为 0 时退化成按星等排 */
  list.forEach((e, i) => {
    const t = i / Math.max(1, list.length - 1);
    e.ring = t < 0.22 ? 0 : t < 0.5 ? 1 : t < 0.78 ? 2 : 3;
  });
  /* 起相位：本周最活跃那天。
     ⚠️ **同一天的人必须平分那一天的角度扇区**（360/7 ≈ 51.4°）—— 否则同一天、又同一圈的
        两个人会算出几乎相同的角度，在图上叠成一颗星。第一次跑就撞了：初雪与纸月都是周日均在第 3 圈，
        九个人只剩五个亮点。 */
  const byDay = [[], [], [], [], [], [], []];
  list.forEach((e) => byDay[e.day].push(e));
  byDay.forEach((grp, d) => grp.forEach((e, j) => {
    e.phase = d / 7 * 360 + (j + 0.5) / grp.length * (360 / 7);
  }));

  /* ══════════ galgame 履历 ══════════ */
  const gal = [
    { date: '2026-10-11', title: '星霜叙事诗', state: 'done', score: 9.4, line: '把三条线都读完，才发现序章那句「我回来了」是伏笔。', star: true, replies: 86, tid: 't11012f25' },
    { date: '2026-10-02', title: '雨上がりの栞', state: 'done', score: 8.9, line: '悬疑的部分一般，但第四章那场雨的声音做得太好了。', replies: 39 },
    { date: '2026-09-18', title: '銀河鉄道の夜に', state: 'playing', prog: 42, line: '慢热。第二夜的独白之后才开始好看起来。', replies: 12 },
    { date: '2026-08-30', title: '夏空の向こう側', state: 'done', score: 9.1, line: '入坑作。汉化补丁就是本站译星工房出的。', replies: 24 },
    { date: '2026-07-22', title: '海辺の手紙', state: 'done', score: 8.2, line: '', replies: 8 },
    { date: '2026-06-14', title: '四月の嘘つき', state: 'drop', score: 6.5, line: '推了两章，主角的动机一直没立住，先放着。', replies: 5 },
  ];

  /* ══════════ 推过的作品（封面墙）══════════
     六张＝站里 FORUM.recommend 那五部 + 帖子里出现过的《夏空の向こう側》。
     seed 与 hue 决定封面：直接用站里的 coverGradient()，封面语言与首页推荐卡一模一样。 */
  const works = [
    { title: '星霜叙事诗', sub: 'ADV · 全年龄', seed: 11, hue: 218, score: 9.4, state: 'done' },
    { title: '夏空の向こう側', sub: 'ADV · 青春', seed: 27, hue: 196, score: 9.1, state: 'done' },
    { title: '雨上がりの栞', sub: 'AVG · 悬疑', seed: 43, hue: 268, score: 8.9, state: 'done' },
    { title: '海辺の手紙', sub: 'ADV · 青春', seed: 61, hue: 218, score: 8.2, state: 'done' },
    { title: '銀河鉄道の夜に', sub: 'ADV · 文艺', seed: 78, hue: 268, score: null, prog: 42, state: 'playing' },
    { title: '四月の嘘つき', sub: 'ADV · 治愈', seed: 96, hue: 196, score: 6.5, state: 'drop' },
  ];

  /* ══════════ 推荐作品合集 ══════════
     ⚠️ 用户 2026-10-14：「不要分第一名第二名的，还有 3 个太少了」。
        上限改成 6（见 space.js 的 LIST），条目也不再只有 gal ——
        站里的画集 / 自制游戏 / 翻唱 / 连载**都是作品**，收进来这一区才真的有量。
        标题与作者**逐字取自 shared/data.js 的帖子池**，没有一个是新造的。
     `no` 字段已删：不再排名次。 */
  const picks = [
    { title: '星霜叙事诗', sub: '三条线都读完才明白序章那句话。', seed: 11, hue: 218, score: 9.4 },
    { title: '夏空の向こう側', sub: '我的入坑作，那年夏天一直在听主题曲。', seed: 27, hue: 196, score: 9.1 },
    { title: '雨上がりの栞', sub: '第四章那场雨，值得为它单独开一次音响。', seed: 43, hue: 268, score: 8.9 },
    { title: '《星屑抄》同人画集', sub: '纸月画的，每一张都能当壁纸。', seed: 55, hue: 268, score: 8.6 },
    { title: '自制短篇 gal《回声》', sub: '一个人做完的，第二章的演出很惊喜。', seed: 67, hue: 196, score: 8.8 },
    { title: '翻唱《银の旋律》', sub: '副歌那一段第一次听起了鸡皮疙瘩。', seed: 79, hue: 218, score: 8.4 },
    { title: '《星屑抄》短篇：写给十年后的你', sub: '三千字，看完沉默了一会儿。', seed: 91, hue: 268, score: 8.7 },
    { title: '《观测者手记》第一卷', sub: '连载，设定扎实，前期铺垫耐心。', seed: 103, hue: 218, score: 8.5 },
  ];

  /* ══════════ 本命与名台词 ══════════ */
  const honmei = {
    char: { name: '白井 结衣', from: '星霜叙事诗', hue: 268, line: '「……我回来了。这次，不会再走了。」' },
    maker: { name: '八月の空', works: 5, note: '五部全推完，一部没落。' },
    lines: [
      { t: '「……我回来了。这次，不会再走了。」', from: '白井 结衣 · 星霜叙事诗' },
      { t: '「夏天结束的时候，我才会告诉你我的名字。」', from: '海辺の手紙 · 终章' },
      { t: '「轨道是对的，只是我坐反了方向。」', from: '銀河鉄道の夜に · 第二夜' },
    ],
  };

  /* ══════════ 收藏的帖子（卡片）══════════
     标题 / 作者 / 时间 / 回复数**逐字取自 shared/data.js**；tid 由站里同一个 threadId() 生成。 */
  const saved = [
    { board: 0, sec: 0, i: 0, title: '聊聊那些「开局即巅峰」的序章设计', author: '浅葱', time: '1 小时前', replies: 43, seed: 3, hue: 218 },
    { board: 0, sec: 1, i: 0, title: '整理了一份 2015-2020 冷门良作清单（附度盘）', author: '旧书', time: '27 分钟前', replies: 152, seed: 9, hue: 196 },
    { board: 0, sec: 2, i: 2, title: '关于人名译法的一些讨论（附对照表）', author: '青空', time: '昨天', replies: 55, seed: 17, hue: 268 },
    { board: 1, sec: 0, i: 0, title: '画了星霜的女主，试试新的上色流程', author: '薄明', time: '14 分钟前', replies: 63, seed: 24, hue: 268 },
    { board: 1, sec: 2, i: 0, title: '《星屑抄》短篇：写给十年后的你', author: '纸月', time: '33 分钟前', replies: 52, seed: 31, hue: 218 },
    { board: 1, sec: 3, i: 0, title: '自制短篇 gal《回声》第一版 demo 发布', author: 'anonymous', time: '55 分钟前', replies: 91, seed: 38, hue: 196 },
    { board: 2, sec: 0, i: 2, title: '大家的入坑作是哪一部？', author: '初雪', time: '昨天', replies: 205, seed: 45, hue: 218 },
    { board: 2, sec: 2, i: 0, title: 'Win11 下老 gal 字体乱码怎么解决？', author: '灰鸦', time: '88 分钟前', replies: 19, seed: 52, hue: 268 },
  ];

  return { viewer, hours, peak, weekHours, hourTotal, galaxy: list, week, gal, works, picks, honmei, saved };
})();
