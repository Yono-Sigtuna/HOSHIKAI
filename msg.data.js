/* 星海社 · 消息·通知页（./msg/）—— mock 数据
   ------------------------------------------------------------------
   ⚠️ 纪律：**人名 / 帖子标题 / 板块名一律取自 shared/data.js 站内既有数据**，
      这一份里没有一个是新造的。只有「谁在哪条帖子里回复了我、几小时前」
      这一层是算出来的（下面 derive 里写死 + 由名字散列出色相，可复现）。
   ⚠️ 星等沿用站里的标度（shared/threads.js:401，0.6–6.5，**越小越亮**）。
   ------------------------------------------------------------------ */
window.MSG = (() => {
  /* shared/data.js 里写的是 `const FORUM = {...}` —— 顶层 const 是**全局词法绑定**，
     不是 window 的属性，所以必须用裸名取（space.data.js 第一版就栽在这里）。 */
  const F = (typeof FORUM !== 'undefined' && FORUM) || window.FORUM;

  const me = { name: '夜狩' };

  /* 作者名 → 稳定色相（与首页 / 板块页同一套散列，同一人在全站颜色一致） */
  const hueOf = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.codePointAt(0)) % 360, 7);

  /* ══════════ 通知分组 ══════════
     一条帖子／一件事 = 一组（收件箱的常规组织法）。
     `min` 是「这一组里最近一条」距今多少分钟 —— 三个版本都拿它当时间轴。
     `read` 是这一组**已读**的条数；`unread = actors.length - read`。 */
  const raw = [
    { tid: 't11012f25', thread: '《星霜叙事诗》全线通关，聊聊那个被删掉的结局',
      board: '星图馆 · 星轨研讨室', kind: 'reply', min: 12, read: 0,
      actors: [{ name: '旧书', mag: 0.8, min: 12 }, { name: '浅葱', mag: 2.9, min: 34 }, { name: '初雪', mag: 1.5, min: 96 }] },

    { tid: 't11010f21', thread: '整理了一份 2015-2020 冷门良作清单（附度盘）',
      board: '星图馆 · 星尘仓库', kind: 'star', min: 47, read: 0,
      actors: [{ name: '纸月', mag: 3.9, min: 47 }, { name: '灰鸦', mag: 2.9, min: 55 }] },

    { tid: 't11011f31', thread: '画了星霜的女主，试试新的上色流程',
      board: '创作所 · 陨石画室', kind: 'reply', min: 180, read: 0,
      actors: [{ name: '薄明', mag: 4.1, min: 180 }, { name: '桐谷', mag: 2.6, min: 240 }] },

    { tid: 't11012f33', thread: '《星屑抄》短篇：写给十年后的你',
      board: '创作所 · 银河书简', kind: 'mention', min: 1440, read: 1,
      actors: [{ name: '纸月', mag: 3.9, min: 1440 }, { name: '音监', mag: 5.0, min: 1500 }, { name: '铃兰', mag: 1.3, min: 1620 }] },

    { tid: 't11013f41', thread: '大家的入坑作是哪一部？',
      board: '观测台 · 望星台', kind: 'reply', min: 4320, read: 3,
      actors: [{ name: '初雪', mag: 1.5, min: 4320 }, { name: 'ねこ', mag: 2.4, min: 4400 }, { name: '睡不着的猫', mag: 3.2, min: 4600 }] },

    { tid: 't11011f12', thread: '自制短篇 gal《回声》第一版 demo',
      board: '创作所 · 自制星体', kind: 'reply', min: 5760, read: 0,
      actors: [{ name: 'anonymous', mag: 4.7, min: 5760 }, { name: '青空', mag: 6.5, min: 5800 }] },

    { tid: 't11010f05', thread: 'Win11 下老 gal 字体乱码怎么解决？',
      board: '观测台 · 求助信号塔', kind: 'reply', min: 10080, read: 1,
      actors: [{ name: '灰鸦', mag: 2.9, min: 10080 }] },

    { tid: 't11014f51', thread: '关于资源区版规修订的公示（10.01 生效）',
      board: '观测台 · 星海议事厅', kind: 'system', min: 20160, read: 0,
      actors: [{ name: '理事会', mag: 0.9, min: 20160 }] },

    { tid: 't11013f22', thread: '《銀の旋律》翻唱企划集合唱',
      board: '创作所 · 声波观测站', kind: 'follow', min: 28800, read: 2,
      actors: [{ name: '铃兰', mag: 1.3, min: 28800 }, { name: '音监', mag: 5.0, min: 29000 }] },
  ];

  /* 补几件事，把时间轴拉长（三个元素都要一段「很久以前」才看得出差别） */
  raw.push(
    { tid: 't11009f18', thread: '聊聊那些「开局即巅峰」的序章设计',
      board: '星图馆 · 星轨研讨室', kind: 'star', min: 57600, read: 2,
      actors: [{ name: '浅葱', mag: 2.9, min: 57600 }, { name: '青空', mag: 6.5, min: 58000 },
               { name: '桐谷', mag: 2.6, min: 59000 }, { name: '星屑', mag: 3.7, min: 60000 }] },
    { tid: 't11008f07', thread: '汉化进度周报 · 第 14 周',
      board: '星图馆 · 译星工房', kind: 'system', min: 86400, read: 1,
      actors: [{ name: '译星组', mag: 1.1, min: 86400 }] },
  );

  const KINDS = {
    reply: { verb: '回复了你', short: '回复' },
    star: { verb: '收藏了你的帖子', short: '收藏' },
    mention: { verb: '在帖子里提到了你', short: '提到' },
    follow: { verb: '关注了你', short: '关注' },
    system: { verb: '发布了站务公告', short: '站务' },
  };

  /* ⚠️ `read` 的分布是**特意**配的，别随手改成全 0 / 全满：
     掩食那一版的全部读法是「读到哪了」，数据里如果每组都只有「全读 / 全未读」两种，
     **偏食一次都不会出现**，那个元素就退化成「一个开关」，跟加个圆点没差别。
     现在食分覆盖 1 / 0.67 / 0.5 / 0 —— 探针有一条断言专门盯着「位移确实在变」。 */
  const groups = raw.map((g) => {
    /* ⚠️ `Math.max(0, …)` 是**必需的**：第一版有一条 `read: 3` 而成员只有 1 个，
        `unread` 算成 -2 ⇒ 食分 -2 ⇒ `translateX` 把盘推到画面外、
       `opacity: min(1, -12)` 又被判为非法值整个丢掉 ⇒ 那一行**静静地没有日食**。
       症状是「看不出错」，只有盯着那一行才发现它和别的不一样。 */
    const unread = Math.max(0, g.actors.length - g.read);
    return Object.assign({}, g, {
      unread: unread,
      total: g.actors.length,
      /* 这一组的「星等」＝成员里最亮的那颗（越小越亮），用来定它在图上的份量 */
      mag: Math.min.apply(null, g.actors.map((a) => a.mag)),
      actors: g.actors.map((a) => Object.assign({}, a, { hue: hueOf(a.name) })),
      /* 已读比例 0–1。三个版本都拿它当「读到哪了」 */
      done: g.read / g.actors.length,
    });
  });

  /* ⚠️ **一条通知一行，不折叠。** 用户 2026-10-15：
     「我不理解你为什么时间下面要接多少多少条，就是说都消息信息了，为什么你还要做折叠呢？」
     分组（「等 N 人」＋右侧「N 条」）是**收件箱**的做法 —— 收件箱要压低体积；
     消息/通知流不压，一条就是一条。上面 `raw` 仍按「thread + actors」写，
     因为同一件事的几个人本来就是一起来的；平铺在这一步做。 */
  const items = [];
  groups.forEach((g) => {
    /* 组内**最旧的 N 条**算读过 —— 收件箱就是这么读的（从旧往新看） */
    const byOld = g.actors.slice().sort((a, b) => b.min - a.min);
    byOld.forEach((a, i) => {
      items.push({
        tid: g.tid, thread: g.thread, board: g.board, kind: g.kind,
        name: a.name, hue: a.hue, min: a.min,
        read: i < g.read,
      });
    });
  });
  items.sort((a, b) => a.min - b.min);          /* 新的在前 */

  const unreadTotal = items.filter((x) => !x.read).length;
  /* 每个分类有几条 / 几条未读（筛选栏上那两个数） */
  const counts = {};
  Object.keys(KINDS).forEach((k) => {
    const its = items.filter((x) => x.kind === k);
    counts[k] = { n: its.length, unread: its.filter((x) => !x.read).length };
  });

  return { me, items, KINDS, counts, unreadTotal, hueOf, weeks: groups.length };
})();
